"""
Mock Data Generator — Amazon FR Sellers
Mirakl Connect Hackathon — Phase 1

Génère un CSV réaliste de vendeurs Amazon FR dans les catégories mode/sport/lifestyle.
Basé sur de vrais vendeurs tiers actifs sur Amazon FR.
Utilisé pour : tests agent Dust, démo pipeline, en attendant le scraping réel.

Usage:
  python generate_mock_data.py --count 60 --output output/sellers_mock.csv
"""

import argparse
import random
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Seed data — vrais profils de vendeurs Amazon FR (mode/sport/lifestyle)
# ---------------------------------------------------------------------------

SELLER_PROFILES = [
    # ── Mode Femme ───────────────────────────────────────────────────────────
    {"seller_name": "PIECES", "categories": "mode, vêtements femme, accessoires", "country": "Danemark", "multichannel": "yes", "avg_price_range": (15, 60), "nb_products_range": (200, 600), "rating_range": (4.1, 4.6)},
    {"seller_name": "ONLY Store", "categories": "mode, vêtements femme, jeans", "country": "Danemark", "multichannel": "yes", "avg_price_range": (20, 70), "nb_products_range": (300, 800), "rating_range": (4.0, 4.5)},
    {"seller_name": "Vila Clothes", "categories": "mode, vêtements femme, robes", "country": "Danemark", "multichannel": "yes", "avg_price_range": (25, 80), "nb_products_range": (150, 400), "rating_range": (4.2, 4.7)},
    {"seller_name": "Vero Moda Official", "categories": "mode, vêtements femme, tops", "country": "Danemark", "multichannel": "yes", "avg_price_range": (20, 65), "nb_products_range": (250, 500), "rating_range": (4.1, 4.6)},
    {"seller_name": "Noisy May", "categories": "mode, vêtements femme, jeans, robes", "country": "Danemark", "multichannel": "yes", "avg_price_range": (18, 55), "nb_products_range": (120, 350), "rating_range": (4.0, 4.5)},
    {"seller_name": "ICHI Fashion", "categories": "mode, vêtements femme, knitwear", "country": "Danemark", "multichannel": "yes", "avg_price_range": (30, 90), "nb_products_range": (80, 250), "rating_range": (4.2, 4.7)},
    {"seller_name": "b.young Official", "categories": "mode, vêtements femme, pantalons", "country": "Danemark", "multichannel": "yes", "avg_price_range": (25, 75), "nb_products_range": (100, 300), "rating_range": (4.1, 4.6)},
    {"seller_name": "Joules", "categories": "mode, vêtements femme, lifestyle", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (40, 120), "nb_products_range": (150, 400), "rating_range": (4.3, 4.8)},
    {"seller_name": "Regatta Great Outdoors", "categories": "sport, outdoor, vêtements femme", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (20, 80), "nb_products_range": (300, 700), "rating_range": (4.2, 4.7)},
    {"seller_name": "Craghoppers", "categories": "sport outdoor, vêtements voyage, lifestyle", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (35, 120), "nb_products_range": (200, 500), "rating_range": (4.3, 4.8)},
    # ── Mode Homme ───────────────────────────────────────────────────────────
    {"seller_name": "Jack & Jones Official", "categories": "mode, vêtements homme, jeans", "country": "Danemark", "multichannel": "yes", "avg_price_range": (25, 80), "nb_products_range": (300, 700), "rating_range": (4.0, 4.5)},
    {"seller_name": "Selected Homme", "categories": "mode, vêtements homme, chemises", "country": "Danemark", "multichannel": "yes", "avg_price_range": (40, 120), "nb_products_range": (100, 300), "rating_range": (4.1, 4.6)},
    {"seller_name": "Tom Tailor Official", "categories": "mode, vêtements homme, casual", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (20, 70), "nb_products_range": (200, 500), "rating_range": (4.0, 4.5)},
    {"seller_name": "s.Oliver Fashion", "categories": "mode, vêtements homme, vêtements femme", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (20, 75), "nb_products_range": (400, 900), "rating_range": (4.1, 4.6)},
    {"seller_name": "Levi's Official Store", "categories": "mode, jeans, vêtements casual", "country": "États-Unis", "multichannel": "yes", "avg_price_range": (50, 130), "nb_products_range": (150, 400), "rating_range": (4.3, 4.8)},
    {"seller_name": "Kaporal Boutique", "categories": "mode, jeans, vêtements français", "country": "France", "multichannel": "yes", "avg_price_range": (40, 100), "nb_products_range": (80, 200), "rating_range": (4.0, 4.5)},
    {"seller_name": "Wrangler Official", "categories": "mode, jeans, vêtements homme", "country": "États-Unis", "multichannel": "yes", "avg_price_range": (45, 110), "nb_products_range": (100, 300), "rating_range": (4.2, 4.7)},
    # ── Sport & Fitness ──────────────────────────────────────────────────────
    {"seller_name": "Odlo Sport", "categories": "sport, running, sous-vêtements techniques", "country": "Suisse", "multichannel": "yes", "avg_price_range": (30, 120), "nb_products_range": (150, 400), "rating_range": (4.3, 4.8)},
    {"seller_name": "Löffler Sportswear", "categories": "sport, cyclisme, triathlon", "country": "Autriche", "multichannel": "no", "avg_price_range": (50, 200), "nb_products_range": (80, 200), "rating_range": (4.4, 4.9)},
    {"seller_name": "Endura Cycling", "categories": "sport, cyclisme, vêtements outdoor", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (40, 180), "nb_products_range": (100, 300), "rating_range": (4.3, 4.8)},
    {"seller_name": "Protest Sportswear", "categories": "sport, ski, surf, lifestyle", "country": "Pays-Bas", "multichannel": "yes", "avg_price_range": (35, 150), "nb_products_range": (120, 350), "rating_range": (4.1, 4.6)},
    {"seller_name": "Dare 2B", "categories": "sport, ski, outdoor, lifestyle", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (25, 100), "nb_products_range": (200, 500), "rating_range": (4.2, 4.7)},
    {"seller_name": "Salewa Mountain Sports", "categories": "sport outdoor, alpinisme, randonnée", "country": "Italie", "multichannel": "yes", "avg_price_range": (60, 250), "nb_products_range": (80, 200), "rating_range": (4.4, 4.9)},
    {"seller_name": "Icebreaker Official", "categories": "sport, outdoor, laine mérinos", "country": "Nouvelle-Zélande", "multichannel": "yes", "avg_price_range": (50, 180), "nb_products_range": (100, 300), "rating_range": (4.4, 4.9)},
    {"seller_name": "Berghaus Outdoor", "categories": "sport outdoor, randonnée, escalade", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (40, 200), "nb_products_range": (150, 400), "rating_range": (4.3, 4.8)},
    # ── Accessoires & Maroquinerie ───────────────────────────────────────────
    {"seller_name": "Saddler France", "categories": "maroquinerie, sacs cuir, accessoires mode", "country": "France", "multichannel": "no", "avg_price_range": (60, 250), "nb_products_range": (30, 100), "rating_range": (4.3, 4.8)},
    {"seller_name": "Burkely Bags", "categories": "maroquinerie, sacs, accessoires", "country": "Pays-Bas", "multichannel": "yes", "avg_price_range": (80, 300), "nb_products_range": (40, 120), "rating_range": (4.2, 4.7)},
    {"seller_name": "Fossil Official Store", "categories": "montres, maroquinerie, accessoires mode", "country": "États-Unis", "multichannel": "yes", "avg_price_range": (60, 200), "nb_products_range": (100, 300), "rating_range": (4.3, 4.8)},
    {"seller_name": "Desigual Official", "categories": "mode, accessoires, sacs", "country": "Espagne", "multichannel": "yes", "avg_price_range": (30, 150), "nb_products_range": (150, 400), "rating_range": (4.0, 4.5)},
    {"seller_name": "Pepe Jeans Official", "categories": "mode, jeans, accessoires", "country": "Espagne", "multichannel": "yes", "avg_price_range": (35, 120), "nb_products_range": (150, 450), "rating_range": (4.1, 4.6)},
    # ── Lifestyle & Mixte ────────────────────────────────────────────────────
    {"seller_name": "Mexx Fashion", "categories": "mode, lifestyle, vêtements homme, vêtements femme", "country": "Pays-Bas", "multichannel": "yes", "avg_price_range": (25, 90), "nb_products_range": (200, 500), "rating_range": (4.0, 4.5)},
    {"seller_name": "Cache Cache Officiel", "categories": "mode femme, robes, lifestyle", "country": "France", "multichannel": "yes", "avg_price_range": (20, 70), "nb_products_range": (100, 300), "rating_range": (4.0, 4.5)},
    {"seller_name": "La Redoute Collections", "categories": "mode, lifestyle, décoration", "country": "France", "multichannel": "yes", "avg_price_range": (15, 80), "nb_products_range": (500, 1500), "rating_range": (4.0, 4.5)},
    {"seller_name": "Benetton Official", "categories": "mode, vêtements homme, vêtements femme, enfants", "country": "Italie", "multichannel": "yes", "avg_price_range": (20, 80), "nb_products_range": (200, 600), "rating_range": (4.1, 4.6)},
    {"seller_name": "Dockers Official", "categories": "mode, chinos, vêtements homme", "country": "États-Unis", "multichannel": "yes", "avg_price_range": (40, 100), "nb_products_range": (80, 200), "rating_range": (4.2, 4.7)},
    {"seller_name": "Timezone Jeans", "categories": "mode, jeans, vêtements casual", "country": "Allemagne", "multichannel": "no", "avg_price_range": (30, 80), "nb_products_range": (60, 180), "rating_range": (4.1, 4.6)},
    {"seller_name": "Cross Jeans Official", "categories": "mode, jeans, vêtements", "country": "Pologne", "multichannel": "no", "avg_price_range": (25, 70), "nb_products_range": (50, 150), "rating_range": (4.0, 4.4)},
    {"seller_name": "Dranella Fashion", "categories": "mode femme, knitwear, casual", "country": "Danemark", "multichannel": "yes", "avg_price_range": (30, 90), "nb_products_range": (60, 200), "rating_range": (4.1, 4.6)},
    {"seller_name": "Sisley Boutique", "categories": "mode, lifestyle, vêtements premium", "country": "Italie", "multichannel": "yes", "avg_price_range": (50, 180), "nb_products_range": (80, 250), "rating_range": (4.2, 4.7)},
    {"seller_name": "Mustang Jeans DE", "categories": "mode, jeans, vêtements casual", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (35, 90), "nb_products_range": (100, 300), "rating_range": (4.1, 4.6)},
    {"seller_name": "Freeman T. Porter FR", "categories": "mode, jeans, lifestyle", "country": "France", "multichannel": "yes", "avg_price_range": (40, 120), "nb_products_range": (50, 150), "rating_range": (4.2, 4.7)},
    # ── Bijoux & Montres ─────────────────────────────────────────────────────
    {"seller_name": "Cluse Official", "categories": "montres, bijoux, accessoires mode", "country": "Pays-Bas", "multichannel": "yes", "avg_price_range": (80, 200), "nb_products_range": (40, 100), "rating_range": (4.3, 4.8)},
    {"seller_name": "Skagen Denmark", "categories": "montres, bijoux, accessoires lifestyle", "country": "Danemark", "multichannel": "yes", "avg_price_range": (100, 300), "nb_products_range": (50, 150), "rating_range": (4.4, 4.9)},
    {"seller_name": "Nomination Jewellery", "categories": "bijoux, accessoires mode, lifestyle", "country": "Italie", "multichannel": "yes", "avg_price_range": (20, 150), "nb_products_range": (100, 400), "rating_range": (4.3, 4.8)},
    {"seller_name": "Thomas Sabo FR", "categories": "bijoux, montres, accessoires premium", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (50, 300), "nb_products_range": (200, 600), "rating_range": (4.4, 4.9)},
    # ── Outdoor / Lifestyle niche ────────────────────────────────────────────
    {"seller_name": "Schöffel Outdoor", "categories": "sport outdoor, randonnée, lifestyle", "country": "Allemagne", "multichannel": "no", "avg_price_range": (50, 200), "nb_products_range": (100, 300), "rating_range": (4.3, 4.8)},
    {"seller_name": "Trespass Outdoor", "categories": "sport, outdoor, ski, lifestyle", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (20, 120), "nb_products_range": (300, 700), "rating_range": (4.1, 4.6)},
    {"seller_name": "Jack Wolfskin FR", "categories": "sport outdoor, randonnée, lifestyle premium", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (60, 250), "nb_products_range": (200, 500), "rating_range": (4.4, 4.9)},
    {"seller_name": "Deerhunter Outdoor", "categories": "outdoor, chasse, lifestyle", "country": "Danemark", "multichannel": "no", "avg_price_range": (40, 200), "nb_products_range": (80, 250), "rating_range": (4.2, 4.7)},
    {"seller_name": "Sherpa Adventure Gear", "categories": "outdoor, randonnée, vêtements voyage", "country": "Népal", "multichannel": "no", "avg_price_range": (50, 180), "nb_products_range": (40, 120), "rating_range": (4.4, 4.9)},
    {"seller_name": "Ortovox Alpine", "categories": "sport, alpinisme, laine mérinos", "country": "Allemagne", "multichannel": "no", "avg_price_range": (80, 300), "nb_products_range": (80, 200), "rating_range": (4.5, 4.9)},
    {"seller_name": "Haglöfs Official", "categories": "outdoor, sport, lifestyle scandinave", "country": "Suède", "multichannel": "yes", "avg_price_range": (70, 300), "nb_products_range": (100, 250), "rating_range": (4.4, 4.9)},
    # ── Chaussures ───────────────────────────────────────────────────────────
    {"seller_name": "Marco Tozzi Official", "categories": "chaussures femme, bottes, mode", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (30, 100), "nb_products_range": (200, 600), "rating_range": (4.1, 4.6)},
    {"seller_name": "Tamaris Official", "categories": "chaussures femme, mode, accessoires", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (30, 90), "nb_products_range": (300, 800), "rating_range": (4.2, 4.7)},
    {"seller_name": "ara Shoes", "categories": "chaussures femme, confort, mode", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (60, 150), "nb_products_range": (150, 400), "rating_range": (4.3, 4.8)},
    {"seller_name": "Kappa Sport Official", "categories": "sport, chaussures, vêtements", "country": "Italie", "multichannel": "yes", "avg_price_range": (25, 80), "nb_products_range": (150, 400), "rating_range": (4.0, 4.5)},
    {"seller_name": "Skechers FR", "categories": "chaussures, sport, lifestyle", "country": "États-Unis", "multichannel": "yes", "avg_price_range": (40, 100), "nb_products_range": (300, 800), "rating_range": (4.2, 4.7)},
    # ── Mode Accessible/Jeune ────────────────────────────────────────────────
    {"seller_name": "Trendyol Official", "categories": "mode femme, lifestyle, accessoires", "country": "Turquie", "multichannel": "yes", "avg_price_range": (10, 45), "nb_products_range": (500, 2000), "rating_range": (4.0, 4.5)},
    {"seller_name": "Boohoo Official", "categories": "mode femme, tendances, accessoires", "country": "Royaume-Uni", "multichannel": "yes", "avg_price_range": (8, 40), "nb_products_range": (1000, 3000), "rating_range": (3.8, 4.3)},
    {"seller_name": "NA-KD Fashion", "categories": "mode femme, lifestyle, tendances", "country": "Suède", "multichannel": "yes", "avg_price_range": (20, 70), "nb_products_range": (300, 800), "rating_range": (4.0, 4.5)},
    {"seller_name": "Sublevel Fashion", "categories": "mode, streetwear, casual", "country": "Allemagne", "multichannel": "no", "avg_price_range": (15, 50), "nb_products_range": (100, 300), "rating_range": (4.0, 4.5)},
    {"seller_name": "Urban Classics", "categories": "mode, streetwear, lifestyle", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (15, 60), "nb_products_range": (400, 1000), "rating_range": (4.1, 4.6)},
    {"seller_name": "Ulla Popken FR", "categories": "mode grande taille, vêtements femme", "country": "Allemagne", "multichannel": "yes", "avg_price_range": (25, 90), "nb_products_range": (200, 600), "rating_range": (4.1, 4.6)},
]


