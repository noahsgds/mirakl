"""
Enrichissement ciblé — Infos légales Amazon FR
Lit les sellers existants en Supabase et patch :
  - scraped_email / email_source / email_confidence
  - scraped_phone / phone_source / phone_confidence
  - business_name (Nom commercial)
  - criteres_detail (business_type, vat_number, trade_register_number, business_address)

Usage:
  python enrich_business_details.py               # tous les sellers sans email
  python enrich_business_details.py --all         # force re-enrichissement de tous
  python enrich_business_details.py --limit 50    # limiter à N sellers
"""

import argparse
import json
import random
import re
import time
from datetime import datetime

import requests as http_requests
import undetected_chromedriver as uc
from bs4 import BeautifulSoup
from selenium.common.exceptions import NoSuchWindowException, WebDriverException

SUPABASE_URL = "https://ltuarofidogdjhzosboe.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dWFyb2ZpZG9nZGpoem9zYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODUwOTUsImV4cCI6MjA5MjI2MTA5NX0.-b9q5XuR1IgUPcsgGcsXklkU5iPvG65DqRKwd2srhcs"
HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
}


# ─────────────────────────────────────────────────────────────────────────────
# Extraction helpers (same logic as scraper_phase1.py)
# ─────────────────────────────────────────────────────────────────────────────

def extract_between(text: str, label: str, maxlen: int = 120) -> str:
    idx = text.find(label)
    if idx < 0:
        return ""
    raw = text[idx + len(label): idx + len(label) + maxlen]
    return raw.strip().split("\n")[0].strip()


ADDR_STOP = ["Ce vendeur", "This seller", "Membre depuis", "Member since",
             "Nom commercial", "Type d'activité", "Numéro", "Avis "]


def parse_sp_page(html: str) -> dict:
    """Extrait toutes les infos légales depuis la page /sp?seller=ID."""
    soup = BeautifulSoup(html, "lxml")
    lines = [l.strip() for l in soup.get_text(separator="\n").split("\n") if l.strip()]
    page_text = "\n".join(lines)

    result = {
        "business_name":          "",
        "business_type":          "",
        "trade_register_number":  "",
        "vat_number":             "",
        "scraped_phone":          "",
        "phone_source":           "",
        "phone_confidence":       "",
        "scraped_email":          "",
        "email_source":           "",
        "email_confidence":       "",
        "business_address":       "",
    }

    # ── Nom commercial ────────────────────────────────────────────────────────
    for label in ["Nom commercial :", "Nom commercial:", "Trade name :", "Trade name:"]:
        val = extract_between(page_text, label, 120)
        if val:
            result["business_name"] = val
            break

    # ── Type d'activité ───────────────────────────────────────────────────────
    for label in ["Type d'activité :", "Type d'activité:", "Business type :", "Business type:"]:
        val = extract_between(page_text, label, 80)
        if val:
            result["business_type"] = val
            break

    # ── Numéro de registre de commerce ────────────────────────────────────────
    for label in ["Numéro de registre de commerce :", "Numéro de registre de commerce:",
                  "Company register number :", "Company register number:"]:
        val = extract_between(page_text, label, 60)
        if val:
            result["trade_register_number"] = val
            break
    if not result["trade_register_number"]:
        m = re.search(r"(?:registre|register)[^\n]{0,50}:\s*([A-Z0-9]{6,30})", page_text, re.I)
        if m:
            result["trade_register_number"] = m.group(1).strip()

    # ── Numéro TVA ────────────────────────────────────────────────────────────
    for label in ["Numéro TVA :", "Numéro TVA:", "VAT number :", "VAT number:", "TVA :"]:
        val = extract_between(page_text, label, 30)
        if val:
            result["vat_number"] = val
            break
    if not result["vat_number"]:
        m = re.search(r"\b(FR\d{11}|DE\d{9}|GB\d{9}|IT\d{11}|ES[A-Z0-9]{9})\b", page_text)
        if m:
            result["vat_number"] = m.group(1)

    # ── Téléphone ─────────────────────────────────────────────────────────────
    for label in ["Numéro de téléphone :", "Numéro de téléphone:", "Phone number :", "Phone number:"]:
        val = extract_between(page_text, label, 30)
        if val:
            result["scraped_phone"]    = val
            result["phone_source"]     = "amazon_sp_page"
            result["phone_confidence"] = "high"
            break
    if not result["scraped_phone"]:
        m = re.search(r"(\+\d[\d\s\-]{7,20})", page_text)
        if m:
            result["scraped_phone"]    = m.group(1).strip()
            result["phone_source"]     = "regex"
            result["phone_confidence"] = "medium"

    # ── E-mail ────────────────────────────────────────────────────────────────
    for label in ["E-mail :", "E-mail:", "Email :", "Email:"]:
        val = extract_between(page_text, label, 100)
        if val:
            email = val.split()[0]
            if "@" in email:
                result["scraped_email"]    = email
                result["email_source"]     = "amazon_sp_page"
                result["email_confidence"] = "high"
                break
    if not result["scraped_email"]:
        m = re.search(r"\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b", page_text)
        if m and "amazon" not in m.group(1).lower():
            result["scraped_email"]    = m.group(1)
            result["email_source"]     = "regex"
            result["email_confidence"] = "medium"

    # ── Adresse commerciale (multi-ligne) ─────────────────────────────────────
    addr_idx = -1
    for label in ["Adresse commerciale :", "Adresse commerciale:", "Business address :", "Business address:"]:
        idx = page_text.find(label)
        if idx >= 0:
            addr_idx = idx + len(label)
            break
    if addr_idx >= 0:
        addr_block = page_text[addr_idx: addr_idx + 400]
        addr_lines = [l.strip() for l in addr_block.split("\n") if l.strip()]
        collected = []
        for line in addr_lines:
            if any(line.startswith(stop) for stop in ADDR_STOP):
                break
            collected.append(line)
            if len(collected) >= 8:
                break
        result["business_address"] = ", ".join(collected)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Browser
