# 🎯 UC2 — Amazon FR → Zalando
## Mirakl Hackathon | Eugenia School

> Automated pipeline that detects, scores, enriches and recruits the best Amazon FR sellers for the Zalando marketplace via Mirakl Connect.

**Presented to** : Juliette Pichard, Sr VP Global Sales Acceleration  
**Stack** : N8N + OpenAI GPT-4o + Supabase + Apollo + Clay + Brevo  
**Role in UC2** : 50% of the project (Amazon FR → Zalando block)

---

## 🎯 Context & Stakes

Mirakl Connect BDRs manually identify relevant Amazon FR sellers for Zalando.

**The problem :**
- Manual process = slow, costly, not scalable
- 1 BDR = ~10 sellers analyzed per week
- Subjective scoring, impossible to justify

**Our solution :**
- 109 sellers scored automatically
- 5 seconds per seller vs several days manually
- 80% reduction in BDR workload
- Score 100% explainable across 5 criteria

---

## 👥 Team

| Role | Name | Responsibilities |
|------|------|-----------------|
| CEO / Coordinator | Noah | Architecture, OpenAI prompts, jury pitch |
| CDO / Scraping | Victorien | Amazon FR scraping, enrichment, database |
| CAIO / AI Agent | Jahdiel | Scoring agent, matching logic, JSON |

---

## 🏗️ Architecture — 6 Workflows

```
Workflow 1 → Filtering & Deduplication
     ↓       (scheduler every 5 min)
Workflow 2 → DUST Scoring Agent (GPT-4o)
     ↓       (score on 5 Mirakl criteria)
Workflow 3 → Decision-Maker Enrichment
     ↓       (Apollo + Clay)
Workflow 4 → AI Email Generation
     ↓       (GPT-4o, 3 emails/seller)
Workflow 5 → Brevo Sequence D0 / D+3 / D+6
     ↓       (automated sending)
Workflow 6 → Brevo Tracking (Webhook)
             (real-time : open/click/reply)
```

---

## ⚙️ Tech Stack

| Tool | Version | Role |
|------|---------|------|
| N8N Cloud | v1.88 | 6 workflow orchestration |
| OpenAI GPT-4o | gpt-4o-2024-11-20 | AI scoring + email generation |
| Supabase | v2.x (PostgreSQL 15) | Database + REST API |
| Apollo | API v2 | Decision-maker email enrichment |
| Clay | Enterprise | Company enrichment |
| Brevo | API v3 | Email sending + event tracking |

---

## 🕷️ Module 0 — Amazon FR Seller Scraper

**File** : `scraper/amazon_scraper_v4.py`  
**Language** : Python 3.11  
**Role** : Automated collection of third-party Amazon FR sellers and population of the `amazon_sellers` table in Supabase.

---

### What the scraper does

Our pipeline starts with a simple question :  
**"Which Amazon FR sellers are worth reaching out to for Zalando?"**

The scraper answers this question automatically in 4 steps :

**1. It searches Amazon FR products**  
→ Runs 60+ fashion/sport/lifestyle searches on Amazon FR  
→ Collects ASINs from the results  
→ Ex : "women's dress", "men's jeans", "women's running"...

**2. It identifies THIRD-PARTY sellers only**  
→ For each product, opens the "All offers" page  
→ Extracts only independent sellers  
→ Automatically filters out Amazon itself

**3. It enriches each seller**  
→ Visits each seller's profile at `/sp?seller=ID`  
→ Collects : name, rating, reviews, country, catalog, pricing, legal info, FBA status  
→ Checks whether the seller is already on Zalando

**4. It feeds Supabase**  
→ Pushes data into the `amazon_sellers` table  
→ Saves a clean CSV for presentation  
→ Automatic deduplication (no duplicates)

---

### By the numbers

| Metric | Value |
|--------|-------|
| Sellers collected | **109** |
| Time per seller | **~5 seconds** |
| Queries covered | **60+ categories** |
| Data points per seller | **25+ fields** |

---

### What it passes to Workflow 1

```
amazon_sellers (Supabase)
├── seller_name, seller_url
├── categories, nb_products
├── rating, nb_reviews
├── avg_price, min_price, max_price
├── is_fba, has_own_website
├── on_zalando (bool)
└── statut = "to_enrich"
         ↓
    Workflow 1 takes over
```

---

### 4-Phase Strategy

