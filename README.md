# 🎯 UC2 — Amazon FR → Zalando
## Hackathon Mirakl | Eugenia School

> Pipeline automatisé qui détecte, score, enrichit et recrute les meilleurs vendeurs Amazon FR pour la marketplace Zalando via Mirakl Connect.

**Présenté à** : Juliette Pichard, Sr VP Global Sales Acceleration  
**Stack** : N8N + OpenAI GPT-4o + Supabase + Apollo + Clay + Brevo  
**Rôle dans UC2** : 50% du projet (bloc Amazon FR → Zalando)

---

## 🎯 Contexte & Enjeux

Les BDR Mirakl Connect identifient manuellement des vendeurs Amazon FR pertinents pour Zalando.

**Problème :**
- Processus manuel = lent, coûteux, non scalable
- 1 BDR = ~10 vendeurs analysés/semaine
- Scoring subjectif, non justifiable

**Notre solution :**
- 109 vendeurs scorés automatiquement
- 5 secondes par vendeur vs plusieurs jours
- 80% de réduction de charge BDR
- Score 100% explicable sur 5 critères

---

## 👥 Équipe

| Rôle | Prénom | Responsabilités |
|------|--------|-----------------|
| CEO / Coordinateur | Noah | Architecture, prompts OpenAI, pitch jury |
| CDO / Scraping | Victorien | Scraping Amazon FR, enrichissement, base |
| CAIO / AI Agent | Jahdiel | Agent scoring, logique matching, JSON |

---

## 🏗️ Architecture — 6 Workflows

```
Workflow 1 → Filtrage & Déduplication
     ↓       (scheduler toutes les 5 min)
Workflow 2 → Agent DUST Scoring (GPT-4o)
     ↓       (score sur 5 critères Mirakl)
Workflow 3 → Enrichissement Décideur
     ↓       (Apollo + Clay)
Workflow 4 → Génération Emails par IA
     ↓       (GPT-4o, 3 emails/vendeur)
Workflow 5 → Séquence Brevo J0 / J+3 / J+6
     ↓       (envoi automatisé)
Workflow 6 → Tracking Brevo (Webhook)
             (temps réel : open/clic/réponse)
```

---

## ⚙️ Stack Technique

| Outil | Version | Rôle |
|-------|---------|------|
| N8N Cloud | v1.88 | Orchestration 6 workflows |
| OpenAI GPT-4o | gpt-4o-2024-11-20 | Scoring IA + génération emails |
| Supabase | v2.x (PostgreSQL 15) | Base de données + API REST |
| Apollo | API v2 | Enrichissement email décideur |
| Clay | Enterprise | Enrichissement entreprise |
| Brevo | API v3 | Envoi emails + tracking événements |

---

## 🕷️ Module 0 — Amazon FR Seller Scraper

**Fichier** : `scraper/amazon_scraper_v4.py`  
**Langage** : Python 3.11  
**Rôle** : Collecte automatisée des vendeurs tiers Amazon FR et alimentation de la table `amazon_sellers` dans Supabase.

---

### Ce que fait le scraper

Notre pipeline commence par une question simple :  
**"Quels vendeurs Amazon FR valent la peine d'être contactés pour Zalando ?"**

Le scraper répond à cette question automatiquement en 4 étapes :

**1. Il cherche des produits Amazon FR**  
→ Lance 60+ recherches mode/sport/lifestyle sur Amazon FR  
→ Récupère les ASINs des produits trouvés  
→ Ex : "robe femme", "jean homme", "running femme"...

**2. Il identifie les vendeurs TIERS uniquement**  
→ Pour chaque produit, ouvre la page "Toutes les offres"  
→ Extrait uniquement les vendeurs indépendants  
→ Filtre automatiquement Amazon lui-même

**3. Il enrichit chaque vendeur**  
→ Visite le profil `/sp?seller=ID` de chaque vendeur  
→ Collecte : nom, note, avis, pays, catalogue, prix, infos légales, présence FBA  
→ Vérifie si le vendeur est déjà sur Zalando

**4. Il alimente Supabase**  
→ Pousse les données dans la table `amazon_sellers`  
→ Sauvegarde un CSV propre pour la présentation  
→ Déduplication automatique (pas de doublons)

---

### En chiffres

| Métrique | Valeur |
|----------|--------|
| Vendeurs collectés | **109** |
| Temps par vendeur | **~5 secondes** |
| Requêtes couvertes | **60+ catégories** |
| Données par vendeur | **25+ champs** |

---

### Ce qu'il passe au Workflow 1

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
    Workflow 1 prend le relais
