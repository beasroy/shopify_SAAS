# Project Documentation — Shopify SAAS (Parallels)

Complete reference for schemas, APIs, features, and project guidance.

---

## 1. Project Overview

**Parallels** is a full-stack ecommerce growth intelligence platform that unifies **Shopify**, **Meta (Facebook) Ads**, **Google Ads**, and **Google Analytics (GA4)** data. It helps D2C brands and teams understand, optimize, and scale revenue with a single dashboard, conversion reports, location analytics, and operational tools (D2C calculator, festival calendar, creatives library, etc.).

- **Backend:** Node.js, Express, MongoDB (Mongoose), Redis (BullMQ), Socket.IO  
- **Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui, Recharts, Redux (persist)  
- **Integrations:** Shopify API, Meta Graph API, Google Ads API, Google Analytics Data API, Zoho, Apify (scraping)

---

## 2. Project Structure

```
shopify_SAAS/
├── client/                 # React (Vite) frontend
│   ├── src/
│   │   ├── Auth/           # Login, OAuth (Google, Shopify), callback handlers
│   │   ├── components/     # UI (shadcn), dashboard, tutorial
│   │   ├── context/        # TokenError, ReportsDate
│   │   ├── data/           # Logos, constants
│   │   ├── hooks/          # useSocketConnection, useBrandRefresh, use-toast
│   │   ├── interfaces/     # TypeScript types
│   │   ├── pages/          # All feature pages (see Frontend Routes)
│   │   ├── store/          # Redux slices (brand, tutorial, etc.)
│   │   └── services/       # axiosConfig
│   └── ...
├── server/
│   ├── config/             # db.js, socket.js
│   ├── controller/         # Business logic per domain
│   ├── middleware/         # verifyAuth (JWT)
│   ├── models/             # Mongoose schemas (see Database Schemas)
│   ├── Report/             # MonthlyReport, etc.
│   ├── routes/             # Express routers (see API Reference)
│   ├── services/           # gptService, holidayGeneration, facebookCapi
│   ├── utils/              # refundHelpers, lockUtils, shopifyHelpers
│   ├── workers/            # metricsWorker, cityClassificationWorker
│   ├── cron/               # holidayGenerationCron
│   └── index.js            # App entry, route mounting
└── ...
```

---

## 3. Database Schemas (MongoDB / Mongoose)

All models use `timestamps: true` unless noted.

### 3.1 User

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| username | String | ✓ | |
| email | String | ✓ | unique |
| password | String | | For password method |
| googleLoginRefreshToken | String | | |
| zohoRefreshToken | String | | |
| isClient | Boolean | | default: false |
| isAdmin | Boolean | | default: false |
| method | String | ✓ | enum: `'password' \| 'google' \| 'shopify'` |
| brands | [String] | | ref: Brand |
| loginCount | Number | | default: 0 |

---

### 3.2 Brand (Brands.js)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | String | ✓ | unique |
| fbAdAccounts | [String] | | Meta ad account IDs |
| googleAdAccount | [{ clientId, managerId }] | | |
| ga4Account | { PropertyID } | | Google Analytics 4 |
| shopifyAccount | { shopName, shopifyAccessToken, shopId, currency } | | currency default: 'INR' |
| googleAdsRefreshToken | String | | |
| googleAnalyticsRefreshToken | String | | |
| fbAccessToken | String | | |
| followedBrands | [ObjectId] | | ref: ScrapedBrand |

---

### 3.3 Order

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| orderId | Number | ✓ | index |
| orderCreatedAt | Date | ✓ | index |
| brandId | ObjectId | ✓ | ref: Brand, index |
| totalSales | Number | | default: 0 |
| refundAmount | Number | | default: 0 |
| refundCount | Number | | default: 0 |
| lastRefundAt | Date | | |
| city | String | | |
| state | String | | |
| country | String | | |

