"""
Phase 1 — Amazon FR Real Seller Scraper v4
Mirakl Connect Hackathon — UC2 Amazon FR → Zalando

Strategy:
  A. Collect ASINs from Amazon FR fashion search pages
  B. Extract 3P seller IDs from offer-listing pages (guaranteed non-Amazon)
  C. Enrich each seller via /sp?seller=ID (name, rating, reviews, country,
     feedback %, years on Amazon, response time) + catalog page (products,
     avg price, categories, estimated monthly sales)
  D. Zalando presence check (HTTP direct, no browser)
  E. Push to Supabase, save CSV
"""

import random
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests as http_requests
import undetected_chromedriver as uc
from bs4 import BeautifulSoup
from selenium.common.exceptions import NoSuchWindowException, WebDriverException

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

SUPABASE_URL = "https://ltuarofidogdjhzosboe.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dWFyb2ZpZG9nZGpoem9zYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODUwOTUsImV4cCI6MjA5MjI2MTA5NX0.-b9q5XuR1IgUPcsgGcsXklkU5iPvG65DqRKwd2srhcs"

AMAZON_IDS = {"A13V1IB3VIYZZH", "ATVPDKIKX0DER", "A2NODRKZP88ZB9", "A2W68NJA5YNXUP"}

SEARCH_QUERIES = [
    # Femme — vêtements
    "robe femme", "robe soirée femme", "robe été femme", "robe pull femme",
    "jean femme", "jean femme slim", "jean femme taille haute",
    "veste femme", "veste cuir femme", "blazer femme", "manteau femme",
    "pull femme", "pull col roulé femme", "gilet femme", "cardigan femme",
    "t-shirt femme", "chemisier femme", "top femme",
    "short femme été", "jupe femme", "jupe midi femme", "combinaison femme",
    "lingerie femme", "pyjama femme",
    # Femme — accessoires
    "chaussures femme", "bottines femme", "baskets femme", "escarpins femme",
    "sac à main femme", "sac bandoulière femme", "sac cabas femme",
    "bijoux fantaisie femme", "collier femme", "boucles oreilles femme",
    "montre femme", "ceinture femme", "écharpe femme", "lunettes soleil femme",
    # Homme — vêtements
    "jean homme", "jean homme slim", "pantalon homme", "chino homme",
    "veste homme", "blouson homme", "manteau homme", "parka homme",
    "chemise homme", "polo homme", "t-shirt homme", "pull homme",
    "sweat homme", "hoodie homme", "short homme",
    # Homme — accessoires
    "chaussures homme", "sneakers homme", "baskets homme", "bottines homme",
    "montre homme", "ceinture homme", "portefeuille homme", "lunettes soleil homme",
    # Sport / outdoor
    "running homme", "running femme", "tennis homme", "fitness femme",
    "legging sport femme", "maillot bain femme", "maillot bain homme",
    # Luxe / lifestyle
    "montre luxe", "sac cuir femme", "foulard soie", "parfum femme", "parfum homme",
]

FILTER_MIN_RATING  = 4.0   # ignorer si note connue < 4.0
FILTER_MIN_PRODUCTS = 10   # ignorer si catalogue < 10 produits