# ─────────────────────────────────────────────────────────────────────────────

def make_driver():
    import tempfile
    opts = uc.ChromeOptions()
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,900")
    opts.add_argument(f"--user-data-dir={tempfile.mkdtemp(prefix='uc_enrich_')}")
    d = uc.Chrome(options=opts, headless=False)
    d.set_page_load_timeout(30)
    return d


def safe_get(driver, url: str, wait: float = 5) -> str:
    try:
        driver.get(url)
        time.sleep(random.uniform(wait, wait + 2))
        return driver.page_source
    except (NoSuchWindowException, WebDriverException):
        raise
    except Exception as e:
        print(f"  ✗ {e.__class__.__name__}: {e}")
        return ""


def restart_driver(driver):
    try:
        driver.quit()
    except Exception:
        pass
    d = make_driver()
    try:
        d.get("https://www.amazon.fr")
        time.sleep(random.uniform(4, 7))
        print("  ✓ Driver redémarré")
    except Exception:
        pass
    return d


# ─────────────────────────────────────────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────────────────────────────────────────

def fetch_sellers(enrich_all: bool, limit: int) -> list[dict]:
    """Récupère les sellers à enrichir depuis Supabase."""
    cols = "seller_id,amazon_seller_id,seller_name,seller_url,criteres_detail,business_name"
    if enrich_all:
        url = f"{SUPABASE_URL}/rest/v1/amazon_sellers?select={cols}&limit={limit}"
    else:
        # Seulement ceux sans email scrapé
        url = (f"{SUPABASE_URL}/rest/v1/amazon_sellers"
               f"?select={cols}&scraped_email=is.null"
               f"&amazon_seller_id=not.is.null&limit={limit}")
    r = http_requests.get(url, headers=HEADERS, timeout=20)
    if r.status_code != 200:
        print(f"❌ Fetch sellers failed: {r.status_code} {r.text[:200]}")
        return []
    return r.json()