**Indexes:** `(brandId, orderCreatedAt)`, `(brandId, orderId)` unique, `(brandId, orderCreatedAt, city)`, `(brandId, orderCreatedAt, city, state)`, `(brandId, orderCreatedAt, city, state, country)`.

---

### 3.4 AdMetrics

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| brandId | ObjectId | ✓ | ref: Brand |
| date | Date | ✓ | |
| totalSales | Number | | default: 0 (Shopify gross revenue) |
| refundAmount | Number | | default: 0 |
| codOrderCount | Number | | default: 0 |
| prepaidOrderCount | Number | | default: 0 |
| metaSpend | Number | | default: 0 |
| metaRevenue | Number | | default: 0 |
| googleSpend | Number | | default: 0 |
| googleROAS | Number | | default: 0 |
| totalSpend | Number | | default: 0 |
| grossROI | Number | | default: 0 |

Used for daily rollups and summary APIs (e.g. Shopify totalSales, refundAmount, ROAS = totalSales / (metaSpend + googleSpend)).

---

### 3.5 Product

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| brandId | ObjectId | ✓ | ref: Brand, index |
| productId | String | ✓ | |
| collectionIds | [String] | | default: [] |
| createdAt | Date | | index |

**Index:** `(brandId, productId)` unique.

---

### 3.6 Customer

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| brandId | ObjectId | ✓ | ref: Brand, index |
| shopifyCustomerId | String | ✓ | index |
| firstName, lastName | String | | default: '' |
| email | String | | index |
| phone | String | | |
| addressLine1, addressLine2 | String | | |
| city, state, pin | String | | |
| totalOrders | Number | | default: 0 |
| defaultAddressId | String | | |

**Indexes:** `(brandId, shopifyCustomerId)` unique, `(brandId, email)`.

---

### 3.7 Subscription

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| shopId | Number | ✓ | index, ref: Brand |
| chargeId | String | | unique, sparse |
| planName | String | | enum: 'Free Plan', 'Startup Plan', 'Growth Plan'; default: 'Free Plan' |
| price | Number | | default: 0 |
| status | String | | enum: active, cancelled, expired, frozen, pending; default: 'active' |
| billingOn | Date | | |
| trialEndsOn | Date | | |

---

### 3.8 FestivalDate

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| brandId | ObjectId | | ref: Brand, required when type === 'brand', index |
| type | String | ✓ | enum: 'global', 'brand'; default: 'brand', index |
| country | String | ✓ | index |
| date | Date | ✓ | |
| festivalName | String | ✓ | |
| description | String | | |
| scope | String | | enum: 'national', 'other'; default: 'national' |

**Indexes:** `(country, date)`, `(type, brandId)` sparse, `(date)`.

---

### 3.9 ScrapedBrand

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| pageId | String | | unique, sparse, index |
| pageName | String | | sparse |
| pageUrl | String | ✓ | unique |

Used for “followed brands” (competitor pages) and ad scraping.

---

### 3.10 ScrapedAdDetail

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| scrapingBrandId | ObjectId | ✓ | ref: ScrapedBrand, index |
| collation_count, collation_id | Number, String | | |
| entity_type | String | | |
| is_active | Boolean | | |
| publisher_platform | [String] | | |
| page_name | String | | |
| snapshot | Mixed | | body, caption, cta_text, images, videos, etc. |
| start_date_formatted, end_date_formatted | String | | |

**Indexes:** `(scrapingBrandId, start_date_formatted)`, `(scrapingBrandId, end_date_formatted)`.

---

### 3.11 CityMetadata

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| lookupKey | String | ✓ | unique, index |
| city | String | ✓ | index |
| state | String | ✓ | index |
| cityNormalized | String | ✓ | index |
| metroStatus | String | | enum: 'metro', 'non-metro', index |
| tier | String | | enum: 'tier1', 'tier2', 'tier3', index |
| region | String | | enum: north, south, east, west, central, other, index |
| isCoastal | Boolean | | default: false, index |
| lastVerifiedAt | Date | | |
| source | String | | enum: 'gpt', 'manual'; default: 'gpt' |
| confidence | Number | | default: 0.9 |
| processingStatus | String | | enum: pending, processing, completed, failed; default: 'pending' |
| processedAt | Date | | |

