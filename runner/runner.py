"""
Runner — écoute la table public.scraping_jobs dans Supabase et lance scraper.py
sur demande. Conçu pour tourner en continu sur Railway.

Flux :
  1. Poll toutes les POLL_SECONDS pour un job status='pending'
  2. Marque le job 'running' + started_at
  3. Exécute scraper.py avec les paramètres du job (count, parallel, dedup)
  4. Compte les nouveaux vendeurs (diff avant/après dans amazon_sellers)
  5. Marque 'success' ou 'error' avec sellers_scraped + finished_at
"""

import os
import subprocess
import sys
import time
from datetime import datetime

import requests

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://ltuarofidogdjhzosboe.supabase.co"
)
SUPABASE_KEY = os.environ.get(
    "SUPABASE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dWFyb2ZpZG9nZGpoem9zYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODUwOTUsImV4cCI6MjA5MjI2MTA5NX0.-b9q5XuR1IgUPcsgGcsXklkU5iPvG65DqRKwd2srhcs",
)
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "15"))
SCRAPER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper.py")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def log(msg: str):
    print(f"[{datetime.utcnow().isoformat(timespec='seconds')}Z] {msg}", flush=True)


def fetch_next_job():
    """Retourne le plus ancien job pending, ou None."""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/scraping_jobs",
        params={
            "status": "eq.pending",
            "order": "created_at.asc",
            "limit": "1",
            "select": "*",
        },
        headers=HEADERS,
        timeout=10,
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]
    return None


def update_job(job_id: str, patch: dict):
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/scraping_jobs",
        params={"id": f"eq.{job_id}"},
        json=patch,
        headers={**HEADERS, "Prefer": "return=minimal"},
        timeout=10,
    )
    if r.status_code not in (200, 204):
        log(f"  ⚠️  update_job({job_id}): {r.status_code} {r.text[:200]}")


def count_sellers() -> int:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/amazon_sellers",
        params={"select": "amazon_seller_id"},
        headers={**HEADERS, "Prefer": "count=exact"},
        timeout=15,
    )
    if r.status_code in (200, 206):
        # Content-Range: "0-999/1234" → total = 1234
        cr = r.headers.get("Content-Range", "")
        if "/" in cr:
            try:
                return int(cr.split("/")[-1])
            except Exception:
                pass
        return len(r.json() or [])
    return 0


def run_scraper(job: dict) -> tuple[int, str]:
    """Lance scraper.py. Retourne (sellers_scraped, error_message)."""
    count = int(job.get("target_count") or 20)
    parallel = int(job.get("parallel") or 1)
    skip_existing = bool(job.get("skip_existing", True))

    cmd = [
        sys.executable, "-u", SCRAPER_PATH,
        "--count", str(count),
        "--parallel", str(parallel),
    ]
    if not skip_existing:
        cmd.append("--no-dedup")

    env = os.environ.copy()
    env["SCRAPER_HEADLESS"] = "1"
    env["PYTHONUNBUFFERED"] = "1"

    log(f"  ▶ Running: {' '.join(cmd)}")
    before = count_sellers()

    proc = subprocess.Popen(
        cmd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    for line in proc.stdout:
        print(line, end="", flush=True)
    rc = proc.wait()
    after = count_sellers()

    delta = max(0, after - before)

    if rc != 0:
        return delta, f"scraper exited with code {rc}"
    return delta, ""


def handle_job(job: dict):
    jid = job["id"]
    log(f"▶ Job {jid} | target={job['target_count']} parallel={job['parallel']}")

    # Lock: passer en running
    update_job(jid, {
        "status": "running",
        "started_at": datetime.utcnow().isoformat() + "Z",
    })

    try:
        scraped, err = run_scraper(job)
    except Exception as e:
        scraped, err = 0, f"runner exception: {e}"

    patch = {
        "finished_at": datetime.utcnow().isoformat() + "Z",
        "sellers_scraped": scraped,
    }
    if err:
        patch["status"] = "error"
        patch["error_message"] = err[:500]
        log(f"  ✗ Job {jid} FAILED: {err}")
    else:
        patch["status"] = "success"
        log(f"  ✓ Job {jid} done — {scraped} new sellers")
    update_job(jid, patch)


def main():
    log(f"Runner starting — polling {SUPABASE_URL}/rest/v1/scraping_jobs every {POLL_SECONDS}s")
    while True:
        try:
            job = fetch_next_job()
            if job:
                handle_job(job)
            else:
                time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            log("Stopped by user")
            return
        except Exception as e:
            log(f"⚠️  Main loop error: {e}")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