# ─────────────────────────────────────────────────────────────────────────────
# Dataclass
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Seller:
    amazon_seller_id:    str   = ""
    seller_name:         str   = ""
    seller_url:          str   = ""
    categories:          str   = ""
    nb_products:         int   = 0
    rating:              float = 0.0
    nb_reviews:          int   = 0          # total lifetime ratings
    positive_feedback_pct: float = 0.0     # % positif sur 12 mois
    avg_price:           float = 0.0
    nb_sales_30d:        int   = 0
    country:             str   = ""
    business_name:       str   = ""
    business_type:       str   = ""        # Type d'activité (ex: Entreprise privée)
    trade_register_number: str = ""        # Numéro de registre de commerce
    vat_number:          str   = ""        # Numéro TVA
    phone:               str   = ""        # Numéro de téléphone
    email:               str   = ""        # E-mail vendeur
    business_address:    str   = ""        # Adresse commerciale complète
    seller_language:     str   = "en"
    years_on_amazon:     int   = 0
    member_since:        str   = ""
    response_time:       str   = ""
    on_zalando:          bool  = False
    zalando_url:         str   = ""
    min_price:           float = 0.0
    max_price:           float = 0.0
    top_brands:          str   = ""       # marques vendues (top 5)
    is_fba:              bool  = False    # Expédié par Amazon
    has_own_website:     bool  = False

    def to_row(self) -> dict:
        return {
            # ── Identité ──────────────────────────────────────────
            "amazon_seller_id":       self.amazon_seller_id,
            "seller_name":            self.seller_name,
            "seller_url":             self.seller_url,
            "categories":             self.categories,
            "country":                self.country or None,
            "seller_language":        self.seller_language,
            "business_name":          self.business_name or None,
            # ── Infos légales vendeur ─────────────────────────────
            "business_type":          self.business_type or None,
            "trade_register_number":  self.trade_register_number or None,
            "vat_number":             self.vat_number or None,
            "phone":                  self.phone or None,
            "email":                  self.email or None,
            "business_address":       self.business_address or None,
            # ── Métriques Amazon ──────────────────────────────────
            "nb_products":            self.nb_products or None,
            "rating":                 self.rating or None,
            "nb_reviews":             self.nb_reviews or None,
            "positive_feedback_pct":  self.positive_feedback_pct or None,
            "avg_price":              self.avg_price or None,
            "nb_sales_30d":           self.nb_sales_30d or None,
            "years_on_amazon":        self.years_on_amazon or None,
            "member_since":           self.member_since or None,
            "response_time":          self.response_time or None,
            # ── Présence Zalando ──────────────────────────────────
            "on_zalando":             self.on_zalando,
            "zalando_url":            self.zalando_url or None,
            "company_website":        self.zalando_url if self.on_zalando else None,
            "min_price":              self.min_price or None,
            "max_price":              self.max_price or None,
            "top_brands":             self.top_brands or None,
            "is_fba":                 self.is_fba,
            "has_own_website":        self.has_own_website,
            # ── Pipeline ─────────────────────────────────────────
            "source":    "amazon_scraper",
            "statut":    "to_enrich",
            "enriched":  False,
            # ── Détails bruts (pour Dust/N8N) ─────────────────────
            "criteres_detail": {
                "amazon_seller_id":      self.amazon_seller_id,
                "business_name":         self.business_name,
                "business_type":         self.business_type,
                "trade_register_number": self.trade_register_number,
                "vat_number":            self.vat_number,
                "phone":                 self.phone,
                "email":                 self.email,
                "business_address":      self.business_address,
                "on_zalando":            self.on_zalando,
                "scrape_date":           datetime.now().strftime("%Y-%m-%d"),
            },
        }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def pf(text) -> float:
    m = re.search(r"(\d+[\.,]\d+)", str(text).replace("\xa0", ""))
    return float(m.group(1).replace(",", ".")) if m else 0.0


def pi(text) -> int:
    t = str(text).replace("\xa0", "").replace(" ", "").replace(".", "").replace(",", "")
    m = re.search(r"(\d+)", t)
    return int(m.group(1)) if m else 0


def extract_between(text: str, label: str, maxlen: int = 60) -> str:
    idx = text.find(label)
    if idx < 0:
        return ""
    raw = text[idx + len(label): idx + len(label) + maxlen]
    return raw.strip().split("\n")[0].strip()


def detect_language(country: str, business_name: str, seller_name: str) -> str:
    country_map = {
        "france": "fr", "fr ": "fr",
        "germany": "de", "deutschland": "de", "allemagne": "de",
        "united kingdom": "en", "uk": "en", "great britain": "en",
        "united states": "en", "usa": "en",
        "italy": "it", "italie": "it", "italia": "it",
        "spain": "es", "espagne": "es", "españa": "es",
        "china": "zh", "chine": "zh",
        "netherlands": "nl", "pays-bas": "nl",
        "belgium": "fr", "belgique": "fr",
        "switzerland": "fr", "suisse": "fr",
    }
    c = (country or "").lower()
    for key, lang in country_map.items():
        if key in c:
            return lang
    text = f"{business_name} {seller_name}".lower()
    if any(w in text for w in ["gmbh", " ag ", " kg ", " ug "]):    return "de"
    if any(w in text for w in ["ltd", "limited", "llc", "inc "]):   return "en"
    if any(w in text for w in ["sarl", " sas ", "eurl", " snc "]):  return "fr"
    if any(w in text for w in [" srl", " spa ", "srls"]):           return "it"
    if any(w in text for w in [" sl ", "s.l."]):                    return "es"
    return "en"


