# Parallels — Shopify SAAS (Ecommerce Growth Intelligence)

Full-stack platform that unifies **Shopify**, **Meta Ads**, **Google Ads**, and **Google Analytics (GA4)** for D2C brands. Single dashboard, conversion reports, location analytics, D2C calculator, festival calendar, creatives library, and more.

---

## Documentation

**[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** — Full reference:

- **Database schemas** — All 13 Mongoose models (User, Brand, Order, AdMetrics, Product, Customer, Subscription, FestivalDate, ScrapedBrand, ScrapedAdDetail, CityMetadata, D2CCalculator, BrandPerformance) with fields and indexes
- **API reference** — All routes under `/api` (auth, brands, summary, Shopify, analytics, Meta, Google, segment, report, highlights, setup, performance, cache, creatives, D2C calculator, scraping, festival dates, pricing, master dashboard, etc.)
- **Frontend routes & features** — Every app route and what it does
- **Current features** — Auth, brands, summary dashboard, Shopify, webhooks, GA4, location analytics, Meta/Google reports, segment, D2C calculator, followed brands, festival calendar, and more
- **Environment variables** — Server `.env` guidance
- **Project guidance & examples** — Adding APIs, models, using summary APIs, location analytics, AdMetrics

---

## Architecture

| Layer | Stack |
|-------|--------|
| **Frontend** | React, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui, Recharts, Redux (persist), Axios |
| **Backend** | Node.js, Express, MongoDB (Mongoose), Redis (BullMQ), Socket.IO |
| **Integrations** | Shopify API, Meta Graph API, Google Ads API, Google Analytics Data API, Zoho, Apify (scraping) |

---

## Quick Start

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB
- (Optional) Redis for background workers

### Backend

```bash
cd server
npm install
```

Create `server/.env` with at least:

- `PORT=5000`
- `MONGO_URI=mongodb://localhost:27017/your_db`
- `JWT_SECRET=your_secret`

See [PROJECT_DOCUMENTATION.md § Environment Variables](./PROJECT_DOCUMENTATION.md#7-environment-variables-server) for integration keys (Google, Shopify, Zoho, etc.).

```bash
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. API base: `http://localhost:5000` (or your `PORT`).

### Optional: Redis & worker

```bash
# In server/
npm run dev:redis        # Start Redis (Docker)
npm run dev:worker       # Run metrics worker
```

---

## Main features (summary)

- **Auth:** Email/password, Google, Shopify OAuth; JWT; token refresh
- **Brands:** Multi-brand; connect Meta, Google Ads, GA4, Shopify per brand
- **Dashboard:** Performance overview (Meta, Google Ads, Shopify, GA4) with period comparison and accordion table
- **Shopify:** Revenue, AOV, payment orders (COD/prepaid), refunds, customers sync/export
- **Reports:** Ecommerce reports, monthly ad metrics, conversion reports (GA4 dimensions), Meta/Google segment reports
- **Location analytics:** Sales by metro/tier/region using orders + city metadata
- **D2C calculator:** Revenue, costs, COGS, EBITDA-style metrics
- **Festival calendar:** Holiday/festival dates (CRUD, Calendarific)
- **Followed brands:** Scraped competitor pages and ad creatives
- **Creatives library:** Meta ad creatives
- **Master dashboard:** Aggregated metrics across brands
- **Pricing:** Shopify billing integration; Zoho tickets

---

## Assumptions

1. Backend is Express with JWT auth; MongoDB for persistence.
2. Frontend uses Vite, React Router, and the existing axios/credential setup for API calls.
3. Shopify, Meta, and Google credentials are configured per environment.
4. Sensitive keys live in `.env`; do not commit them.
5. In production, CORS and cookie domain are set for your frontend origin.

For full schemas, API list, and guidance, use **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)**.