```
Phase A → Collect ASINs from Amazon FR
          search result pages
          (60+ fashion/sport/lifestyle queries)
     ↓
Phase B → Extract third-party seller IDs
          from "all offers" pages
          (guarantees : 0 Amazon-direct sellers)
     ↓
Phase C → Enrichment via /sp?seller=ID
          (name, rating, reviews, country,
          legal info, catalog, price, FBA, brands)
     ↓
Phase D → Zalando presence check (HTTP)
          + Supabase push + CSV export
```

---

### Scraper Tech Stack

| Tool | Version | Role |
|------|---------|------|
| Python | 3.11 | Runtime |
| undetected-chromedriver | 3.x | Anti-bot Chrome |
| BeautifulSoup4 | 4.12 | HTML parsing |
| Selenium | 4.x | Browser automation |
| Pandas | 2.x | CSV export |
| Requests | 2.x | HTTP direct (Zalando check) |
| Supabase REST API | v1 | Data push |

---

### Data Collected per Seller

```
# Identity
amazon_seller_id, seller_name, seller_url, country

# Legal info (Amazon seller section)
business_name, business_type
trade_register_number, vat_number
phone, email, business_address

# Amazon metrics
nb_products, rating, nb_reviews
positive_feedback_pct, avg_price
min_price, max_price, nb_sales_30d
years_on_amazon, is_fba, top_brands

# Zalando presence
on_zalando (bool), zalando_url
```

---

### Quality Filters Applied

```python
FILTER_MIN_RATING   = 4.0   # Minimum Amazon rating
FILTER_MIN_PRODUCTS = 10    # Minimum catalog size
# Automatic exclusion of Amazon direct seller IDs
AMAZON_IDS = {"A13V1IB3VIYZZH", ...}
```

---

### Running the Scraper

```bash
# Install dependencies
pip install undetected-chromedriver beautifulsoup4 \
            selenium pandas requests supabase

# Basic usage (20 sellers)
python amazon_scraper_v4.py --count 20

# Hackathon usage (109 sellers, 4 parallel Chrome instances)
python amazon_scraper_v4.py --count 109 --parallel 4

# Without Supabase deduplication
python amazon_scraper_v4.py --count 50 --no-dedup
```

---

### Output

```
output/
├── amazon_sellers_YYYYMMDD_HHMM.csv  ← raw data
├── latest.csv                         ← latest run
└── latest_clean.csv                   ← clean presentation version
```

**→ Automatic push to Supabase** : `amazon_sellers` (upsert on `seller_url`)

---

### ⚠️ Scraper Fragility Points

- Depends on Amazon FR HTML layout (may break without notice if Amazon updates its structure)
- Amazon rate limiting (random 1-3s delays built in)
- Requires Chrome installed locally
- Supabase key hardcoded → should be moved to environment variable

---

## WORKFLOW 1 — Filtering & Deduplication

**Role** : Detects newly scraped Amazon sellers and applies Zalando quality filters.  
**Frequency** : Every 5 minutes  
**Input** : Table `amazon_sellers` (first_filter = true)  
**Output** : Table `seller_qualification` → status `A_SCORER` or `REJETE_FILTRE`

<img width="2146" height="645" alt="Capture d&#39;écran 2026-04-23 164342" src="https://github.com/user-attachments/assets/49b692c7-ab04-4e6a-b302-8862a8c3b102" />


### Zalando Quality Filters

| Criteria | Threshold |
|----------|-----------|
| Category | Fashion / Sport / Lifestyle |
| Amazon Rating | ≥ 4.0 |
| Catalog Size | ≥ 20 products |

### Nodes

1. **5min Trigger** → automatic scheduler
2. **Supabase GET** → sellers (first_filter = true)
3. **Supabase duplicate check** → deduplication
4. **IF duplicate detected** → stop if already processed
5. **SplitInBatches** → one-by-one processing
6. **Quality filter code** → applies the 3 thresholds
7. **IF passes filters** → routing A_SCORER / KO
8. **INSERT seller_qualification** → save status

---

## WORKFLOW 2 — DUST Scoring Agent

**Role** : Automatically scores each Amazon seller with GPT-4o across 5 Mirakl criteria.  
**Input** : Sellers with `statut = A_SCORER AND score_total IS NULL`  
**Output** : `score_total`, `recommandation`, `angle_approche` updated in Supabase

<img width="2152" height="683" alt="Capture d&#39;écran 2026-04-23 164442" src="https://github.com/user-attachments/assets/db19816c-57b4-48cb-a98c-d010edcf9e91" />


### Scoring Grid — 5 Mirakl Criteria