def generate_seller_id(name: str) -> str:
    """Generate a fake but realistic-looking Amazon seller ID."""
    import hashlib
    h = hashlib.md5(name.encode()).hexdigest().upper()
    return "A" + h[:13]


def generate_seller_url(seller_id: str) -> str:
    return f"https://www.amazon.fr/sp?seller={seller_id}"


def generate_row(profile: dict, noise: float = 0.1) -> dict:
    """Generate a realistic CSV row from a seller profile with slight randomness."""
    rng = random.Random(profile["seller_name"])  # deterministic per seller

    def jitter(value: float, pct: float = noise) -> float:
        return round(value * (1 + rng.uniform(-pct, pct)), 2)

    def jitter_int(value: int, pct: float = noise) -> int:
        return max(1, int(value * (1 + rng.uniform(-pct, pct))))

    min_r, max_r = profile["rating_range"]
    rating = round(rng.uniform(min_r, max_r), 1)

    min_p, max_p = profile["avg_price_range"]
    avg_price = round(rng.uniform(min_p, max_p), 2)

    min_n, max_n = profile["nb_products_range"]
    nb_products = rng.randint(min_n, max_n)

    nb_reviews = rng.randint(50, 5000) if rating >= 4.2 else rng.randint(20, 800)

    seller_id = generate_seller_id(profile["seller_name"])

    return {
        "seller_name": profile["seller_name"],
        "seller_url": generate_seller_url(seller_id),
        "seller_id": seller_id,
        "categories": profile["categories"],
        "nb_products": nb_products,
        "rating": rating,
        "nb_reviews": nb_reviews,
        "avg_price": avg_price,
        "multichannel": profile["multichannel"],
        "country": profile["country"],
        "business_name": profile["seller_name"],
        "scrape_date": "2026-04-21",
        "data_source": "mock_v1",
    }