```

---

### Stratégie en 4 Phases

```
Phase A → Collecte ASINs depuis les pages
          de recherche Amazon FR
          (60+ requêtes mode/sport/lifestyle)
     ↓
Phase B → Extraction des seller IDs tiers
          depuis les pages "toutes les offres"
          (garantit : 0 vendeur Amazon direct)
     ↓
Phase C → Enrichissement via /sp?seller=ID
          (nom, note, avis, pays, infos légales,
          catalogue, prix, FBA, marques)
     ↓
Phase D → Vérification présence Zalando (HTTP)
          + Push Supabase + export CSV
```

---

### Stack Technique Scraper

| Outil | Version | Rôle |
|-------|---------|------|
| Python | 3.11 | Runtime |
| undetected-chromedriver | 3.x | Anti-bot Chrome |
| BeautifulSoup4 | 4.12 | Parsing HTML |
| Selenium | 4.x | Automation navigateur |
| Pandas | 2.x | Export CSV |
| Requests | 2.x | HTTP direct (Zalando check) |
| Supabase REST API | v1 | Push données |

---

### Données Collectées par Vendeur

```
# Identité
amazon_seller_id, seller_name, seller_url, country

# Infos légales (section vendeur Amazon)
business_name, business_type
trade_register_number, vat_number
phone, email, business_address

# Métriques Amazon
nb_products, rating, nb_reviews
positive_feedback_pct, avg_price
min_price, max_price, nb_sales_30d
years_on_amazon, is_fba, top_brands

# Présence Zalando
on_zalando (bool), zalando_url
```

---

### Filtres Qualité Appliqués

```python
FILTER_MIN_RATING   = 4.0   # Note Amazon minimum
FILTER_MIN_PRODUCTS = 10    # Catalogue minimum
# Exclusion automatique des IDs Amazon direct
AMAZON_IDS = {"A13V1IB3VIYZZH", ...}
```

---

### Lancement

```bash
# Installation
pip install undetected-chromedriver beautifulsoup4 \
            selenium pandas requests supabase

# Usage basique (20 vendeurs)
python amazon_scraper_v4.py --count 20

# Usage hackathon (109 vendeurs, 4 Chrome parallèles)
python amazon_scraper_v4.py --count 109 --parallel 4