**Indexes:** `(cityNormalized, state)`, `(metroStatus, region)`, `(processingStatus)`.

---

### 3.12 D2CCalculator

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| brandId | ObjectId | ✓ | ref: Brand, index, unique |
| revenue | Object | | otherRevenue: { amount, frequency }, additionalRevenue: [{ key, amount, frequency }] |
| costAndExpenses | Object | | operatingCost, otherMarketingCost, additionalExpenses (same shape) |
| cogsData | Object | | COGSMultiplier, additionalCOGS |

Sub-doc frequency enum: `'one-time' | 'monthly' | 'quarterly' | 'yearly'`.

---

### 3.13 BrandPerformance

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| brandId | String | ✓ | unique |
| name | String | ✓ | |
| source | String | ✓ | |
| targetSales | Number | ✓ | |
| targetSpend | Number | ✓ | |
| targetROAS | Number | ✓ | |
| targetDate | Date | ✓ | |
| achievedSpent | Number | | |
| achievedSales | Number | | |
| achievedROAS | Number | | |

---

## 4. API Reference

Base path: **`/api`**. Auth: most routes use `verifyAuth` (JWT in cookie/header).

### 4.1 Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /signup | No | Register |
| POST | /login/:type | No | Login (type: password, google, shopify) |
| POST | /logout | No | Logout |
| GET | /google | No | Get Google OAuth URL |
| GET | /google/callback | No | Google OAuth callback |
| GET | /facebook | No | Get Facebook OAuth URL |
| GET | /facebook/callback | No | Facebook OAuth callback |
| PUT | /updateTokens/:type | Yes | Update tokens (Google/FB/Zoho) |
| POST | /shopify | No | Get Shopify auth URL |
| GET | /shopify/callback | No | Shopify OAuth callback |
| GET | /shopify/callback-brand-setup | No | Shopify callback for brand setup |
| GET | /zoho | No | Zoho auth URL |
| GET | /zoho/callback | No | Zoho callback |
| GET | /check-token | No | Check token validity |

---

### 4.2 Brands — `/api/brands`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /add | Yes | Add brand |
| GET | /all | No | List brands |
| GET | /:brandId | Yes | Get brand by ID |
| PATCH | /update/:brandid | Yes | Update brand |
| POST | /filter | Yes | Filter brands |
| GET | /currency/:brandId | Yes | Get brand currency |
| DELETE | /delete/:brandId | Yes | Delete brand |
| PATCH | /platform/:brandId | Yes | Delete platform integration |

---

### 4.3 Summary — `/api/summary`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /facebook-ads/:brandId | Yes | Meta spend/ROAS by period (yesterday, 7/14/30 days, quarterly) |
| GET | /google-ads/:brandId | Yes | Google Ads spend/ROAS by period |
| GET | /shopify/:brandId | Yes | Shopify totalSales, refundAmount, ROAS from AdMetrics |
| GET | /analytics/:brandId | Yes | GA4 sessions, addToCarts, checkouts, purchases, rates |
| GET | /unified/:brandId | Yes | Legacy: all platforms in one response |

---

### 4.4 Shopify — `/api/shopify`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /aov/:brandId | Yes | AOV |
| POST | /revenue/:brandId | Yes | Total revenue |
| GET | /test-graphql-orders/:brandId | Yes | Test GraphQL orders |
| POST | /payment-orders/:brandId | Yes | Monthly payment orders (COD vs prepaid) |
| POST | /monthly-returned-customers/:brandId | Yes | Monthly returned customers |
| POST | /customers/sync/:brandId | Yes | Sync customers from Shopify |
| GET | /customers/:brandId | Yes | List customers |
| GET | /customers/export/:brandId | Yes | Export customers to Excel |
| DELETE | /customers/:brandId | Yes | Delete customers by brand |
| POST | /refunds/:brandId | Yes | Full refund details |

