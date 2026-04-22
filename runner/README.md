# Scraper Runner — Railway

Ce service écoute la table `public.scraping_jobs` dans Supabase et lance
`scraper.py` quand un job passe en `pending`.

## Déploiement Railway

1. Railway → New Project → Deploy from GitHub repo → `noahsgds/mirakl`
2. Settings → **Root Directory** = `runner`
3. Railway détecte automatiquement le `Dockerfile`
4. Variables (optionnelles, des défauts sont fournis) :
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (anon key OK)
   - `POLL_SECONDS` (défaut 15)
5. Deploy

## Flux

```
Dashboard (clic "Lancer")
   └─► INSERT public.scraping_jobs (status=pending)
          └─► Runner (poll 15s) détecte le job
                 ├─► UPDATE status=running
                 ├─► exec scraper.py --count N --parallel M
                 │     └─► INSERT public.amazon_sellers (dédupliqué)
                 └─► UPDATE status=success | sellers_scraped=N | finished_at=…
```

Le dashboard affiche l'avancement en realtime via Supabase channels.