def generate_dataset(count: int = 60) -> pd.DataFrame:
    rows = []
    profiles = SELLER_PROFILES.copy()
    random.shuffle(profiles)

    # Use all known profiles first, then repeat with slight variations if needed
    for i in range(count):
        profile = profiles[i % len(profiles)]
        row = generate_row(profile)
        # Add a suffix to avoid exact duplicates if count > len(SELLER_PROFILES)
        if i >= len(profiles):
            row["seller_name"] = f"{row['seller_name']} FR"
            row["seller_id"] = generate_seller_id(row["seller_name"])
            row["seller_url"] = generate_seller_url(row["seller_id"])
        rows.append(row)

    df = pd.DataFrame(rows)
    # Apply quality filters (same as real scraper)
    df = df[df["rating"] >= 4.0]
    df = df[df["nb_products"] >= 20]
    return df.head(count).reset_index(drop=True)


def main():
    parser = argparse.ArgumentParser(description="Generate mock Amazon FR seller data")
    parser.add_argument("--count", type=int, default=60, help="Number of sellers to generate")
    parser.add_argument("--output", type=str, default="output/sellers_mock.csv")
    args = parser.parse_args()

    print(f"Generating {args.count} mock sellers...")
    df = generate_dataset(args.count)

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = Path(__file__).parent / output_path

    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"✅ {len(df)} sellers saved to {output_path}")
    print(f"\nSample:")
    print(df[["seller_name", "categories", "nb_products", "rating", "avg_price", "multichannel"]].head(10).to_string(index=False))

    # Stats
    print(f"\n📊 Stats:")
    print(f"  Avg rating: {df['rating'].mean():.2f}")
    print(f"  Avg nb_products: {df['nb_products'].mean():.0f}")
    print(f"  Avg price: {df['avg_price'].mean():.1f}€")
    print(f"  Multichannel yes: {(df['multichannel']=='yes').sum()}/{len(df)}")
    print(f"  Countries: {df['country'].value_counts().head(5).to_dict()}")

    return output_path


if __name__ == "__main__":
    main()