---

### 4.5 Shopify Webhooks — `/` (root) and `/api/shopify/webhooks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /webhooks/shopify/orders/create | Webhook | Order created |
| POST | /webhooks/shopify/refunds/create | Webhook | Refund created |
| POST | /shopify/sync-historical/:brandId | Yes | Sync historical orders |
| GET | /shopify/sync-status/:jobId | Yes | Sync job status |

---

### 4.6 Analytics (GA4) — `/api/analytics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /atcreport/:brandId | Yes | Daily add-to-cart & checkouts |
| POST | /dayAtcReport/:brandId | Yes | Day-wise ATC |
| POST | /monthAtcReport/:brandId | Yes | Monthly ATC |
| POST | /ageReport/:brandId | Yes | Age metrics |
| POST | /genderReport/:brandId | Yes | Gender metrics |
| POST | /locationReport/:brandId | Yes | Location metrics |
| POST | /channelReport/:brandId | Yes | Channel metrics |
| POST | /landingpageReport/:brandId | Yes | Landing page metrics |
| POST | /regionConversionReport/:brandId | Yes | Region conversion |
| POST | /channelConversionReport/:brandId | Yes | Channel conversion |
| POST | /pageConversionReport/:brandId | Yes | Page conversion |
| POST | /genderConversionReport/:brandId | Yes | Gender conversion |
| POST | /deviceTypeConversionReport/:brandId | Yes | Device conversion |
| POST | /ageConversionReport/:brandId | Yes | Age conversion |
| POST | /cityConversionReport/:brandId | Yes | City conversion |
| POST | /interestConversionReport/:brandId | Yes | Interest conversion |
| POST | /campaignConversionReport/:brandId | Yes | Campaign conversion |
| POST | /operatingSystemConversionReport/:brandId | Yes | OS conversion |
| POST | /browserConversionReport/:brandId | Yes | Browser conversion |
| POST | /sourceConversionReport/:brandId | Yes | Source conversion |
| POST | /pagePathMetricsReport/:brandId | Yes | Page path metrics |
| POST | /countryConversionReport/:brandId | Yes | Country conversion |
| POST | /bounceRateReportHome/:brandId | Yes | Bounce rate |

---

### 4.7 Location Analytics — `/api/analytics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /location-sales | No | Query: brandId, dimension (e.g. metro), startDate, endDate |

---

### 4.8 Meta — `/api/meta`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /interest/:brandId | Yes | Interest data |
| POST | /campaign/:brandId | Yes | Campaign data |
| POST | /report/age/:brandId | Yes | Age report |
| POST | /report/gender/:brandId | Yes | Gender report |
| POST | /report/device/:brandId | Yes | Device report |
| POST | /report/country/:brandId | Yes | Country report |
| POST | /report/audience/:brandId | Yes | Audience report |
| POST | /report/platform/:brandId | Yes | Platform report |
| POST | /report/placement/:brandId | Yes | Placement report |

---

### 4.9 Google (Ads / Segment) — `/api/google`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /state/:brandId | Yes | State metrics |
| POST | /searchTerm/:brandId | Yes | Search term metrics |
| POST | /age/:brandId | Yes | Age metrics |
| POST | /gender/:brandId | Yes | Gender metrics |
| POST | /keyword/:brandId | Yes | Keyword metrics |
| POST | /product/:brandId | Yes | Product metrics |

---