def patch_seller(seller_id: str, data: dict) -> bool:
    """PATCH un seller avec les nouvelles infos légales."""
    url = f"{SUPABASE_URL}/rest/v1/amazon_sellers?seller_id=eq.{seller_id}"
    patch_headers = {**HEADERS, "Prefer": "return=minimal"}
    r = http_requests.patch(url, json={**data, "updated_at": datetime.now().isoformat()},
                            headers=patch_headers, timeout=15)
    return r.status_code in (200, 204)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def run(enrich_all: bool = False, limit: int = 200):
    print(f"\n{'='*60}")
    print(f"Business Details Enricher")
    print(f"Mode: {'tous' if enrich_all else 'sans email seulement'} | limit={limit}")
    print(f"{'='*60}\n")

    print("Fetching sellers from Supabase…")
    sellers = fetch_sellers(enrich_all, limit)
    print(f"  → {len(sellers)} sellers à enrichir\n")

    if not sellers:
        print("Rien à faire.")
        return

    driver = make_driver()
    try:
        print("Warmup Amazon FR…")
        driver.get("https://www.amazon.fr")
        time.sleep(random.uniform(4, 7))
        print("  ✓ OK\n")

        ok = 0
        skip = 0
        for i, seller in enumerate(sellers, 1):
            sid = seller.get("amazon_seller_id") or seller.get("seller_id")
            name = seller.get("seller_name", sid)
            seller_db_id = seller.get("seller_id")

            if not sid:
                skip += 1
                continue

            sp_url = f"https://www.amazon.fr/sp?seller={sid}"
            print(f"[{i}/{len(sellers)}] {name[:45]} — {sid}")

            try:
                html = safe_get(driver, sp_url, wait=5)
            except (NoSuchWindowException, WebDriverException):
                driver = restart_driver(driver)
                try:
                    html = safe_get(driver, sp_url, wait=5)
                except Exception:
                    skip += 1
                    continue

            if not html or len(html) < 5000:
                print(f"  ⚠️  Page vide ou trop courte")
                skip += 1
                continue

            info = parse_sp_page(html)

            # Merge criteres_detail existant avec les nouvelles infos légales
            existing_cd = seller.get("criteres_detail") or {}
            if isinstance(existing_cd, str):
                try:
                    existing_cd = json.loads(existing_cd)
                except Exception:
                    existing_cd = {}
            new_cd = {
                **existing_cd,
                "business_type":         info["business_type"],
                "trade_register_number": info["trade_register_number"],
                "vat_number":            info["vat_number"],
                "business_address":      info["business_address"],
                "enriched_at":           datetime.now().strftime("%Y-%m-%d"),
            }

            patch_data = {
                "criteres_detail":  new_cd,
                "scraped_email":    info["scraped_email"]    or None,
                "email_source":     info["email_source"]     or None,
                "email_confidence": info["email_confidence"] or None,
                "scraped_phone":    info["scraped_phone"]    or None,
                "phone_source":     info["phone_source"]     or None,
                "phone_confidence": info["phone_confidence"] or None,
            }
            if info["business_name"] and not seller.get("business_name"):
                patch_data["business_name"] = info["business_name"]

            success = patch_seller(seller_db_id, patch_data)

            flags = []
            if info["scraped_email"]:    flags.append(f"📧 {info['scraped_email']} ({info['email_confidence']})")
            if info["scraped_phone"]:    flags.append(f"📞 {info['scraped_phone']}")
            if info["business_name"]:    flags.append(f"🏢 {info['business_name'][:40]}")
            if info["vat_number"]:       flags.append(f"TVA {info['vat_number']}")
            if info["business_address"]: flags.append(f"📍 {info['business_address'][:50]}")

            status = "✅" if success else "⚠️ patch failed"
            print(f"  {status} {' | '.join(flags) if flags else 'aucune info légale trouvée'}")

            if success:
                ok += 1

            time.sleep(random.uniform(2, 4))

    finally:
        try:
            driver.quit()
        except Exception:
            pass

    print(f"\n{'='*60}")
    print(f"✅ {ok}/{len(sellers)} sellers enrichis")
    print(f"⏭  {skip} ignorés (pas d'ID ou page vide)")
    print('='*60)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--all",   action="store_true", help="Ré-enrichir tous les sellers (pas seulement ceux sans email)")
    p.add_argument("--limit", type=int, default=200, help="Nombre max de sellers à traiter (défaut: 200)")
    args = p.parse_args()
    run(enrich_all=args.all, limit=args.limit)