| Criteria | Points | Description |
|----------|--------|-------------|
| Category Alignment | 25 pts | Fashion/sport fit for Zalando |
| Seller Quality | 25 pts | Amazon rating + review count |
| Catalog Size | 20 pts | SKU count (min threshold: 20) |
| Average Price | 15 pts | Price range consistency |
| Channel Dependency | 15 pts | Amazon-only risk |

### Decision Routing

| Score | Status | Action |
|-------|--------|--------|
| ≥ 70 | QUALIFIED | High-priority email |
| 50-69 | TO_REVIEW | Cautious approach email |
| < 50 | REJECTED | Archived, excluded from campaigns |

### GPT-4o JSON Output

```json
{
  "score_total": 75,
  "recommandation": "QUALIFIE",
  "angle_approche": "150 SKU catalog aligned with Zalando",
  "contexte_detecte": "amazon_only",
  "criteres": {
    "alignement_categorie": {"score": 20, "justification": "..."},
    "qualite_vendeur":      {"score": 20, "justification": "..."},
    "taille_catalogue":     {"score": 15, "justification": "..."},
    "prix_moyen":           {"score": 12, "justification": "..."},
    "dependance_canal":     {"score": 8,  "justification": "..."}
  }
}
```

### Nodes

1. **Workflow 2 Trigger** → triggered by Workflow 1
2. **Supabase GET** → A_SCORER sellers without score
3. **SplitInBatches** → one-by-one processing
4. **Message a model** → GPT-4o call (scoring)
5. **JavaScript code** → parse AI JSON response
6. **HTTP Request PATCH** → save score to Supabase
7. **IF Score ≥ 50** → qualified / rejected routing
8. **PATCH REJECTED** → archive sellers < 50

---

## WORKFLOW 3 — Decision-Maker Enrichment

**Role** : Identifies and enriches decision-maker contact details for each qualified seller via Apollo and Clay.  
**Input** : Sellers with `statut = scored`  
**Output** : `seller_qualification.statut = enriched` + decision-maker email saved

<img width="2539" height="605" alt="Capture d&#39;écran 2026-04-23 165413" src="https://github.com/user-attachments/assets/e23b2572-a5d0-4c9c-b768-2655fdb186f4" />


### Enrichment Sources

| Source | Role |
|--------|------|
| Apollo Search v2 | Email search by domain |
| Apollo Match | Email verification |
| Clay Enterprise | Company enrichment |
| Manual Mode | Fallback if APIs fail |

### Key Nodes

1. **HTTP Request** → scrape Amazon seller page
2. **Code** → official domain extraction
3. **IF domain found** → enrichment routing
4. **Apollo Search v2** → search decision-maker email
5. **Wait 2s** → Apollo rate limit compliance
6. **Apollo Match** → valid email confirmation
7. **Switch Mode** → Apollo / Clay / Manual
8. **Clay enrichment** → company data
9. **IF email found** → final validation
10. **PATCH seller_qualification** → save

---

## WORKFLOW 4 — AI Email Generation

**Role** : Generates 3 hyper-personalized emails per seller via GPT-4o based on score and approach angle.  
**Input** : `seller_qualification.statut = enriched`  
**Output** : 3 emails saved in `seller_emails` + status → `emails_generés`

<img width="2281" height="891" alt="Capture d&#39;écran 2026-04-23 165622" src="https://github.com/user-attachments/assets/78b0c3c5-798e-4ada-a96d-64db40185065" />


### Emails Generated

| Email | Timing | Goal |
|-------|--------|------|
| Mail 1 | D0 | Initial outreach (angle_approche) |
| Mail 2 | D+3 | Alternative follow-up |
| Mail 3 | D+6 | Closing email |

### Key Nodes

1. **Webhook / Trigger** → generation launch
2. **Code Build query** → filter enriched sellers
3. **IF sellers to email** → verification
4. **SplitInBatches** → one-by-one processing
5. **Set generation config** → AI parameters
6. **Code Fetch templates** → 3 Supabase templates
7. **Code metrics & language** → seller context
8. **GPT-4o** → generate 3 personalized emails
9. **Code Parse emails** → JSON extraction
10. **IF generation OK** → validation
11. **INSERT seller_emails** → save emails
12. **PATCH Template times_used** → usage tracking
13. **PATCH status emails_generés** → update

---

## WORKFLOW 5 — Brevo Sequence D0 / D+3 / D+6

**Role** : Automatically sends the 3-email sequence via Brevo with programmed delays.  
**Input** : `seller_qualification.statut = emails_generés`  
**Output** : `seller_sequence` updated + full email sequence sent