### 4.10 Segment Report — `/api/segment`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /productMetrics/:brandId | Yes | Product metrics |
| POST | /brandMetrics/:brandId | Yes | Brand metrics |
| POST | /typeMetrics/:brandId | Yes | Type metrics |
| POST | /categoryMetrics/:brandId | Yes | Category metrics |
| POST | /searchTermMetrics/:brandId | Yes | Search term metrics |
| POST | /ageMetrics/:brandId | Yes | Age metrics |
| POST | /genderMetrics/:brandId | Yes | Gender metrics |
| POST | /searchTerm/:brandId | Yes | Fetch search term metrics |
| POST | /age/:brandId | Yes | Fetch age metrics |
| POST | /gender/:brandId | Yes | Fetch gender metrics |
| POST | /keyword/:brandId | Yes | Fetch keyword metrics |
| POST | /product/:brandId | Yes | Fetch product metrics |

---

### 4.11 Report (Ecommerce / Ad metrics) — `/api/report`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /:brandId | Yes | Metrics by ID |
| DELETE | /delete/byDate | Yes | Delete AdMetrics by date range (query: startDate, endDate) |
| DELETE | /delete/:brandId | Yes | Delete by brand |
| GET | /delete-logs/:brandId | Yes | Delete logs |
| POST | /monthly | Yes | Monthly report |

---

### 4.12 Dashboard Highlights — `/api/highlights`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /marketing/:brandId | Yes | Marketing insights |
| POST | /conversion-funnel/:brandId | Yes | Add-to-cart & checkouts funnel |

---

### 4.13 Setup — `/api/setup`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /google-accounts/:brandId | Yes | Google Ad accounts |
| GET | /ga4-propertyIds/:brandId | Yes | GA4 property IDs |
| GET | /fb-ad-accounts/:brandId | Yes | FB ad account IDs |
| DELETE | /fb-ad-accounts-cache/:brandId | Yes | Clear FB ad account cache |

---

### 4.14 Google Ad Conversion — `/api/googleAd`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /cityConversion/:brandId | Yes | City conversions |

---

### 4.15 Ad Analytics (FB/Google) — `/api/metrics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /fbAd/:brandId | Yes | FB ad account data |
| POST | /googleAdAndCampaign/:brandId | Yes | Google ad & campaign metrics |

---

### 4.16 Brand Performance (Targets) — `/api/performance`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /brandTarget | Yes | Target by brand |
| POST | /addTarget | Yes | Add target |
| PATCH | /updateTarget/:brandId | Yes | Update target |
| DELETE | /deleteTarget/:brandId | Yes | Delete target |
| GET | /metaMetrics/:brandId | Yes | Meta metrics |
| GET | /googleAdMetrics/:brandId | Yes | Google Ad metrics |

---

### 4.17 Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /add-brand | Yes | Add brand to user |
| GET | /getuser/:userId | No | Get user by ID |

---

### 4.18 Zoho — `/api/zoho`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /departments | Yes | Departments |
| GET | /agents | Yes | Agents |
| POST | /create-departments | Yes | Create departments |
| GET | /agentIndepartment/:departmentId | Yes | Agents in department |
| POST | /create-ticket | Yes | Create ticket |
| DELETE | /delete-departments | Yes | Delete departments |

---

### 4.19 App Sync — `/api/app`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /sync-shopify-store | No | App sync (Shopify) |

---

### 4.20 Webhooks (GDPR / lifecycle) — `/api/` (root)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /customers/data_request | Webhook | GDPR data request |
| POST | /customers/redact | Webhook | Customer redact |
| POST | /shop/redact | Webhook | Shop redact |
| POST | /app_subscriptions/update | Webhook | Subscription update |
| POST | /app_uninstalled | Webhook | App uninstalled |
| POST | /refunds/create | Webhook | Refunds created |

---

### 4.21 Pricing — `/api/pricing`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /callback | No | Pricing callback (Shopify) |
| GET | /details/:brandId | Yes | Pricing details |

---

