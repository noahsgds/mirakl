# Scraper Runner — Railway

Service long-running qui écoute la table `public.scraping_jobs` dans Supabase
et exécute `scraper.py` à chaque nouveau job.

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Dashboard      │      │                  │      │  Runner         │
│  (Vercel)       │──────►  Supabase        ◄──────│  (Railway)      │
│                 │ INSERT│  scraping_jobs   │POLL  │                 │
│  [Scraper 🛍️]   │      │  status=pending  │      │  runner.py      │
└─────────────────┘      └──────────────────┘      └────────┬────────┘
                                                             │ exec
                                                             ▼
                                                   ┌─────────────────┐
                                                   │  scraper.py     │
                                                   │  --category X   │
                                                   │  --count N      │
                                                   └────────┬────────┘
                                                            │ INSERT
                                                            ▼
                                                   ┌─────────────────┐
                                                   │  amazon_sellers │
                                                   └─────────────────┘
```

Dashboard et runner ne se parlent **jamais directement** — toute la
coordination passe par Supabase. Ils peuvent donc vivre sur des comptes
Git/hébergeurs différents.

---

## Déploiement Railway — pas à pas

### Cas A — Le compte Railway = ton compte GitHub

1. Railway → **New Project** → **Deploy from GitHub repo** → choisis `mirakl`
2. Settings → **Root Directory** = `runner`
3. Settings → **Variables** : copie le contenu de `.env.example` et colle
   les vraies valeurs (URL + key Supabase du projet `mirakl-hackathon`)
4. Deploy — Railway détecte le `Dockerfile` et build automatiquement
5. Vérifie les logs : `Runner starting — polling https://…`

### Cas B — Le compte Railway est sur un autre GitHub que celui du code

Le plus simple : créer un repo sur le compte GitHub lié à Railway et y pusher.

```bash
# Depuis ta machine, dans le dépôt mirakl-repo
git remote add railway git@github.com:<user-railway>/<repo>.git
git push railway claude/mirakl-campaign-dashboard-qCmaU:main
```

Puis dans Railway : **New Project** → **Deploy from GitHub repo** →
sélectionne `<user-railway>/<repo>` → branche `main` → **Root Directory** = `runner`.

À chaque modification, push sur les deux remotes :
```bash
git push origin claude/mirakl-campaign-dashboard-qCmaU
git push railway claude/mirakl-campaign-dashboard-qCmaU:main
```

### Cas C — Deploy direct via Railway CLI (sans GitHub)

```bash
npm i -g @railway/cli
railway login
cd runner
railway link    # choisis le projet Railway
railway up      # upload & deploy
```

Pas d'auto-deploy sur git push — à re-run à chaque modif.

---

## Variables d'environnement

| Nom | Requis | Défaut | Description |
|-----|--------|--------|-------------|
| `SUPABASE_URL` | non | hardcodé (projet mirakl-hackathon) | URL projet Supabase |
| `SUPABASE_KEY` | non | hardcodé (anon key) | Clé API Supabase (anon suffit) |
| `POLL_SECONDS` | non | `15` | Fréquence de poll `scraping_jobs` |
| `SCRAPER_HEADLESS` | auto | `1` | Déjà défini dans le Dockerfile |
| `CHROME_BIN` | auto | `/usr/bin/google-chrome` | Déjà défini dans le Dockerfile |

Voir `.env.example` pour le gabarit complet.

---

## Vérifier que ça tourne

Dans les logs Railway, tu dois voir :

```
Runner starting — polling https://ltuarofidogdjhzosboe.supabase.co/rest/v1/scraping_jobs every 15s
```

Puis, dès qu'un job est créé par le dashboard :

```
▶ Job 8d4f… | category=mode target=500 parallel=4
  ▶ Running: /usr/local/bin/python -u /app/scraper.py --count 500 --parallel 4 --category mode
```

---

## Catégories supportées

`mode`, `beaute`, `maison`, `sport`, `enfant`, `electronique`, `culture`,
`bricolage`, `all` (les 8 enchaînées).

Si une valeur inconnue arrive dans `scraping_jobs.category`, le runner
fallback sur `mode` avec un warning dans les logs.

---

## Debug local

```bash
cd runner
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # puis édite si besoin
export $(cat .env | xargs)
python -u runner.py
```

Puis côté dashboard, clique "Scraper" sur une catégorie — ton runner local
prend le job et tourne sur ton Chrome local (attention :
`SCRAPER_HEADLESS=0` pour voir ce qui se passe).

---

## Flux complet (rappel)

```
Dashboard "Lancer"
   └─► INSERT scraping_jobs (status=pending, category, target_count, parallel)
          └─► Runner (poll 15s)
                 ├─► UPDATE status=running, started_at=now
                 ├─► exec scraper.py --category X --count N --parallel M
                 │     ├─► Phase A: search queries de la catégorie → ASINs
                 │     ├─► Phase B: offer listings → seller IDs tiers
                 │     └─► Phase C: enrichment + INSERT amazon_sellers
                 └─► UPDATE status=success, sellers_scraped=N, finished_at=now
```

Le dashboard affiche l'avancement en realtime via Supabase channels
(`postgres_changes` sur `scraping_jobs`).