<img width="2154" height="456" alt="Capture d&#39;écran 2026-04-23 165737" src="https://github.com/user-attachments/assets/43e69f53-9de2-404d-9baf-a168f7809900" />


### Sending Sequence

```
D0   → Mail 1 sent immediately
D+3  → Mail 2 if no reply
D+6  → Mail 3 (closing email)
```

### Key Nodes

1. **Webhook / Trigger** → sequence launch
2. **Code Build query** → filter ready sellers
3. **IF sellers to send** → verification
4. **SplitInBatches** → one-by-one processing
5. **Brevo Create contact** → list subscription
6. **INSERT seller_sequence** → tracking initialization
7. **Brevo Send Mail 1 (D0)** → immediate send
8. **PATCH sequence_en_cours** → Supabase status
9. **Wait D+3** → 3-day wait
10. **Code Reload data** → seller data refresh
11. **PATCH sequence step 2** → update
12. **Brevo Send Mail 2 (D+3)** → follow-up
13. **Wait D+3** → additional 3-day wait
14. **Brevo Send Mail 3 (D+6)** → closing
15. **PATCH sequence_terminée** → sequence close

---

## WORKFLOW 6 — Brevo Tracking (Webhook)

**Role** : Receives Brevo events in real time and updates lead status in Supabase.  
**Input** : Brevo Webhook (POST on each event)  
**Output** : `seller_qualification` + `seller_sequence` updated in real time

<img width="1800" height="672" alt="image" src="https://github.com/user-attachments/assets/4d11e78e-cdd8-4063-8ed9-50732b52d3aa" />


### Tracked Events

| Event | Action | Status |
|-------|--------|--------|
| opened | opened_count +1 | — |
| clicked | clicked_count +1 | HOT 🔥 |
| replied | replied = true | REPLIED 💬 |
| bounce | bounced = true | BOUNCE ❌ |

### Nodes

1. **Brevo Events Webhook** → entry point
2. **Code Parse event** → seller_id + event_type
3. **IF Seller ID found** → validation
4. **Code Build PATCH payload** → JSON construction
5. **PATCH seller_sequence** → update counters
6. **IF Update qualification** → significant event filter
7. **PATCH seller_qualification** → HOT/REPLIED/BOUNCE

---

## 🗄️ Database Structure

### Table `amazon_sellers`

```sql
seller_id         UUID PRIMARY KEY
seller_name       TEXT
categories        TEXT
nb_products       INT
rating            FLOAT
nb_reviews        INT
avg_price         FLOAT
on_zalando        BOOLEAN
statut            TEXT   -- A_SCORER / REJETE
score_total       INT    -- 0-100
recommandation    TEXT   -- QUALIFIE / A_REVOIR / REJETE
angle_approche    TEXT   -- personalized pitch
contexte_detecte  TEXT   -- amazon_only / multi_canal
```

### Table `seller_qualification`

```sql
seller_id         UUID
statut            TEXT   -- scored / enriched /
                         -- emails_generés / HOT /
                         -- REPLIED / BOUNCE
decision_maker    TEXT
email_decideur    TEXT
```

### Table `seller_emails`

```sql
seller_id         UUID
mail1_objet       TEXT
mail1_html        TEXT
mail2_objet       TEXT
mail2_html        TEXT
mail3_objet       TEXT
mail3_html        TEXT
```

### Table `seller_sequence`

```sql
seller_id         UUID
opened_count      INT
clicked_count     INT
replied           BOOLEAN
bounced           BOOLEAN
last_event_at     TIMESTAMP
sequence_step     INT    -- 1, 2 or 3
```

---

## 📧 Email Example — UC2 Specific

### Seller analyzed : MoveWear Studio

**Signals detected by the pipeline :**

| Signal detected | Value | Impact on email |
|----------------|-------|----------------|
| Sport catalog | 26 products | → "Catalog growth" angle |
| Amazon rating | 4.6/5 | → Quality proof mentioned |
| Context | amazon_only | → Channel diversification argument |
| Mirakl score | 78/100 | → Classified QUALIFIED high priority |
| Detected language | French | → Email generated in FR |

---

### Mail 1 — D0 (First contact)

**Subject** : `Extend your success as MoveWear Studio on Zalando`

> **Annotation** : Subject uses the seller's exact name
> [signal : seller_name] + the target marketplace
> [signal : recommandation = QUALIFIE for Zalando]

**Body :**

