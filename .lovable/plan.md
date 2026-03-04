
# Haiko DMV Platform — Phase 1 MVP

## Overview
An internal tool for Haiko staff (Gunhild & Simen) to conduct Drone Maturity Assessments for Norwegian municipalities. The platform pulls municipality data from KOSTRA/SSB, stores drone and training provider databases, runs a scoring engine across 5 dimensions, and exports professional PDF reports.

## Backend (Supabase)
### Database Tables
- **municipalities** — KOSTRA data for all 357 Norwegian municipalities (population, area, budgets, staffing, building stock, fire preparedness, industry structure)
- **drone_platforms** — 30+ drone models with specs (type, class, payload, range, wind/temp tolerance, IP rating, price, distributor, use cases)
- **training_providers** — Norwegian drone schools with courses, certifications, prices, formats, locations
- **regulatory_rules** — EASA/CAA rules stored as structured data (SAIL levels, OSO requirements, GRC/ARC values, STS parameters)
- **assessments** — DMV assessments linked to a municipality, created by Haiko staff
- **assessment_answers** — Individual question scores (0–4) per assessment, linked to dimensions
- **use_case_evaluations** — Per-assessment results for each of the 37 use cases (feasibility, ROI, regulatory complexity, recommended platforms, cost)
- **reports** — Generated report metadata and status
- **service_pricing** — Configurable Haiko service fees

### Auth & Roles
- Supabase Auth for Haiko staff login (email/password)
- Admin role for Gunhild and Simen

### Edge Functions
- **kostra-fetch** — Daily pull from SSB's open JSON-stat API for municipality data, stores/updates in the municipalities table
- **regulatory-scrape** — Fetches EASA/CAA pages, diffs against stored rules, logs changes
- **drone-scrape** — Attempts to pull pricing/specs from manufacturer sites
- **training-scrape** — Fetches course info from known provider websites

## Frontend Pages

### 1. Dashboard
- Overview of active/completed assessments
- Alerts panel showing recent data changes (KOSTRA updates, regulatory changes, price changes)
- Quick-start button to begin a new DMV assessment

### 2. Municipality Browser
- Searchable list of all 357 municipalities with key KOSTRA stats
- Municipality detail view showing full data profile (population, area, budgets, staffing, fire service, building stock, geography)
- Data freshness indicator showing last KOSTRA update

### 3. DMV Assessment Workflow
- Select a municipality → auto-populates KOSTRA data
- Questionnaire with 40 questions across 5 dimensions (Strategy & Leadership, Regulatory Maturity, Operational Capacity, Organisational Integration, Ecosystem & Financing)
- Each question scored 0–4 with contextual guidance
- Auto-save progress, resume later
- Live scoring sidebar showing dimension scores and total DMV score as you fill in

### 4. Scoring & Results View
- Radar chart showing 5 dimension scores
- Total DMV score (0–100) with maturity level (1–4)
- Per-dimension breakdown with gap analysis
- 37 use case evaluation table showing: technical feasibility, estimated ROI, regulatory complexity (SAIL level), recommended drone platforms, estimated implementation cost
- Top 5–10 recommended use cases highlighted

### 5. Report Preview & Export
- Full report rendered as a styled web page with Haiko branding (all 9 sections from the PRD)
- Browser print-to-PDF export with print-optimized CSS
- Sections: Municipality Profile, DMV Score Overview (radar chart), Per-dimension Analysis, Use Case Analysis, Recommended Drone Park, Training Pathway, Regulatory Roadmap, Cost Overview, Recommended Next Steps

### 6. Admin Panel
- **Drone Database Manager** — CRUD interface for drone platforms with all spec fields
- **Training Provider Manager** — CRUD for training schools and courses
- **Regulatory Rules Manager** — View/edit regulatory parameters, see change log from scraping
- **Service Pricing Config** — Edit Haiko service fees and price ranges
- **Data Pipeline Status** — View last run times and results for KOSTRA/regulatory/drone/training fetches

## Scoring Engine Logic
- 40 questions, each scored 0–4
- 5 weighted dimensions (20%, 25%, 20%, 20%, 15%)
- Composite score 0–100 → Maturity Level 1–4
- Per-question recommendations generated based on score + municipality context (size, geography, budget)
- 37 use cases evaluated using drone database + regulatory rules + KOSTRA cost data

## Pricing Engine
- Combines Haiko service fees + matched drone hardware prices + training costs based on planned operator count
- Presents low/medium/high cost range (±15%)
- Pulls live prices from drone and training databases

## Design
- Clean, professional look with Haiko branding
- Norwegian language UI (labels, headings, report content)
- Responsive but desktop-primary (internal tool)
