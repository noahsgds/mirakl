#!/usr/bin/env bash
# Lance le runner en local sur ton Mac (IP maison, pas de blocage Amazon FR).
# Usage : ./start-local.sh
#
# Le scraper tourne headless (invisible) pour économiser le CPU.
# Pour voir Chrome : export SCRAPER_HEADLESS=0 avant de lancer.
# `caffeinate` empêche le Mac de dormir pendant le scrape (veille = jobs coincés).

set -e
cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  echo "→ Création du venv Python…"
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
fi

export SCRAPER_HEADLESS="${SCRAPER_HEADLESS:-1}"
export POLL_SECONDS="${POLL_SECONDS:-15}"

echo "→ Runner local démarré. Ctrl-C pour arrêter."
echo "  Headless=$SCRAPER_HEADLESS  Poll=${POLL_SECONDS}s"
echo "  Mac maintenu éveillé via caffeinate tant que ce process tourne."
echo ""

exec caffeinate -dimsu .venv/bin/python -u runner.py
