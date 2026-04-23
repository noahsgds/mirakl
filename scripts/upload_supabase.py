"""
Upload sellers CSV → Supabase table `amazon_sellers`

Usage:
  python upload_supabase.py --csv output/sellers_mock.csv

Requires env vars (or .env file):
  SUPABASE_URL=https://epijdnvdrxvculgxljif.supabase.co
  SUPABASE_KEY=your-anon-or-service-key
"""

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://epijdnvdrxvculgxljif.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
TABLE = "amazon_sellers"


def upload(csv_path: str):
    if not SUPABASE_KEY:
        print("❌ SUPABASE_KEY manquant dans .env")
        sys.exit(1)

    df = pd.read_csv(csv_path)
    # Clean NaN
    df = df.where(pd.notnull(df), None)
    records = df.to_dict("records")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",  # upsert on seller_id
    }

    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"

    # Batch insert (Supabase handles bulk inserts natively)
    resp = requests.post(url, json=records, headers=headers)

    if resp.status_code in (200, 201):
        print(f"✅ {len(records)} vendeurs insérés dans Supabase ({TABLE})")
    else:
        print(f"❌ Erreur {resp.status_code}: {resp.text[:300]}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default="output/sellers_mock.csv")
    args = parser.parse_args()

    path = Path(args.csv)
    if not path.is_absolute():
        path = Path(__file__).parent / path

    print(f"📄 Uploading {path} → {SUPABASE_URL}/{TABLE}")
    upload(str(path))