> MoveWear Studio, with your catalog of 26 products
> [← signal : nb_products] and an exceptional Amazon
> rating of 4.6/5 [← signal : rating],
> you have enormous growth potential.
>
> By joining Zalando, you could increase your GMV
> by 30% [← signal : contexte_detecte = amazon_only
> → channel diversification argument].
>
> Let's discuss this opportunity in a 20-minute call.

**[Schedule a call]**

*Jean Dupont — Partner Manager, Mirakl Connect*

---

### Mail 2 — D+3 (Follow-up)

**Subject** : `MoveWear Studio x Zalando : a renewed opportunity`

> **Annotation** : Different tone from Mail 1 — "partnership"
> approach vs "growth" [signal : ab_variant = template_2]

---

### Mail 3 — D+6 (Closing)

**Subject** : `Last message for MoveWear Studio...`

> **Annotation** : Soft urgency — last email of the
> automated sequence [signal : sequence_step = 3]

---

### How the pipeline personalizes each email

```
Raw Amazon FR data
        ↓
[WF1] Quality filter (rating ≥ 4.0, catalog ≥ 20)
        ↓
[WF2] GPT-4o scoring → angle_approche detected
      ex : "amazon_only" → diversification argument
        ↓
[WF3] Decision-maker enrichment (Apollo)
      → decision_maker_name, email
        ↓
[WF4] GPT-4o generation
      → seller_name + nb_products + rating
      + angle_approche + target_marketplace
      = 100% personalized email
        ↓
[WF5] Brevo → send D0 / D+3 / D+6
        ↓
[WF6] Tracking → HOT if click / REPLIED if reply
```

---

## 📈 Results

| Metric | Value |
|--------|-------|
| Sellers scored | 109 automatically |
| Time per seller | ~5 seconds |
| Score distribution | 31 → 86/100 |
| BDR workload reduction | ~80% |
| Production executions | **707** |
| Success rate | **99.9%** |
| Average execution time | **0.86s** |

---

## 🔧 Configuration & Deployment

### Prerequisites

- Active N8N Cloud account
- OpenAI API key (GPT-4o)
- Configured Supabase project
- Apollo account (enrichment)
- Clay Enterprise account
- Brevo account + configured webhook

### N8N Environment Variables

```bash
SUPABASE_URL=https://[project].supabase.co
SUPABASE_API_KEY=[anon_key]
OPENAI_API_KEY=[sk-...]
APOLLO_API_KEY=[...]
CLAY_API_KEY=[...]
BREVO_API_KEY=[...]
```

### Scraper Environment Variables

```bash
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=[anon_key]
```

### Import & Activation

```
1. Import the 6 JSON files into N8N
2. Configure credentials
3. Activate in order :
   WF1 → WF2 → WF3 → WF4 → WF5 → WF6
```

---

## 🚀 Pipeline Monitoring

```sql
-- Real-time overview
SELECT statut, COUNT(*), ROUND(AVG(score_total), 1)
FROM amazon_sellers
GROUP BY statut;

-- Top qualified sellers
SELECT seller_name, score_total,
       recommandation, angle_approche
FROM amazon_sellers
WHERE score_total >= 50
ORDER BY score_total DESC;

-- Email sequence tracking
SELECT statut, COUNT(*)
FROM seller_qualification
GROUP BY statut;
```

---

## ⚠️ Known Limits & Fragility Points

### N8N Pipeline
- **Multi-user autosave** : conflicts if 2 devs edit simultaneously → work solo on critical nodes
- **GPT-4o cost** : varies based on generated HTML length → budget ~$0.02/seller for scaling
- **Apollo rate limit** : 200 requests/day on free plan → upgrade required for volume > 200 sellers/day
- **Brevo wait nodes (D+3/D+6)** : N8N Cloud keeps execution active → monitor long-running timeouts

### Data & Quality
- **Amazon scraper** : depends on HTML layout → may break if Amazon updates its structure
- **Decision-maker enrichment** : ~70% Apollo success rate → 30% require manual fallback
- **AI score** : based on Amazon data only → does not account for actual Zalando catalog fit

### Infrastructure
- **Supabase free tier** : 500 MB storage, 2 GB bandwidth → sufficient for hackathon, upgrade needed in production
- **N8N Cloud** : requires internet connection → no offline mode

---

## 📌 Roadmap

- [ ] Native Salesforce integration
- [ ] Unified UC2 dashboard (Block 1 + Block 2)
- [ ] Multi-marketplace support (eBay, Cdiscount, Etsy)
- [ ] Self-calibrating AI confidence score
- [ ] LinkedIn decision-maker enrichment
- [ ] Predictive GMV per seller (AI)