def check_zalando(seller_name: str) -> tuple[bool, str]:
    """HTTP direct — pas de browser. Retourne (on_zalando, url)."""
    if not seller_name or len(seller_name) < 3:
        return False, ""
    # Ignore les noms qui sont juste des IDs Amazon
    if re.fullmatch(r'[A-Z0-9]{10,20}', seller_name):
        return False, ""
    try:
        url = f"https://www.zalando.fr/recherche/?q={seller_name.replace(' ', '+')}&cat=women-clothing"
        r = http_requests.get(url, timeout=8, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        if r.status_code == 200:
            clean = re.sub(r'[^a-z0-9]', '', seller_name.lower())
            if clean and clean in re.sub(r'[^a-z0-9]', '', r.text.lower()):
                return True, url
    except Exception:
        pass
    return False, ""


# ─────────────────────────────────────────────────────────────────────────────
# Driver
# ─────────────────────────────────────────────────────────────────────────────

def make_driver():
    import tempfile
    opts = uc.ChromeOptions()
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,900")
    opts.add_argument(f"--user-data-dir={tempfile.mkdtemp(prefix='uc_')}")
    d = uc.Chrome(options=opts, headless=False)
    d.set_page_load_timeout(30)
    return d


def safe_get(driver, url: str, wait: float = 4) -> str:
    try:
        driver.get(url)
        time.sleep(random.uniform(wait, wait + 2))
        return driver.page_source
    except (NoSuchWindowException, WebDriverException):
        raise
    except Exception as e:
        print(f"  ✗ {e.__class__.__name__}")
        return ""


def restart_driver(driver):
    try:
        driver.quit()
    except Exception:
        pass
    d = make_driver()
    try:
        d.get("https://www.amazon.fr")
        time.sleep(random.uniform(5, 8))
        print("  ✓ Driver redémarré")
    except Exception:
        pass
    return d


# ─────────────────────────────────────────────────────────────────────────────
# Phase A — Collecte ASINs
# ─────────────────────────────────────────────────────────────────────────────

def get_asins(driver, query: str, pages: int = 1) -> list[str]:
    out: list[str] = []
    q = query.replace(' ', '+')
    for page in range(1, pages + 1):
        url = f"https://www.amazon.fr/s?k={q}&page={page}"
        try:
            html = safe_get(driver, url, wait=3)
        except (NoSuchWindowException, WebDriverException):
            raise
        if not html or len(html) < 50000:
            break
        found = re.findall(r'data-asin="([A-Z0-9]{10})"', html)
        new = [a for a in found if a not in ("", "0000000000") and a not in out]
        out.extend(new)
        if not new:
            break
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Phase B — Extraction sellers depuis les pages "toutes les offres"
# ─────────────────────────────────────────────────────────────────────────────

def get_sellers_from_offers(driver, asin: str) -> list[tuple[str, str]]:
    """
    Page offer-listing = liste UNIQUEMENT les vendeurs tiers.
    Retourne [(seller_id, seller_name), ...]
    """
    url = f"https://www.amazon.fr/gp/offer-listing/{asin}?condition=new"
    try:
        html = safe_get(driver, url, wait=3)
    except (NoSuchWindowException, WebDriverException):
        raise
    if not html or len(html) < 5000:
        return []

    soup = BeautifulSoup(html, "lxml")
    seen: dict[str, str] = {}
    skip = {"Détails", "Details", "Voir les détails", "See details", ""}

    for a in soup.select("a[href*='seller=']"):
        href = a.get("href", "")
        m = re.search(r"seller=([A-Z0-9]{10,20})", href)
        if not m:
            continue
        sid = m.group(1)
        if sid in AMAZON_IDS or sid in seen:
            continue
        name = a.get_text(strip=True)
        if name in skip or len(name) < 2:
            name = sid  # sera résolu à l'enrichissement
        seen[sid] = name

    return list(seen.items())


# ─────────────────────────────────────────────────────────────────────────────
# Phase C — Enrichissement via /sp?seller=ID
# ─────────────────────────────────────────────────────────────────────────────

def enrich(driver, seller_id: str, raw_name: str) -> "Seller":
    s = Seller(
        amazon_seller_id=seller_id,
        seller_name=raw_name,
        seller_url=f"https://www.amazon.fr/sp?seller={seller_id}",
    )

    # ── Page profil vendeur (/sp?seller=ID) ──────────────────────────────────
    try:
        html = safe_get(driver, s.seller_url, wait=5)  # 5s pour laisser le JS charger les stats
    except (NoSuchWindowException, WebDriverException):
        raise
    if html:
        soup = BeautifulSoup(html, "lxml")
        # Lignes propres sans lignes vides
        lines = [l.strip() for l in soup.get_text(separator="\n").split("\n") if l.strip()]
        page_text = "\n".join(lines)

        # ── Nom réel depuis le titre ────────────────────────────────────────
        is_id_name = bool(re.fullmatch(r'[A-Z0-9]{10,20}', raw_name)) or raw_name in ("Détails", "Details")
        if is_id_name:
            title_el = soup.select_one("title")
            if title_el:
                title = title_el.get_text()
                m = re.search(r"Avis sur (.+?)[\s:]* :?\s*Amazon", title)
                if not m:
                    m = re.search(r"^(.+?)\s*:\s*Amazon", title)
                if m:
                    s.seller_name = m.group(1).strip()
            if s.seller_name == raw_name:
                h1 = soup.select_one("h1")
                if h1:
                    s.seller_name = h1.get_text(strip=True)

        # ── Note (étoiles) ──────────────────────────────────────────────────
        # Page affiche ex: "4.5 sur 5 étoiles"
        m = re.search(r"([\d,.]+)\s+sur\s+5\s+[ée]toiles?", page_text, re.I)
        if m:
            s.rating = pf(m.group(1))

        # ── % feedback positif ──────────────────────────────────────────────
        # Page affiche ex: "94% positive" sur une ligne séparée
        m = re.search(r"(\d+)\s*%\s*positive", page_text, re.I)
        if not m:
            m = re.search(r"(\d+)\s*%\s*d[''']évaluations?\s*positives?", page_text, re.I)
        if m:
            s.positive_feedback_pct = float(m.group(1))

        # ── Nombre d'évaluations sur 12 mois ───────────────────────────────
        # Page affiche ex: "ces 12 derniers mois (35 évaluations)"
        m = re.search(r"(?:12\s+derniers?\s+mois|last\s+12\s+months)[^\d]*\(?(\d[\d\s]*)\s*évaluation", page_text, re.I)
        if m:
            s.nb_reviews = pi(m.group(1))
        else:
            # Fallback: "X évaluations au total"
            m = re.search(r"(\d[\d\s\xa0]*)\s*évaluations?\s+au\s+total", page_text, re.I)
            if m:
                s.nb_reviews = pi(m.group(1))

        # ── Pays ────────────────────────────────────────────────────────────
        for label in ["Pays :", "Country :", "Pays:", "Country:"]:
            val = extract_between(page_text, label, 40)
            if val and len(val) > 1:
                s.country = val
                break

        # ── Raison sociale ──────────────────────────────────────────────────
        for label in ["Raison sociale :", "Nom de l'entreprise :", "Business Name :", "Business Name:"]:
            val = extract_between(page_text, label, 80)
            if val:
                s.business_name = val
                break

        # ── Membre depuis / ancienneté ──────────────────────────────────────
        for label in ["Membre depuis :", "Member since :", "Membre depuis:", "Member since:"]:
            val = extract_between(page_text, label, 30)
            if val:
                s.member_since = val
                m2 = re.search(r"\d{4}", val)
                if m2:
                    s.years_on_amazon = datetime.now().year - int(m2.group())
                break

        # ── Délai de réponse ────────────────────────────────────────────────
        for label in ["Délai de réponse :", "Response time :", "Délai de réponse:", "Response time:"]:
            val = extract_between(page_text, label, 40)
            if val:
                s.response_time = val
                break

        # ── Informations légales (section "Informations vendeur détaillées") ──
        # Nom commercial
        for label in ["Nom commercial :", "Nom commercial:", "Trade name :", "Trade name:"]:
            val = extract_between(page_text, label, 120)
            if val:
                s.business_name = val  # overrides "Raison sociale" if present
                break

        # Type d'activité
        for label in ["Type d'activité :", "Type d'activité:", "Business type :", "Business type:"]:
            val = extract_between(page_text, label, 80)
            if val:
                s.business_type = val
                break

        # Numéro de registre de commerce
        for label in ["Numéro de registre de commerce :", "Numéro de registre de commerce:",
                      "Company register number :", "Company register number:"]:
            val = extract_between(page_text, label, 60)
            if val:
                s.trade_register_number = val
                break
        if not s.trade_register_number:
            # fallback: ligne qui suit un numéro d'enregistrement connu
            m = re.search(r"(?:registre|register)[^\n]{0,50}:\s*([A-Z0-9]{6,30})", page_text, re.I)
            if m:
                s.trade_register_number = m.group(1).strip()

        # Numéro TVA
        for label in ["Numéro TVA :", "Numéro TVA:", "VAT number :", "VAT number:", "TVA :"]:
            val = extract_between(page_text, label, 30)
            if val:
                s.vat_number = val
                break
        if not s.vat_number:
            m = re.search(r"\b(FR\d{11}|DE\d{9}|GB\d{9}|IT\d{11}|ES[A-Z0-9]{9})\b", page_text)
            if m:
                s.vat_number = m.group(1)

        # Numéro de téléphone
        for label in ["Numéro de téléphone :", "Numéro de téléphone:", "Phone number :", "Phone number:"]:
            val = extract_between(page_text, label, 30)
            if val:
                s.phone = val
                break
        if not s.phone:
            m = re.search(r"(\+\d[\d\s\-]{7,20})", page_text)
            if m:
                s.phone = m.group(1).strip()

        # E-mail
        for label in ["E-mail :", "E-mail:", "Email :", "Email:"]:
            val = extract_between(page_text, label, 80)
            if val:
                s.email = val.split()[0]  # pas d'espace dans un email
                break
        if not s.email:
            m = re.search(r"\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b", page_text)
            if m:
                s.email = m.group(1)

        # Adresse commerciale (multi-ligne)
        ADDR_STOP = ["Ce vendeur", "This seller", "Membre depuis", "Member since",
                     "Nom commercial", "Type d'activité", "Numéro", "Avis "]
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
            s.business_address = ", ".join(collected)

    # ── Page catalogue du vendeur (/s?me=ID) ─────────────────────────────────
    try:
        html2 = safe_get(driver, f"https://www.amazon.fr/s?me={seller_id}&marketplaceID=A13V1IB3VIYZZH", wait=3)
    except (NoSuchWindowException, WebDriverException):
        raise
    if html2:
        soup2 = BeautifulSoup(html2, "lxml")
        text2 = soup2.get_text()

        # Nombre de produits
        m = re.search(r"sur\s+([\d\s\xa0]+)\s+r[ée]sultat", text2)
        if m:
            s.nb_products = pi(m.group(1))

        # Prix moyen
        prices = [pf(el.get_text()) for el in soup2.select(".a-price .a-offscreen") if pf(el.get_text()) > 0]
        if prices:
            s.avg_price = round(sum(prices) / len(prices), 2)
            if s.nb_products == 0:
                s.nb_products = len(prices)

        # Catégories
        cats = set()
        for el in soup2.select("h2, .a-size-base-plus, .a-size-medium"):
            t = el.get_text(strip=True).lower()
            for kw in ["mode", "vêtements", "sport", "chaussures", "accessoires",
                       "bijoux", "maroquinerie", "lifestyle", "running", "outdoor",
                       "lingerie", "montres", "sac", "robe", "jean"]:
                if kw in t:
                    cats.add(kw)
        s.categories = ", ".join(sorted(cats)) if cats else "mode"

        # Prix min/max
        if prices:
            s.min_price = round(min(prices), 2)
            s.max_price = round(max(prices), 2)

        # Top marques vendues
        brands = []
        for el in soup2.select(".a-size-base-plus, [data-cy='title-recipe'] span"):
            t = el.get_text(strip=True)
            if t and len(t) > 2 and len(t) < 40 and not any(c.isdigit() for c in t[:3]):
                brands.append(t)
        if brands:
            # Prend les 5 plus fréquents
            from collections import Counter
            top = [b for b, _ in Counter(brands).most_common(5)]
            s.top_brands = ", ".join(top)

        # Estimation ventes 30j — badges "X+ achats ce mois"
        sales_badges = re.findall(r"(\d[\d\s]*\+?)\s+achats? (?:au cours du|ce) (?:dernier )?mois", text2, re.I)
        if sales_badges:
            s.nb_sales_30d = sum(pi(b) for b in sales_badges)

        # FBA : "Expédié par Amazon" dans les résultats
        if "expédié par amazon" in text2.lower() or "fulfilled by amazon" in text2.lower():
            s.is_fba = True

    # ── Langue & Zalando (HTTP direct) ───────────────────────────────────────
    s.seller_language = detect_language(s.country, s.business_name, s.seller_name)
    s.on_zalando, s.zalando_url = check_zalando(s.seller_name)

    return s


# ─────────────────────────────────────────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────────────────────────────────────────

def push_to_supabase(sellers: list):
    if not sellers:
        return
    records = [s.to_row() for s in sellers]
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates",
    }
    try:
        resp = http_requests.post(
            f"{SUPABASE_URL}/rest/v1/amazon_sellers?on_conflict=seller_url",
            json=records, headers=headers, timeout=15,
        )
        if resp.status_code in (200, 201):
            print(f"  📤 Supabase: {len(records)} vendeurs uploadés")
        else:
            print(f"  ⚠️  Supabase {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"  ⚠️  Supabase: {e}")


def save(sellers: list, intermediate=False):
    if not sellers:
        return None
    suffix = "_wip" if intermediate else ""
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    path = OUTPUT_DIR / f"amazon_sellers_{ts}{suffix}.csv"
    df = pd.DataFrame([s.to_row() for s in sellers])
    df.to_csv(path, index=False, encoding="utf-8-sig")

    if not intermediate:
        df.to_csv(OUTPUT_DIR / "latest.csv", index=False, encoding="utf-8-sig")
        # CSV propre pour présentation (colonnes FR, sans JSON)
        clean = pd.DataFrame([{
            "Nom_Vendeur":              s.seller_name,
            "ID_Amazon":                s.amazon_seller_id,
            "URL_Profil":               s.seller_url,
            "Nom_Commercial":           s.business_name or "N/A",
            "Type_Activité":            s.business_type or "N/A",
            "Num_Registre_Commerce":    s.trade_register_number or "N/A",
            "Num_TVA":                  s.vat_number or "N/A",
            "Téléphone":                s.phone or "N/A",
            "Email":                    s.email or "N/A",
            "Adresse_Commerciale":      s.business_address or "N/A",
            "Pays":                     s.country or "N/A",
            "Langue":                   s.seller_language,
            "Membre_depuis":            s.member_since or "N/A",
            "Ancienneté_ans":           s.years_on_amazon or "N/A",
            "Délai_réponse":            s.response_time or "N/A",
            "Categories":               s.categories,
            "Top_Marques":              s.top_brands or "N/A",
            "Nb_Produits":              s.nb_products or "N/A",
            "Note":                     f"{s.rating:.1f}" if s.rating else "N/A",
            "Feedback_Positif_%":       f"{s.positive_feedback_pct:.0f}%" if s.positive_feedback_pct else "N/A",
            "Nb_Avis_12mois":           s.nb_reviews or "N/A",
            "Ventes_30j_estimées":      s.nb_sales_30d or "N/A",
            "Prix_Min_EUR":             f"{s.min_price:.2f} €" if s.min_price else "N/A",
            "Prix_Moyen_EUR":           f"{s.avg_price:.2f} €" if s.avg_price else "N/A",
            "Prix_Max_EUR":             f"{s.max_price:.2f} €" if s.max_price else "N/A",
            "FBA":                      "Oui" if s.is_fba else "Non",
            "Sur_Zalando":              "Oui" if s.on_zalando else "Non",
            "URL_Zalando":              s.zalando_url or "",
        } for s in sellers])
        clean.to_csv(OUTPUT_DIR / "latest_clean.csv", index=False, encoding="utf-8-sig")
        print(f"  📊 CSV clean: output/latest_clean.csv")

    push_to_supabase(sellers)
    return path


# ─────────────────────────────────────────────────────────────────────────────
# Main run
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Supabase dedup
# ─────────────────────────────────────────────────────────────────────────────

def fetch_existing_seller_ids() -> set:
    """Récupère les amazon_seller_id déjà en base pour éviter les doublons."""
    try:
        r = http_requests.get(
            f"{SUPABASE_URL}/rest/v1/amazon_sellers?select=amazon_seller_id",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=15,
        )
        if r.status_code == 200:
            return {x.get("amazon_seller_id") for x in r.json() if x.get("amazon_seller_id")}
    except Exception as e:
        print(f"  ⚠️  Dedup fetch failed: {e}")
    return set()


# ─────────────────────────────────────────────────────────────────────────────
# Parallel workers (Phase B + Phase C)
# ─────────────────────────────────────────────────────────────────────────────

_print_lock = threading.Lock()
_dict_lock = threading.Lock()

def log(msg: str):
    with _print_lock:
        print(msg, flush=True)


def phase_b_worker(worker_id: int, asin_queue: list, candidates: dict,
                   existing_ids: set, cand_goal: int, stop_flag: list):
    """Un worker Phase B pioche des ASINs, extrait les sellers tiers."""
    driver = make_driver()
    try:
        driver.get("https://www.amazon.fr")
        time.sleep(random.uniform(3, 5))
        while asin_queue and not stop_flag[0]:
            try:
                asin = asin_queue.pop(0)
            except IndexError:
                return
            try:
                pairs = get_sellers_from_offers(driver, asin)
            except (NoSuchWindowException, WebDriverException):
                driver = restart_driver(driver)
                try:
                    pairs = get_sellers_from_offers(driver, asin)
                except Exception:
                    continue
            new_count = 0
            with _dict_lock:
                for sid, name in pairs:
                    if sid in candidates or sid in existing_ids:
                        continue
                    candidates[sid] = name
                    new_count += 1
                n = len(candidates)
            if new_count:
                log(f"  [B{worker_id}] ASIN {asin}: +{new_count} | total {n}/{cand_goal}")
            if n >= cand_goal:
                stop_flag[0] = True
                return
            time.sleep(random.uniform(0.5, 1.5))
    finally:
        try:
            driver.quit()
        except Exception:
            pass


def enrich_worker(worker_id: int, job_queue: list, out: dict, target: int, stop_flag: list):
    """Un worker = un Chrome. Pioche dans job_queue tant que stop_flag[0] == False."""
    driver = make_driver()
    try:
        driver.get("https://www.amazon.fr")
        time.sleep(random.uniform(3, 5))
        while job_queue and not stop_flag[0]:
            try:
                sid, raw_name = job_queue.pop(0)
            except IndexError:
                return
            with _dict_lock:
                if sid in out:
                    continue
            log(f"  [W{worker_id}] Enrich: {raw_name[:35]} ({sid})")
            try:
                s = enrich(driver, sid, raw_name)
            except (NoSuchWindowException, WebDriverException):
                driver = restart_driver(driver)
                try:
                    s = enrich(driver, sid, raw_name)
                except Exception:
                    continue
            if s.rating > 0 and s.rating < FILTER_MIN_RATING:
                log(f"  [W{worker_id}] ❌ note {s.rating}")
                continue
            if s.nb_products > 0 and s.nb_products < FILTER_MIN_PRODUCTS:
                log(f"  [W{worker_id}] ❌ catalogue {s.nb_products}")
                continue
            with _dict_lock:
                out[sid] = s
            lang_flag = {"fr":"🇫🇷","de":"🇩🇪","en":"🇬🇧","it":"🇮🇹","es":"🇪🇸","zh":"🇨🇳"}.get(s.seller_language, "🌐")
            z_flag = "✅Z" if s.on_zalando else ""
            log(f"  [W{worker_id}] → [{len(out)}/{target}] {lang_flag} note={s.rating or '?'} "
                f"avis={s.nb_reviews} feedback={s.positive_feedback_pct or '?'}% "
                f"prod={s.nb_products} prix={s.avg_price or '?'}€ {z_flag}")
            if len(out) >= target:
                stop_flag[0] = True
                return
            time.sleep(random.uniform(1, 2))
    finally:
        try:
            driver.quit()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Main run
# ─────────────────────────────────────────────────────────────────────────────

def run(target: int = 20, parallel: int = 1, skip_existing: bool = True):
    print(f"\n{'='*60}")
    print(f"Amazon FR Seller Scraper v4")
    print(f"Target: {target} vendeurs qualifiés | parallel={parallel} | skip_existing={skip_existing}")
    print(f"{'='*60}\n")

    existing_ids: set[str] = set()
    if skip_existing:
        print("Fetching existing seller IDs from Supabase (dedup)…")
        existing_ids = fetch_existing_seller_ids()
        print(f"  → {len(existing_ids)} IDs already in base, will be skipped\n")

    seen_ids:       set[str]         = set()
    sellers:        dict[str, Seller] = {}
    asin_queue:     list[str]        = []
    candidates:     dict[str, str]   = {}  # seller_id → raw_name

    driver = make_driver()

    try:
        # ── Warmup ──────────────────────────────────────────────────────────
        print("Warmup Amazon FR…")
        driver.get("https://www.amazon.fr")
        time.sleep(random.uniform(5, 8))
        print("  ✓ OK\n")

        # ── Phase A — ASINs ─────────────────────────────────────────────────
        print("Phase A — Collecte ASINs\n")
        asin_goal = max(target * 5, 200)
        # Pour >200 sellers, on pagine chaque query pour multiplier les ASINs
        pages_per_query = 3 if target >= 200 else 1
        for query in SEARCH_QUERIES:
            if len(asin_queue) >= asin_goal:
                break
            print(f"  Search: '{query}' (pages={pages_per_query})")
            try:
                asins = get_asins(driver, query, pages=pages_per_query)
            except (NoSuchWindowException, WebDriverException):
                driver = restart_driver(driver)
                try:
                    asins = get_asins(driver, query, pages=pages_per_query)
                except Exception:
                    asins = []
            asin_queue.extend(a for a in asins if a not in asin_queue)
            print(f"  → {len(asins)} ASINs | total: {len(asin_queue)}")
            time.sleep(random.uniform(1.5, 3))

        print(f"\n→ {len(asin_queue)} ASINs\n")

        # ── Phase B — Sellers tiers (parallèle si parallel > 1) ──────────────
        print(f"Phase B — Extraction vendeurs tiers (parallel={parallel})\n")
        cand_goal = max(target * 3, 100)

        if parallel > 1:
            # On libère le driver principal (chaque worker a le sien)
            try:
                driver.quit()
            except Exception:
                pass
            driver = None

            stop_b = [False]
            with ThreadPoolExecutor(max_workers=parallel) as pool:
                futs = [
                    pool.submit(phase_b_worker, wid, asin_queue, candidates,
                                existing_ids, cand_goal, stop_b)
                    for wid in range(parallel)
                ]
                for f in as_completed(futs):
                    try:
                        f.result()
                    except Exception as e:
                        print(f"  ⚠️  Phase B worker: {e}")
        else:
            for asin in asin_queue:
                if len(candidates) >= cand_goal:
                    break
                try:
                    pairs = get_sellers_from_offers(driver, asin)
                except (NoSuchWindowException, WebDriverException):
                    driver = restart_driver(driver)
                    try:
                        pairs = get_sellers_from_offers(driver, asin)
                    except Exception:
                        pairs = []
                for sid, name in pairs:
                    if sid in candidates or sid in existing_ids:
                        continue
                    candidates[sid] = name
                    print(f"  + {name[:45]} ({sid})")
                time.sleep(random.uniform(1, 2.5))

        print(f"\n→ {len(candidates)} candidats vendeurs\n")

        # ── Phase C — Enrichissement (parallèle si parallel > 1) ─────────────
        print(f"Phase C — Enrichissement via /sp?seller= (parallel={parallel})\n")

        # On libère le driver principal (les workers ont les leurs)
        if parallel > 1:
            if driver is not None:
                try:
                    driver.quit()
                except Exception:
                    pass
                driver = None

            jobs = list(candidates.items())
            stop_flag = [False]
            with ThreadPoolExecutor(max_workers=parallel) as pool:
                futures = [
                    pool.submit(enrich_worker, wid, jobs, sellers, target, stop_flag)
                    for wid in range(parallel)
                ]
                # Sauvegarde intermédiaire périodique
                last_ckpt = 0
                while any(not f.done() for f in futures):
                    time.sleep(15)
                    n = len(sellers)
                    if n >= last_ckpt + 20 and n < target:
                        save(list(sellers.values()), intermediate=True)
                        last_ckpt = n
        else:
            for sid, raw_name in candidates.items():
                if len(sellers) >= target:
                    break
                if sid in seen_ids:
                    continue
                seen_ids.add(sid)
                print(f"  Enrich: {raw_name[:40]} ({sid})")
                try:
                    s = enrich(driver, sid, raw_name)
                except (NoSuchWindowException, WebDriverException):
                    driver = restart_driver(driver)
                    try:
                        s = enrich(driver, sid, raw_name)
                    except Exception:
                        continue

                if s.rating > 0 and s.rating < FILTER_MIN_RATING:
                    print(f"  ❌ Note trop basse: {s.rating}")
                    continue
                if s.nb_products > 0 and s.nb_products < FILTER_MIN_PRODUCTS:
                    print(f"  ❌ Catalogue trop petit: {s.nb_products}")
                    continue

                sellers[sid] = s
                z_flag  = "✅ Zalando" if s.on_zalando else ""
                lang_flag = {"fr":"🇫🇷","de":"🇩🇪","en":"🇬🇧","it":"🇮🇹","es":"🇪🇸","zh":"🇨🇳"}.get(s.seller_language, "🌐")
                print(f"  → [{len(sellers)}/{target}] {lang_flag} | note={s.rating or 'N/A'} | "
                      f"avis={s.nb_reviews} | feedback={s.positive_feedback_pct or '?'}% | "
                      f"produits={s.nb_products} | prix={s.avg_price or '?'}€ | "
                      f"ventes30j={s.nb_sales_30d or '?'} | ancien={s.years_on_amazon or '?'}ans {z_flag}")

                if len(sellers) % 10 == 0:
                    save(list(sellers.values()), intermediate=True)
                time.sleep(random.uniform(2, 3.5))

    finally:
        if driver is not None:
            try:
                driver.quit()
            except Exception:
                pass

    final = list(sellers.values())[:target]
    path  = save(final)

    # ── Résumé ───────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"✅ {len(final)} vendeurs réels scrappés")
    if path:
        print(f"📄 CSV:       {path}")
        print(f"📊 CSV clean: {OUTPUT_DIR}/latest_clean.csv")
    if final:
        langs      = {}
        on_z       = sum(1 for s in final if s.on_zalando)
        rated      = [s for s in final if s.rating > 0]
        with_sales = [s for s in final if s.nb_sales_30d > 0]
        for s in final:
            langs[s.seller_language] = langs.get(s.seller_language, 0) + 1
        print(f"Sur Zalando:  {on_z}/{len(final)}")
        print(f"Langues:      {langs}")
        if rated:
            print(f"Note moy:     {sum(s.rating for s in rated)/len(rated):.2f}")
        if with_sales:
            print(f"Ventes 30j:   {sum(s.nb_sales_30d for s in with_sales)} estimées sur {len(with_sales)} vendeurs")
    print('='*60)
    return final


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--count", type=int, default=20)
    p.add_argument("--parallel", type=int, default=1,
                   help="Nombre d'instances Chrome pour Phase B + C (recommandé: 4 pour 1000 sellers)")
    p.add_argument("--no-dedup", action="store_true",
                   help="Ne pas filtrer les sellers déjà en base Supabase")
    args = p.parse_args()
    run(target=args.count, parallel=args.parallel, skip_existing=not args.no_dedup)