# Sans déduplication Supabase
python amazon_scraper_v4.py --count 50 --no-dedup
```

---

### Output

```
output/
├── amazon_sellers_YYYYMMDD_HHMM.csv  ← données brutes
├── latest.csv                         ← dernière collecte
└── latest_clean.csv                   ← version présentation FR
```

**→ Push automatique dans Supabase** : `amazon_sellers` (upsert sur `seller_url`)

---

### ⚠️ Points de Fragilité du Scraper

- Dépend du layout HTML Amazon FR (changements possibles sans préavis)
- Rate limiting Amazon (délais aléatoires 1-3s intégrés)
- Nécessite Chrome installé localement
- Clé Supabase hardcodée → à externaliser en variable d'environnement

---

## WORKFLOW 1 — Filtrage & Déduplication

**Rôle** : Détecte les nouveaux vendeurs Amazon scrappés et applique les filtres qualité Zalando.  
**Fréquence** : Toutes les 5 minutes  
**Entrée** : Table `amazon_sellers` (first_filter = true)  
**Sortie** : Table `seller_qualification` → statut `A_SCORER` ou `REJETE_FILTRE`

<img width="2141" height="637" alt="Capture d&#39;écran 2026-04-23 170957" src="https://github.com/user-attachments/assets/d0aa5d4e-7ab9-44ee-96fc-9cbc9db3e7e9" />


### Filtres Qualité Zalando

| Critère | Seuil |
|---------|-------|
| Catégorie | Mode / Sport / Lifestyle |
| Note Amazon | ≥ 4.0 |
| Catalogue | ≥ 20 produits |

### Nœuds

1. **Trigger 5min** → scheduler automatique
2. **Supabase GET** → vendeurs (first_filter = true)
3. **Supabase vérification doublon** → déduplication
4. **IF doublon détecté** → stop si déjà traité
5. **SplitInBatches** → traitement unitaire
6. **Code filtrage qualité** → applique les 3 seuils
7. **IF passe les filtres** → routing A_SCORER / KO
8. **INSERT seller_qualification** → sauvegarde statut

---

## WORKFLOW 2 — Agent DUST Scoring

**Rôle** : Score automatiquement chaque vendeur Amazon avec GPT-4o sur 5 critères Mirakl.  
**Entrée** : Vendeurs `statut = A_SCORER AND score_total IS NULL`  
**Sortie** : `score_total`, `recommandation`, `angle_approche` mis à jour dans Supabase

<img width="2162" height="693" alt="Capture d&#39;écran 2026-04-23 171041" src="https://github.com/user-attachments/assets/5ba729db-1ff0-4087-b908-f4e34fd2e492" />


### Grille de Scoring — 5 Critères Mirakl

| Critère | Points | Description |
|---------|--------|-------------|
| Alignement Catégorie | 25 pts | Fit mode/sport Zalando |
| Qualité Vendeur | 25 pts | Note + nb avis Amazon |
| Taille Catalogue | 20 pts | Nb SKU (seuil : 20 min) |
| Prix Moyen | 15 pts | Cohérence gamme tarifaire |
| Dépendance Canal | 15 pts | Risque Amazon-only |

### Routing Décisionnel

| Score | Statut | Action |
|-------|--------|--------|
| ≥ 70 | QUALIFIE | Email priorité haute |
| 50-69 | A_REVOIR | Email approche prudente |
| < 50 | REJETE | Archivé, exclu campagnes |

### Sortie JSON GPT-4o

```json
{
  "score_total": 75,
  "recommandation": "QUALIFIE",
  "angle_approche": "Catalogue 150 SKUs aligné Zalando",
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

### Nœuds

1. **Trigger Workflow 2** → déclenché par Workflow 1
2. **Supabase GET** → vendeurs A_SCORER sans score
3. **SplitInBatches** → traitement un par un
4. **Message a model** → appel GPT-4o (scoring)
5. **Code JavaScript** → parse JSON réponse IA
6. **HTTP Request PATCH** → sauvegarde score Supabase
7. **IF Score ≥ 50** → routing qualifié / rejeté
8. **PATCH REJETE** → archivage vendeurs < 50

---

## WORKFLOW 3 — Enrichissement Décideur

**Rôle** : Identifie et enrichit les coordonnées du décideur pour chaque vendeur qualifié via Apollo et Clay.  
**Entrée** : Vendeurs `statut = scored`  
**Sortie** : `seller_qualification.statut = enriched` + email décideur sauvegardé

<img width="2163" height="519" alt="Capture d&#39;écran 2026-04-23 171118" src="https://github.com/user-attachments/assets/a71138c2-c1c0-4b1e-8d46-df0873d452d4" />


### Sources d'Enrichissement

| Source | Rôle |
|--------|------|
| Apollo Search v2 | Recherche email par domaine |
| Apollo Match | Vérification email trouvé |
| Clay Enterprise | Enrichissement entreprise |
| Mode Manuel | Fallback si APIs échouent |

### Nœuds Clés

1. **HTTP Request** → scrape page vendeur Amazon
2. **Code** → extraction domaine officiel
3. **IF domaine trouvé** → routing enrichissement
4. **Apollo Search v2** → recherche email décideur
5. **Wait 2s** → respect rate limit Apollo
6. **Apollo Match** → confirmation email valide
7. **Switch Mode** → Apollo / Clay / Manuel
8. **Clay enrichissement** → données entreprise
9. **IF Email trouvé** → validation finale
10. **PATCH seller_qualification** → sauvegarde

---

## WORKFLOW 4 — Génération Emails par IA

**Rôle** : Génère 3 emails hyper-personnalisés par vendeur via GPT-4o.  
**Entrée** : `seller_qualification.statut = enriched`  
**Sortie** : 3 emails sauvegardés dans `seller_emails` + statut → `emails_generés`

<img width="2239" height="1036" alt="Capture d&#39;écran 2026-04-23 171216" src="https://github.com/user-attachments/assets/cd493892-fe68-4ea1-b760-68aefac0100f" />


### Emails Générés

| Email | Timing | Objectif |
|-------|--------|----------|
| Mail 1 | J0 | Approche initiale (angle_approche) |
| Mail 2 | J+3 | Relance alternative |
| Mail 3 | J+6 | Email de conclusion |

### Nœuds Clés

1. **Webhook / Trigger** → lancement génération
2. **Code Build query** → filtre vendeurs enrichis
3. **IF vendeurs à emailer** → vérification
4. **SplitInBatches** → traitement unitaire
5. **Set Config génération** → paramètres IA
6. **Code Fetch templates** → 3 templates Supabase
7. **Code Calcul métriques & langue** → contexte vendeur
8. **GPT-4o** → génération 3 emails personnalisés
9. **Code Parse emails** → extraction JSON
10. **IF génération OK** → validation
11. **INSERT seller_emails** → sauvegarde emails
12. **PATCH Template times_used** → tracking usage
13. **PATCH statut emails_generés** → mise à jour

---

## WORKFLOW 5 — Séquence Brevo J0 / J+3 / J+6

**Rôle** : Envoie automatiquement la séquence de 3 emails via Brevo avec délais programmés.  
**Entrée** : `seller_qualification.statut = emails_generés`  
**Sortie** : `seller_sequence` mis à jour + séquence email complète envoyée

<img width="2373" height="532" alt="Capture d&#39;écran 2026-04-23 171301" src="https://github.com/user-attachments/assets/d8ec31bf-5e68-4fe5-9e1f-c3da9930696e" />


### Séquence d'Envoi

```
J0   → Mail 1 envoyé immédiatement
J+3  → Mail 2 si pas de réponse
J+6  → Mail 3 (email de conclusion)
```

### Nœuds Clés

1. **Webhook / Trigger** → lancement séquence
2. **Code Build query** → filtre vendeurs prêts
3. **IF vendeurs à envoyer** → vérification
4. **SplitInBatches** → traitement unitaire
5. **Brevo Créer contact** → inscription liste
6. **INSERT seller_sequence** → initialisation tracking
7. **Brevo Envoi Mail 1 (J0)** → envoi immédiat
8. **PATCH sequence_en_cours** → statut Supabase
9. **Wait J+3** → attente 3 jours
10. **Code Recharge données** → refresh vendeur
11. **PATCH sequence step 2** → mise à jour
12. **Brevo Envoi Mail 2 (J+3)** → relance
13. **Wait J+3** → attente 3 jours supplémentaires
14. **Brevo Envoi Mail 3 (J+6)** → conclusion
15. **PATCH sequence_terminée** → clôture séquence

---

## WORKFLOW 6 — Tracking Brevo (Webhook)

**Rôle** : Reçoit les événements Brevo en temps réel et met à jour le statut du lead dans Supabase.  
**Entrée** : Webhook Brevo (POST à chaque événement)  
**Sortie** : `seller_qualification` + `seller_sequence` mis à jour en temps réel

<img width="2143" height="523" alt="Capture d&#39;écran 2026-04-23 171341" src="https://github.com/user-attachments/assets/3360b5f2-3e0b-451d-bbbb-30ce0b7109bd" />


### Événements Trackés

| Événement | Action | Statut |
|-----------|--------|--------|
| opened | opened_count +1 | — |
| clicked | clicked_count +1 | HOT 🔥 |
| replied | replied = true | REPLIED 💬 |
| bounce | bounced = true | BOUNCE ❌ |

### Nœuds

1. **Webhook Brevo Events** → point d'entrée
2. **Code Parse événement** → seller_id + event_type
3. **IF Seller ID trouvé** → validation
4. **Code Build PATCH payload** → construction JSON
5. **PATCH seller_sequence** → mise à jour compteurs
6. **IF Mettre à jour qualification** → filtre significatif
7. **PATCH seller_qualification** → HOT/REPLIED/BOUNCE

---

## 🗄️ Structure Base de Données

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
angle_approche    TEXT   -- pitch personnalisé
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
sequence_step     INT    -- 1, 2 ou 3
```

---

## 📧 Exemple Email Généré — UC2 Spécifique

### Vendeur analysé : MoveWear Studio

**Signaux détectés par le pipeline :**

| Signal détecté | Valeur | Impact sur l'email |
|---------------|--------|-------------------|
| Catalogue sport | 26 produits | → Angle "croissance catalogue" |
| Note Amazon | 4.6/5 | → Preuve de qualité mentionnée |
| Contexte | amazon_only | → Argument diversification canal |
| Score Mirakl | 78/100 | → Classé QUALIFIE priorité haute |
| Langue détectée | Français | → Email généré en FR |

---

### Mail 1 — J0 (Premier contact)

**Objet** : `Étendre votre succès MoveWear Studio sur Zalando`

> **Annotation** : L'objet utilise le nom exact du vendeur
> [signal : seller_name] + la marketplace cible
> [signal : recommandation = QUALIFIE pour Zalando]

**Corps :**

> MoveWear Studio, fort de votre catalogue de 26 produits
> [← signal : nb_products] et d'une note Amazon
> exceptionnelle de 4.6/5 [← signal : rating],
> vous avez un potentiel de croissance énorme.
>
> En rejoignant Zalando, vous pourriez augmenter votre GMV
> de 30% [← signal : contexte_detecte = amazon_only
> → argument diversification canal].
>
> Discutons de cette opportunité lors d'un appel de 20 minutes.

**[Planifier un appel]**

*Jean Dupont — Partner Manager, Mirakl Connect*

---

### Mail 2 — J+3 (Relance)

**Objet** : `MoveWear Studio x Zalando : une opportunité renouvelée`

> **Annotation** : Ton différent du Mail 1 — approche "partenariat"
> vs "croissance" [signal : ab_variant = template_2]

---

### Mail 3 — J+6 (Conclusion)

**Objet** : `Dernière chance pour MoveWear Studio...`

> **Annotation** : Urgence douce — dernier email de la séquence
> [signal : sequence_step = 3]

---

### Comment le pipeline personnalise chaque email

```
Données brutes Amazon FR
        ↓
[WF1] Filtrage qualité (note ≥ 4.0, catalogue ≥ 20)
        ↓
[WF2] GPT-4o scoring → angle_approche détecté
      ex : "amazon_only" → argument diversification
        ↓
[WF3] Enrichissement décideur (Apollo)
      → decision_maker_name, email
        ↓
[WF4] GPT-4o génération
      → seller_name + nb_products + rating
      + angle_approche + marketplace_cible
      = Email 100% personnalisé
        ↓
[WF5] Brevo → envoi J0 / J+3 / J+6
        ↓
[WF6] Tracking → HOT si clic / REPLIED si réponse
```

---

## 📈 Résultats

| Métrique | Valeur |
|----------|--------|
| Vendeurs scorés | 109 automatiquement |
| Temps par vendeur | ~5 secondes |
| Distribution scores | 31 → 86/100 |
| Réduction charge BDR | ~80% |
| Exécutions en production | **707** |
| Taux de succès | **99.9%** |
| Temps moyen d'exécution | **0.86s** |

---

## 🔧 Configuration & Déploiement

### Prérequis

- Compte N8N Cloud actif
- Clé API OpenAI (GPT-4o)
- Projet Supabase configuré
- Compte Apollo (enrichissement)
- Compte Clay Enterprise
- Compte Brevo + webhook configuré

### Variables d'Environnement N8N

```bash
SUPABASE_URL=https://[project].supabase.co
SUPABASE_API_KEY=[anon_key]
OPENAI_API_KEY=[sk-...]
APOLLO_API_KEY=[...]
CLAY_API_KEY=[...]
BREVO_API_KEY=[...]
```

### Variables d'Environnement Scraper

```bash
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=[anon_key]
```

### Import & Activation

```
1. Importer les 6 fichiers JSON dans N8N
2. Configurer les credentials
3. Activer dans l'ordre :
   WF1 → WF2 → WF3 → WF4 → WF5 → WF6
```

---

## 🚀 Monitoring Pipeline

```sql
-- Vue temps réel
SELECT statut, COUNT(*), ROUND(AVG(score_total), 1)
FROM amazon_sellers
GROUP BY statut;

-- Top vendeurs qualifiés
SELECT seller_name, score_total,
       recommandation, angle_approche
FROM amazon_sellers
WHERE score_total >= 50
ORDER BY score_total DESC;

-- Suivi séquence email
SELECT statut, COUNT(*)
FROM seller_qualification
GROUP BY statut;
```

---

## ⚠️ Limites Connues & Points de Fragilité

### Pipeline N8N
- **Autosave multi-utilisateurs** : conflits si 2 devs éditent simultanément → travailler en solo sur les nodes critiques
- **Coût GPT-4o** : variable selon longueur HTML généré → prévoir ~0.02€/vendeur pour mise à l'échelle
- **Rate limit Apollo** : 200 requêtes/jour en plan gratuit → upgrade nécessaire pour volume > 200 vendeurs/jour
- **Wait nodes Brevo (J+3/J+6)** : N8N Cloud maintient l'exécution active → surveiller les timeouts longs

### Données & Qualité
- **Scraper Amazon** : dépend du layout HTML → fragile si Amazon modifie sa structure
- **Enrichissement décideur** : ~70% de taux de succès Apollo → 30% nécessitent fallback manuel
- **Score IA** : basé sur données Amazon uniquement → ne tient pas compte du catalogue réel Zalando

### Infrastructure
- **Supabase free tier** : 500 MB storage, 2 GB bandwidth → suffisant pour hackathon, upgrade nécessaire en prod
- **N8N Cloud** : dépendant de la connexion internet → pas de mode offline

---

## 📌 Roadmap

- [ ] Intégration Salesforce native
- [ ] Dashboard unifié UC2 (Bloc 1 + Bloc 2)
- [ ] Multi-marketplace (eBay, Cdiscount, Etsy)
- [ ] Score de confiance IA auto-calibré
- [ ] Enrichissement LinkedIn décideurs
- [ ] GMV prédictif par vendeur (IA)