### 4.22 Cache — `/api/cache`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /stats/:cacheName? | Yes | Cache stats |
| DELETE | /clear/:cacheName? | Yes | Clear cache |
| DELETE | /clear/:cacheName/key/:key | Yes | Clear cache key |

---

### 4.23 Creatives — `/api/ads`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /meta-creative/:brandId | Yes | Meta creatives batch |
| DELETE | /meta-creative-cache/:brandId? | Yes | Clear creatives cache |

---

### 4.24 D2C Calculator — `/api/d2c-calculator`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /revenue/:brandId | Yes | Revenue |
| POST | /calculate-metrics/:brandId | Yes | Calculate metrics |
| GET | /last-used-expenditure/:brandId | Yes | Last expenditure |
| GET | /last-landed-cost-for-cogs/:brandId | Yes | Last landed cost for COGS |

---

### 4.25 Scraping / Followed Brands — `/api/scraping`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /fetch | No | Fetch (body) |
| GET | /fetch | No | Fetch (query) |
| GET | /test-saundindia | No | Test |
| POST | /fetch-and-save | No | Fetch and save |
| GET | /brands | No | List scraped brands |
| GET | /ads | No | List ads |
| GET | /brands/:brandId | No | Brand by ID |
| GET | /all | No | All |
| POST | /refresh/:scrapingBrandId | No | Refresh brand |
| POST | /scrape-brand | No | Scrape brand |
| GET | /get-single-ad-from-all-scraped-brands | No | Single ad from all |
| POST | /follow-brand/:brandId | No | Follow brand |
| POST | /unfollow-brand/:brandId | No | Unfollow brand |
| GET | /get-followed-brands/:brandId | No | Get followed brands |

---

### 4.26 Page Speed Insights — `/api/pageSpeedInsights`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | Yes | Get Page Speed Insights (body) |

---

### 4.27 Festival Dates — `/api/festival-dates`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /:brandId | Yes | Get festival dates |
| POST | /generate | Yes | Generate holidays (Calendarific) |
| POST | /:brandId | Yes | Add festival date |
| PATCH | /:festivalDateId | Yes | Update festival date |
| DELETE | /:festivalDateId | Yes | Delete festival date |

---

### 4.28 Product — `/api/product`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /monthly-launched-products/:brandId | Yes | Monthly launched products |

---

### 4.29 Master Dashboard — `/api/masterDashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /brand-metrics | Yes | All brands metrics from DB |
| GET | /fb-ad-data | Yes | FB ad data |
| GET | /google-ad-data | Yes | Google ad data |
| GET | /brand-funnel-metrics | Yes | Brand-wise funnel metrics |
| GET | /meta-sales-summary | Yes | Meta sales summary |

---

## 5. Frontend Routes & Features

| Route | Page | Feature |
|-------|------|---------|
| / | LandingPage | Marketing landing |
| /login | AuthPage | Login / signup (email, Google, Shopify) |
| /dashboard | GeneralDashboard | Main dashboard: summary (Meta, Google, Shopify, GA4), performance table (accordion), conversion funnel, marketing insights, payment orders |
| /admetrics/:brandId | AnalyticsDashboard | Ad metrics by brand |
| /ecommerce-reports/:brandId | ReportsPage | Ecommerce reports |
| /marketing-insights/:brandId | ExcelMetricsPage | Monthly ad metrics (Meta, Google, Shopify), Excel-style view |
| /performance-metrics | PerformanceDashboard | Brand performance targets |
| /segment-dashboard/:brandId | SegmentDashboard | Segment: product, search term, age, gender, keyword metrics |
| /meta-reports/:brandId | FbReportPage | Meta: age, gender, device, country, audience, platform, placement reports |
| /google-reports/:brandId | GoogleAdsDashboard | Google Ads reports |
| /conversion-reports/:brandId | ConversionLens | GA4 conversion reports (channel, gender, device, age, city, interest, campaign, OS, browser, source, country, page path, bounce rate) |
| /page-analytics/:brandId | PageAnalytics | Page analytics |
| /callback | GoogleCallback | Google OAuth callback |
| /profile | ProfilePage | User profile, brand integration |
| /shopify | ShopifyAuth | Shopify OAuth entry |
| /brand-setup | AddBrandDashboard | Add brand |
| /privacy-policy | PrivacyPolicy | Privacy policy |
| /terms-and-conditions | TermsAndConditions | Terms |
| /meta-campaigns/:brandId | CampaignPage | Meta campaign reports |
| /meta-interest/:brandId | InterestReportPage | Meta interest reports |
| /creatives-library/:brandId | CreativesLibrary | Meta creatives library |
| /pricing_callback | PricingCallback | Pricing success |
| /first-time-brand-setup | BrandSetupDashboard | First-time brand setup |
| /d2c-calculator/:brandId | D2CCalculator | D2C / EBITDA calculator |
| /bounce-rate-reports/:brandId | BounceRatePage | Bounce rate (collection/product) |
| /followed-brands/:brandId | FollowedBrands | Followed (scraped) brands, ad cards |
| /festival-calendar/:brandId | FestivalCalendarPage | Festival/holiday calendar |
| /speed-insights | SpeedInsightsPage | Page Speed Insights |
| /location-analytics/:brandId | LocationAnalyticsPage | Location-based sales (metro, tier, region, etc.) |
| /master-dashboard/ | MasterDashboard | Master dashboard (all brands) |

---

## 6. Current Features Summary

- **Auth:** Email/password, Google, Shopify OAuth; JWT; token refresh (Google, FB, Zoho).
- **Brands:** CRUD, multi-platform (Meta, Google Ads, GA4, Shopify), currency, platform disconnect.
- **Summary dashboard:** Period comparison (yesterday, 7/14/30 days, quarterly) for Meta, Google Ads, Shopify (from AdMetrics), GA4; accordion table.
- **Shopify:** Orders, revenue, AOV, payment orders (COD/prepaid), refunds, customers sync/export/delete.
- **Shopify webhooks:** Order create, refund create; historical sync; job status.
- **GA4 analytics:** ATC, checkouts, purchases, age, gender, location, channel, landing page, bounce rate, conversions by dimension (region, channel, page, gender, device, age, city, interest, campaign, OS, browser, source, country, page path).
- **Location analytics:** Sales by location (dimension: metro, tier, region, etc.) using Order + CityMetadata.
- **Meta:** Interest, campaign; reports by age, gender, device, country, audience, platform, placement.
- **Google Ads:** State, search term, age, gender, keyword, product metrics; city conversion.
- **Segment:** Product/brand/type/category/search term/age/gender metrics.
- **Reports:** Metrics by brand, monthly report, delete by date/brand, delete logs.
- **Highlights:** Marketing insights, conversion funnel.
- **Brand performance:** Targets (sales, spend, ROAS), achieved metrics (Meta, Google).
- **Setup:** Google accounts, GA4 properties, FB ad accounts, cache clear.
- **Pricing:** Shopify billing callback, pricing details.
- **Cache:** Stats, clear by name/key.
- **Creatives:** Meta creatives batch, cache clear.
- **D2C calculator:** Revenue, costs, COGS, calculate metrics, last expenditure/COGS.
- **Scraping / followed brands:** Scrape brands, follow/unfollow, list ads/brands.
- **Page Speed Insights:** Single endpoint for speed data.
- **Festival dates:** CRUD, generate from Calendarific.
- **Product:** Monthly launched products.
- **Master dashboard:** Aggregated brand metrics, FB/Google ad data, funnel, meta sales summary.
- **Zoho:** Departments, agents, tickets.
- **Webhooks:** GDPR (data request, redact), app uninstall, subscription update, refunds.

---

## 7. Environment Variables (Server)

Use a `.env` file in `server/`. Typical variables:

| Variable | Purpose |
|----------|---------|
| PORT | Server port (e.g. 5000) |
| NODE_ENV | development / production |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret |
| GOOGLE_CLIENT_ID | Google OAuth & Ads |
| GOOGLE_CLIENT_SECRET | Google OAuth & Ads |
| GOOGLE_AD_DEVELOPER_TOKEN | Google Ads API |
| GOOGLE_REDIRECT_URI | OAuth redirect (brand setup) |
| CALENDARIFIC_API_KEY | Festival/holiday generation |
| ZOHO_CLIENT_ID | Zoho integration |
| ZOHO_CLIENT_SECRET | Zoho integration |
| ZOHO_ORG_ID | Zoho org |
| EMAIL_USER / EMAIL_PASS | Email (e.g. Zoho tickets) |
| META_DATASET_ID / META_CAPI_TOKEN | Meta CAPI (if used) |
| SERVER_ID | Optional server identifier (e.g. Socket) |
| Redis / BullMQ | Used by workers (metrics, etc.) — configure per your Redis URL |

---

## 8. Setup and Running

### Backend

```bash
cd server
npm install
# Create .env with MONGO_URI, JWT_SECRET, and any integration keys above
npm run dev
```

- Optional: Redis for workers — `npm run dev:redis` (Docker), then run metrics worker with `npm run dev:worker` or `npm run dev:worker:watch`.

### Frontend

```bash
cd client
npm install
npm run dev
```

App: `http://localhost:5173` (or configured port). API: `http://localhost:5000` (or server PORT).

### Production

- Build client: `npm run build` (in `client/`).
- Serve client build from Express or a static host; ensure API base URL and CORS are set for production.

---

## 9. Project Guidance & Examples

### Adding a new API under an existing domain

1. Add handler in the right `server/controller/<domain>.js`.
2. Add route in `server/routes/<domain>.js` (e.g. `router.get('/new-thing/:brandId', verifyAuth, newThing)`).
3. Mount the router in `server/index.js` if it’s a new file (e.g. `dataOperationRouter.use("/summary", summaryRoutes)`).

### Adding a new Mongoose model

1. Create `server/models/<Name>.js` with schema and indexes.
2. Export the model; require it in the controller that uses it.
3. Ensure `server/config/db.js` runs before any model use (connection is shared).

### Using Summary APIs (comparison periods)

- **Meta:** `GET /api/summary/facebook-ads/:brandId` → `periodData.yesterday | .last7Days | .last14Days | .last30Days | .quarterly`; each has `metaspend`, `metaroas` with `current`, `previous`, `change`, `trend`.
- **Shopify:** `GET /api/summary/shopify/:brandId` → same periods; `totalSales`, `refundAmount`, `roas` (ROAS = totalSales / (metaSpend + googleSpend) from AdMetrics).
- **Google Ads / Analytics:** Same period shape; analytics includes sessions, addToCarts, checkouts, purchases, rates.

### Frontend: calling the API with auth

- Use the project’s axios instance (e.g. from `axiosConfig` or conversion report `axiosInstance`) so cookies/credentials are sent.
- Example: `GET /api/summary/shopify/${brandId}` with `withCredentials: true` to get Shopify summary for the performance table.

### Location analytics

- **API:** `GET /api/analytics/location-sales?brandId=...&dimension=metro|tier|region|...&startDate=...&endDate=...`
- **Data:** Orders aggregated by location; city normalized via `CityMetadata` (metro, tier, region, etc.).

### AdMetrics and daily rollups

- **AdMetrics** stores per-brand, per-day aggregates (Shopify: totalSales, refundAmount, COD/prepaid counts; Meta/Google: spend, revenue, ROAS).
- Summary and reporting APIs read from AdMetrics; webhooks/workers/cron jobs write or backfill it.

---

For high-level setup and quick start, see the main [README.md](./README.md).
