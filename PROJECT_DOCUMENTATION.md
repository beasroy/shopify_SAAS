# Shopify SAAS Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Database Models](#database-models)
3. [API Endpoints](#api-endpoints)
4. [Client Pages Directory](#client-pages-directory)
5. [Redux State Management](#redux-state-management)

---

## Project Overview

This is a comprehensive Shopify SAAS application that provides analytics, reporting, and performance tracking for e-commerce brands. The application integrates with multiple platforms including Shopify, Meta (Facebook) Ads, Google Ads, and Google Analytics 4 (GA4) to provide unified marketing insights and performance metrics.

**Key Features:**
- Multi-platform ad analytics (Meta, Google Ads, GA4)
- Shopify order and customer management
- Real-time metrics and reporting
- Brand performance tracking
- Conversion funnel analysis
- Customer segmentation
- Creative library management
- D2C (Direct-to-Consumer) calculator
- Subscription and billing management

---

## Database Models

### 1. User Model
**Purpose:** Stores user account information and authentication details.

**Schema:**
- `username`, `email`, `password` - Basic user credentials
- `googleLoginRefreshToken`, `zohoRefreshToken` - OAuth tokens for third-party integrations
- `isClient`, `isAdmin` - Role-based access control flags
- `method` - Authentication method enum: 'password', 'google', 'shopify'
- `brands` - Array of brand IDs (references to Brand model)
- `loginCount` - Tracks user login frequency

**Relationships:**
- One-to-Many with Brands (users can have multiple brands)
- Referenced by Subscription model through shopId

---

### 2. Brands Model
**Purpose:** Central entity representing a brand/store with all platform integrations.

**Schema:**
- `name` - Unique brand name
- `fbAdAccounts` - Array of Facebook Ad Account IDs
- `googleAdAccount` - Array of Google Ads client/manager IDs
- `ga4Account` - Google Analytics 4 Property ID
- `shopifyAccount` - Shopify store details (shopName, accessToken, shopId, currency)
- `googleAdsRefreshToken`, `googleAnalyticsRefreshToken`, `fbAccessToken` - Platform access tokens
- `timestamps` - Automatic createdAt and updatedAt fields

**Relationships:**
- Many-to-One with User (multiple brands per user)
- One-to-Many with AdMetrics (daily metrics per brand)
- One-to-Many with Customer (customers belong to brands)
- One-to-Many with OrderRefund (refunds tracked per brand)
- One-to-One with BrandPerformance (performance targets per brand)
- One-to-Many with Subscription (subscriptions per shopId)

---

### 3. AdMetrics Model
**Purpose:** Stores daily aggregated advertising and sales metrics for each brand.

**Schema:**
- `brandId` - Reference to Brand (required, indexed)
- `date` - Date of the metrics (required)
- Shopify metrics: `totalSales`, `refundAmount`, `codOrderCount`, `prepaidOrderCount`
- Ad platform metrics: `metaSpend`, `metaRevenue`, `googleSpend`, `googleROAS`, `totalSpend`, `grossROI`
- `timestamps` - Automatic createdAt and updatedAt fields

**Relationships:**
- Many-to-One with Brand (each brand has multiple daily metric records)

**Usage:** This model aggregates daily performance data from all connected platforms, enabling unified reporting and analysis.

---

### 4. BrandPerformance Model
**Purpose:** Stores target performance metrics and achievements for brands.

**Schema:**
- `brandId` - Unique brand identifier (required, unique)
- `name` - Brand name
- `source` - Performance source/platform
- `targetSales`, `targetSpend`, `targetROAS` - Target metrics
- `targetDate` - Target achievement date
- `achievedSpent`, `achievedSales`, `achievedROAS` - Actual performance metrics

**Relationships:**
- One-to-One with Brand (each brand has one performance target record)

**Usage:** Tracks brand performance against set targets, enabling goal monitoring and achievement tracking.

---

### 5. Customer Model
**Purpose:** Stores customer information synced from Shopify stores.

**Schema:**
- `brandId` - Reference to Brand (required, indexed)
- `shopifyCustomerId` - Shopify customer ID (required, indexed)
- Customer details: `firstName`, `lastName`, `email`, `phone`
- Address fields: `addressLine1`, `addressLine2`, `city`, `state`, `pin`
- `totalOrders` - Count of customer orders
- `defaultAddressId` - Shopify default address reference
- `timestamps` - Automatic createdAt and updatedAt fields

**Relationships:**
- Many-to-One with Brand (customers belong to specific brands)
- Compound unique index on (brandId, shopifyCustomerId) ensures one customer record per brand

**Usage:** Maintains a local copy of Shopify customer data for analytics, segmentation, and reporting purposes.

---

### 6. Subscription Model
**Purpose:** Manages subscription plans and billing information for Shopify stores.

**Schema:**
- `shopId` - Shopify shop ID (required, indexed, references Brand)
- `chargeId` - Unique Shopify charge ID (unique, sparse)
- `planName` - Enum: 'Free Plan', 'Startup Plan', 'Growth Plan'
- `price` - Subscription price
- `status` - Enum: 'active', 'cancelled', 'expired', 'frozen', 'pending'
- `billingOn` - Next billing date
- `trialEndsOn` - Trial expiration date
- `timestamps` - Automatic createdAt and updatedAt fields

**Relationships:**
- Many-to-One with Brand (linked via shopId)

**Usage:** Tracks subscription status and billing cycles for Shopify app installations.

---

### 7. OrderRefund Model
**Purpose:** Stores refund information keyed by order creation date for accurate revenue attribution.

**Schema:**
- `orderId` - Shopify order ID (required, indexed)
- `orderCreatedAt` - Original order creation date (required, indexed)
- `brandId` - Reference to Brand (required, indexed)
- `refundAmount` - Total refund amount (default: 0)
- `refundCount` - Number of refunds for this order (default: 0)
- `lastRefundAt` - Timestamp of most recent refund
- `timestamps` - Automatic createdAt and updatedAt fields

**Relationships:**
- Many-to-One with Brand (refunds tracked per brand)
- Compound index on (brandId, orderCreatedAt) for efficient date range queries
- Unique index on (brandId, orderId) prevents duplicate entries

**Usage:** Tracks refunds by original order date to ensure accurate revenue calculations when subtracting refunds from sales metrics.

---

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /signup` - User registration with email/password
- `POST /login/:type` - User login (supports password, google, shopify methods)
- `POST /logout` - User logout and session cleanup
- `GET /google` - Initiate Google OAuth flow
- `GET /google/callback` - Handle Google OAuth callback
- `GET /facebook` - Initiate Facebook OAuth flow
- `GET /facebook/callback` - Handle Facebook OAuth callback
- `PUT /updateTokens/:type` - Refresh OAuth tokens for Google, Facebook, or Zoho
- `POST /shopify` - Initiate Shopify OAuth installation
- `GET /shopify/callback` - Handle Shopify OAuth callback
- `GET /shopify/callback-brand-setup` - Handle Shopify brand setup callback
- `GET /zoho` - Initiate Zoho OAuth flow
- `GET /zoho/callback` - Handle Zoho OAuth callback
- `GET /check-token` - Validate authentication token

---

### Brand Routes (`/api/brands`)
- `POST /add` - Create a new brand with platform integrations
- `GET /all` - Get all brands (public endpoint)
- `PATCH /update/:brandid` - Update brand details and integrations
- `GET /:brandId` - Get specific brand by ID
- `POST /filter` - Filter brands by criteria
- `GET /currency/:brandId` - Get brand currency settings
- `DELETE /delete/:brandId` - Delete a brand and associated data
- `PATCH /platform/:brandId` - Remove platform integration from brand

---

### Shopify Routes (`/api/shopify`)
- `POST /aov/:brandId` - Calculate Average Order Value for date range
- `POST /revenue/:brandId` - Get total revenue metrics
- `GET /test-graphql-orders/:brandId` - Test GraphQL orders query
- `POST /payment-orders/:brandId` - Get monthly payment order breakdown
- `POST /customers/sync/:brandId` - Sync customers from Shopify to local database
- `GET /customers/:brandId` - Get paginated customer list
- `GET /customers/export/:brandId` - Export customers to Excel
- `DELETE /customers/:brandId` - Delete all customers for a brand

---

### Report Routes (`/api/report`)
- `GET /:brandId` - Get aggregated metrics by brand ID
- `POST /monthly` - Get detailed monthly sales data with refunds and order breakdown
- `DELETE /delete/byDate` - Delete AdMetrics by date range
- `DELETE /delete/:brandId` - Delete all AdMetrics and OrderRefund records for a brand
- `GET /delete-logs/:brandId` - Get deletion audit logs

---

### Analytics Routes (`/api/analytics`)
- `POST /atcreport/:brandId` - Get daily Add-to-Cart and Checkout metrics
- `POST /dayAtcReport/:brandId` - Get day-wise Add-to-Cart report
- `POST /monthAtcReport/:brandId` - Get monthly Add-to-Cart report
- `POST /ageReport/:brandId` - Get age-based audience metrics
- `POST /genderReport/:brandId` - Get gender-based audience metrics
- `POST /locationReport/:brandId` - Get location-based metrics
- `POST /channelReport/:brandId` - Get marketing channel metrics
- `POST /landingpageReport/:brandId` - Get landing page performance
- `POST /regionConversionReport/:brandId` - Get region-wise conversion data
- `POST /channelConversionReport/:brandId` - Get channel-wise conversion data
- `POST /pageConversionReport/:brandId` - Get page-wise conversion data
- `POST /genderConversionReport/:brandId` - Get gender-wise conversion metrics
- `POST /deviceTypeConversionReport/:brandId` - Get device type conversion metrics
- `POST /ageConversionReport/:brandId` - Get age-wise conversion metrics
- `POST /cityConversionReport/:brandId` - Get city-wise conversion data
- `POST /interestConversionReport/:brandId` - Get interest-based conversion metrics
- `POST /campaignConversionReport/:brandId` - Get campaign-wise conversion data
- `POST /operatingSystemConversionReport/:brandId` - Get OS-wise conversion metrics
- `POST /browserConversionReport/:brandId` - Get browser-wise conversion data
- `POST /sourceConversionReport/:brandId` - Get traffic source conversion metrics
- `POST /pagePathConversionReport/:brandId` - Get page path conversion data
- `POST /pageTitleConversionReport/:brandId` - Get page title conversion metrics
- `POST /countryConversionReport/:brandId` - Get country-wise conversion data

---

### Meta (Facebook) Routes (`/api/meta`)
- `POST /interest/:brandId` - Fetch Facebook interest targeting data
- `POST /campaign/:brandId` - Get Facebook campaign performance data
- `POST /report/age/:brandId` - Get age-based Facebook ad reports
- `POST /report/gender/:brandId` - Get gender-based Facebook ad reports
- `POST /report/device/:brandId` - Get device-based Facebook ad reports
- `POST /report/country/:brandId` - Get country-based Facebook ad reports
- `POST /report/audience/:brandId` - Get audience-based Facebook ad reports
- `POST /report/platform/:brandId` - Get platform-based Facebook ad reports
- `POST /report/placement/:brandId` - Get placement-based Facebook ad reports

---

### Google Routes (`/api/google`)
- `POST /state/:brandId` - Get state-wise Google Ads metrics
- `POST /searchTerm/:brandId` - Get search term performance data
- `POST /age/:brandId` - Get age-based Google Ads metrics
- `POST /gender/:brandId` - Get gender-based Google Ads metrics
- `POST /keyword/:brandId` - Get keyword performance data
- `POST /product/:brandId` - Get product-based Google Ads metrics

---

### Ad Analytics Routes (`/api/metrics`)
- `POST /fbAd/:brandId` - Fetch Facebook Ad Account aggregated metrics
- `POST /googleAdAndCampaign/:brandId` - Fetch Google Ads account and campaign-level metrics

---

### Dashboard Highlights Routes (`/api/highlights`)
- `GET /marketing/:brandId` - Get marketing insights and key metrics
- `POST /conversion-funnel/:brandId` - Get Add-to-Cart and Checkout funnel data

---

### Summary Routes (`/api/summary`)
- `GET /facebook-ads/:brandId` - Get Meta/Facebook Ads summary metrics
- `GET /google-ads/:brandId` - Get Google Ads summary metrics
- `GET /analytics/:brandId` - Get Google Analytics summary metrics
- `GET /unified/:brandId` - Get unified summary from all platforms (legacy endpoint)

---

### Brand Performance Routes (`/api/performance`)
- `GET /brandTarget` - Get performance targets for user's brands
- `POST /addTarget` - Add new performance target for a brand
- `PATCH /updateTarget/:brandId` - Update performance target
- `DELETE /deleteTarget/:brandId` - Delete performance target
- `GET /metaMetrics/:brandId` - Get Meta platform performance metrics
- `GET /googleAdMetrics/:brandId` - Get Google Ads performance metrics

---

### Segment Report Routes (`/api/segment`)
- `POST /productMetrics/:brandId` - Get Google product performance metrics
- `POST /brandMetrics/:brandId` - Get brand-wise product metrics
- `POST /typeMetrics/:brandId` - Get product type metrics
- `POST /categoryMetrics/:brandId` - Get product category metrics
- `POST /searchTermMetrics/:brandId` - Get search term performance metrics
- `POST /ageMetrics/:brandId` - Get age-based audience segment metrics
- `POST /genderMetrics/:brandId` - Get gender-based audience segment metrics
- `POST /searchTerm/:brandId` - Fetch Google Ads search term data
- `POST /age/:brandId` - Fetch Google Ads age metrics
- `POST /gender/:brandId` - Fetch Google Ads gender metrics
- `POST /keyword/:brandId` - Fetch Google Ads keyword data
- `POST /product/:brandId` - Fetch Google Ads product metrics

---

### Brand Setup Routes (`/api/setup`)
- `GET /google-accounts/:brandId` - Get available Google Ads accounts
- `GET /ga4-propertyIds/:brandId` - Get available GA4 property IDs
- `GET /fb-ad-accounts/:brandId` - Get available Facebook Ad Account IDs
- `DELETE /fb-ad-accounts-cache/:brandId` - Clear Facebook Ad Account cache

---

### Creative Routes (`/api/ads`)
- `POST /meta-creative/:brandId` - Get Meta/Facebook ad creatives in batches
- `DELETE /meta-creative-cache/:brandId` - Clear creatives cache

---

### Pricing Routes (`/api/pricing`)
- `GET /callback` - Handle Shopify pricing callback
- `GET /details/:brandId` - Get subscription pricing details

---

### User Routes (`/api/users`)
- `POST /add-brand` - Add a brand to user's brand list
- `GET /getuser/:userId` - Get user details by ID

---

### D2C Calculator Routes (`/api/d2c-calculator`)
- `POST /revenue/:brandId` - Fetch revenue data for calculator
- `POST /ebidta-calculate/:brandId` - Calculate D2C metrics (EBITDA, margins, etc.)

---

## Client Pages Directory

### Analytics Dashboard (`/pages/AnalyticsDashboard`)
**Purpose:** Main analytics dashboard showing ad account metrics and performance.

**Components:**
- `AnalyticsDashboard.tsx` - Main dashboard container
- `dashboard.tsx` - Dashboard layout and routing
- `AdAccountsMetricsCard.tsx` - Displays metrics cards for ad accounts
- `Components/ColumnManagementSheet.tsx` - Column visibility and ordering controls
- `Components/ConnectAccountsPage.tsx` - Platform account connection interface

---

### Brand Performance Dashboard (`/pages/BrandPerformanceDashboard`)
**Purpose:** Track and visualize brand performance against targets.

**Components:**
- `PerformanceDashboard.tsx` - Main performance dashboard
- `Dashboard.tsx` - Dashboard layout with charts and metrics

---

### Conversion Report Page (`/pages/ConversionReportPage`)
**Purpose:** Comprehensive conversion analysis across multiple dimensions.

**Components:**
- `ConversionLens.tsx` - Main conversion analysis page
- `components/AgeConversion.tsx` - Age-based conversion metrics
- `components/BrowserConversion.tsx` - Browser-wise conversion data
- `components/CampaignConversion.tsx` - Campaign conversion performance
- `components/ChannelConversion.tsx` - Marketing channel conversions
- `components/CityConversion.tsx` - City-wise conversion metrics
- `components/CountryConversion.tsx` - Country-based conversions
- `components/DeviceConversion.tsx` - Device type conversion analysis
- `components/GenderConversion.tsx` - Gender-based conversion metrics
- `components/InterestConversion.tsx` - Interest-based conversions
- `components/OperatingSystemConversion.tsx` - OS-wise conversion data
- `components/PagePathConversion.tsx` - Page path conversion analysis
- `components/PageTitleConversion.tsx` - Page title conversion metrics
- `components/RegionConversion.tsx` - Regional conversion data
- `components/SourceConversion.tsx` - Traffic source conversions
- `components/ConversionTable.tsx` - Tabular conversion data display
- `components/Filter.tsx` - Conversion report filters
- `components/PerformanceSummary.tsx` - Summary metrics card
- `components/ExcelDownload.tsx` - Export conversion data to Excel

---

### Creatives Library (`/pages/CreativesLibrary`)
**Purpose:** View and manage Meta/Facebook ad creatives.

**Components:**
- `CreativesLibrary.tsx` - Main creatives library page
- `components/CreativeCard.tsx` - Individual creative card display

---

### D2C Calculator (`/pages/D2CCalculator`)
**Purpose:** Calculate Direct-to-Consumer business metrics and profitability.

**Components:**
- `D2CCalculator.tsx` - Main calculator interface
- `components/EbidtaCalculator.tsx` - EBITDA and margin calculations

---

### Generalised Dashboard (`/pages/GeneralisedDashboard`)
**Purpose:** Unified dashboard showing overview of all brand metrics and insights.

**Components:**
- `GeneralDashboard.tsx` - Main general dashboard
- `dashboard.tsx` - Dashboard routing and layout
- `AddBrandDashboard.tsx` - Add new brand interface
- `BrandSetUpDashboard.tsx` - Brand setup and configuration
- `components/AnalyticsCard.tsx` - Analytics summary card
- `components/ConversionFunnelCard.tsx` - Conversion funnel visualization
- `components/DashboardSkeleton.tsx` - Loading skeleton component
- `components/MarketingInsightsCard.tsx` - Marketing insights display
- `components/PaymentOrdersCard.tsx` - Payment and order metrics
- `components/PerformanceTable.tsx` - Performance data table
- `components/SetUpGuide.tsx` - Setup guide component
- `components/BrandForm.tsx` - Brand creation/editing form
- `components/ShopifyModalContent.tsx` - Shopify integration modal
- `components/OtherPlatformModalContent.tsx` - Other platform integration modal

---

### Google Ads Hub (`/pages/GoogleAdsHub`)
**Purpose:** Google Ads specific analytics and reporting.

**Components:**
- `Dashboard.tsx` - Main Google Ads dashboard
- `components/Age.tsx` - Age-based Google Ads metrics
- `components/Gender.tsx` - Gender-based Google Ads metrics
- `components/Keyword.tsx` - Keyword performance analysis
- `components/Product.tsx` - Product performance metrics
- `components/SearchTerm.tsx` - Search term analysis

---

### Landing Page (`/pages/LandingPage`)
**Purpose:** Public-facing landing page for the application.

**Components:**
- `page.tsx` - Main landing page
- `components/HeroSection.tsx` - Hero section with CTA
- `components/Navbar.tsx` - Navigation bar
- `components/Features.tsx` - Features showcase
- `components/CTA.tsx` - Call-to-action section
- `components/Footer.tsx` - Footer with links
- `components/PrivacyPolicy.tsx` - Privacy policy page
- `components/TermsAndConditions.tsx` - Terms and conditions page

---

### Meta Reports (`/pages/Meta`)
**Purpose:** Facebook/Meta advertising reports and analytics.

**Components:**
- `Campaign Reports/CampaignPage.tsx` - Campaign performance page
- `Campaign Reports/components/MetaCampaignTable.tsx` - Campaign data table
- `FbReports/FbReportPage.tsx` - Main Facebook reports page
- `FbReports/component/AgeFbReport.tsx` - Age-based Facebook reports
- `FbReports/component/AudienceFbReport.tsx` - Audience-based reports
- `FbReports/component/CountryFbReport.tsx` - Country-based reports
- `FbReports/component/DeviceFbReport.tsx` - Device-based reports
- `FbReports/component/GenderFbReport.tsx` - Gender-based reports
- `FbReports/component/PlacementFbReport.tsx` - Placement-based reports
- `FbReports/component/PlatformFbReport.tsx` - Platform-based reports
- `FbReports/component/MetaReportTable.tsx` - Meta reports data table
- `Interest Reports/InterestReportPage.tsx` - Interest targeting reports
- `Interest Reports/components/InterestTable.tsx` - Interest data table
- `Interest Reports/components/InterestFilter.tsx` - Interest filtering controls

---

### Monthly Ad Metrics (`/pages/MonthlyAdMetrics`)
**Purpose:** Monthly aggregated ad metrics and reporting.

**Components:**
- `ExcelMetrics.tsx` - Excel export for monthly metrics
- `components/DataBuilding.tsx` - Data building/processing component

---

### Pricing Page (`/pages/Pricing`)
**Purpose:** Display subscription plans and pricing information.

**Components:**
- `Pricing.tsx` - Pricing page with plan details

---

### Profile Page (`/pages/Profile Page`)
**Purpose:** User profile management and brand management.

**Components:**
- `ProfilePage.tsx` - Main profile page
- `components/BrandCard.tsx` - Brand card display component
- `components/BrandIntegrationModal.tsx` - Brand integration setup modal

---

### Report Page (`/pages/ReportPage`)
**Purpose:** Comprehensive reporting interface with multiple metric views.

**Components:**
- `ReportsPage.tsx` - Main reports page
- `ConnectPlatformPage.tsx` - Platform connection interface
- `component/DaywiseMetricsPage.tsx` - Day-wise metrics view
- `component/EcommerceMetricsPage.tsx` - E-commerce metrics view
- `component/MonthlyMetricsPage.tsx` - Monthly aggregated metrics
- `component/ReportTable.tsx` - Report data table component

---

### Segment Dashboard (`/pages/SegmentDashboard`)
**Purpose:** Customer and audience segmentation analytics.

**Components:**
- `SegmentDashboard.tsx` - Main segment dashboard
- `Dashboard.tsx` - Dashboard layout
- `component/AgeGenderMetrics.tsx` - Combined age and gender metrics
- `component/GenderMetrics.tsx` - Gender-based segmentation
- `component/ProductTab.tsx` - Product-based segmentation
- `component/SearchTermTable.tsx` - Search term segmentation table

---

## Redux State Management

The application uses Redux Toolkit with Redux Persist for state management. All slices are persisted to localStorage except where specified.

### 1. User Slice (`UserSlice.ts`)
**Purpose:** Manages authenticated user state and user information.

**State Structure:**
```typescript
{
  user: {
    id: string;
    username: string;
    email: string;
    brands: string[];
    isClient: boolean;
    isAdmin: boolean;
    method: string;
    loginCount: number;
  } | null
}
```

**Actions:**
- `setUser` - Set current user data
- `clearUser` - Clear user data on logout
- `removeBrandFromUser` - Remove brand from user's brand list
- `addBrandToUser` - Add brand to user's brand list

---

### 2. Brand Slice (`BrandSlice.ts`)
**Purpose:** Manages selected brand and brand list state.

**State Structure:**
```typescript
{
  selectedBrandId: string | null;
  brands: IBrand[];
}
```

**Actions:**
- `setSelectedBrandId` - Set currently selected brand ID
- `setBrands` - Set list of brands
- `deleteBrand` - Remove brand from list
- `resetBrand` - Reset brand state

---

### 3. Date Slice (`DateSlice.ts`)
**Purpose:** Manages date range selections for reports and analytics.

**State Structure:**
```typescript
{
  from?: string;        // Primary date range start
  to?: string;          // Primary date range end
  compareFrom?: string; // Comparison date range start
  compareTo?: string;   // Comparison date range end
}
```

**Actions:**
- `setDate` - Set date range (primary and/or comparison)
- `clearDate` - Clear all date selections

---

### 4. Conversion Filter Slice (`ConversionFilterSlice.ts`)
**Purpose:** Manages column filters for conversion tables across different components.

**State Structure:**
```typescript
{
  [componentId: string]: {
    [column: string]: {
      value: number;
      operator: string;
    } | null;
  };
}
```

**Actions:**
- `setFilter` - Set filter for a specific column in a component
- `clearFilters` - Clear all filters for a component

---

### 5. Campaign Group Slice (`CampaignGroupSlice.ts`)
**Purpose:** Manages campaign grouping and organization for ad accounts.

**State Structure:**
```typescript
{
  accounts: {
    [accountId: string]: {
      groups: CampaignGroup[];
      selectedCampaigns: string[];
      editingGroupId: string | null;
      expandedGroups: string[];
      isCreatingGroup: boolean;
    };
  };
}
```

**Actions:**
- `createGroup` - Create new campaign group
- `deleteGroup` - Delete campaign group
- `addCampaignToGroup` - Add campaign to group
- `removeCampaignFromGroup` - Remove campaign from group
- `setSelectedCampaigns` - Set selected campaigns
- `toggleEditingGroup` - Toggle group editing mode
- `toggleGroupExpansion` - Expand/collapse group
- `setIsCreatingGroup` - Set group creation state

---

### 6. Campaign Labels Slice (`campaignLabelsSlice.ts`)
**Purpose:** Manages labels/tags for campaigns across ad accounts.

**State Structure:**
```typescript
{
  labels: {
    [accountId: string]: {
      [campaignId: string]: string[];
    };
  };
  isAddingLabel: boolean;
}
```

**Actions:**
- `addLabelToCampaign` - Add label to campaign
- `removeLabelFromCampaign` - Remove label from campaign
- `toggleAddingLabel` - Toggle label addition mode
- `clearAccountLabels` - Clear all labels for an account
- `deleteLabel` - Delete label from all campaigns
- `copyLabels` - Copy labels between campaigns

---

### 7. Interest Filter Slice (`interestFilterSlice.ts`)
**Purpose:** Manages filter conditions for interest-based reports.

**State Structure:**
```typescript
{
  filters: {
    [tableId: string]: FilterCondition[];
  };
}
```

**FilterCondition:**
```typescript
{
  column: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: string | number;
}
```

**Actions:**
- `addFilter` - Add filter condition
- `removeFilter` - Remove filter by index
- `updateFilter` - Update existing filter
- `clearFilters` - Clear all filters for a table

---

### 8. Brand Form Slice (`BrandFormSlice.ts`)
**Purpose:** Manages form state during brand creation/editing.

**State Structure:**
```typescript
{
  brandName: string;
  connectedAccounts: Record<string, string[]>;
  googleAdsConnections: {
    clientId: string;
    managerId?: string;
  }[];
  ga4Id: string;
  fbAdId: string[];
  shop: string;
  shopifyAccessToken: string;
}
```

**Actions:**
- `setBrandFormData` - Set all form data
- `clearBrandFormData` - Reset form to initial state

---

### 9. Notification Slice (`NotificationSlice.ts`)
**Purpose:** Manages in-app notifications and alerts.

**State Structure:**
```typescript
{
  notifications: Notification[];
  unreadCount: number;
  isSoundEnabled: boolean;
}
```

**Notification:**
```typescript
{
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  brandId?: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}
```

**Actions:**
- `addNotification` - Add new notification
- `markAsRead` - Mark notification as read
- `markAllAsRead` - Mark all notifications as read
- `removeNotification` - Remove notification
- `clearAllNotifications` - Clear all notifications
- `toggleSound` - Toggle notification sound
- `setSoundEnabled` - Set sound enabled state

**Note:** Notifications are persisted with automatic cleanup (keeps last 50, filters out older than 7 days).

---

### 10. Tutorial Slice (`TutorialSlice.ts`)
**Purpose:** Manages tutorial/onboarding flow state.

**State Structure:**
```typescript
{
  isFirstTimeLogin: boolean;
  activeTutorial: string | null;
  isTutorialActive: boolean;
  activeTutorialStep: number;
  tutorialQueue: string[];
  completedTutorials: Record<string, boolean>;
}
```

**Actions:**
- `setFirstTimeLogin` - Set first-time login status
- `queueTutorials` - Queue multiple tutorials to play in sequence
- `startTutorial` - Start specific tutorial
- `nextTutorial` - Move to next tutorial in queue
- `setTutorialStep` - Update current tutorial step
- `stopTutorial` - Stop current tutorial and clear queue
- `completeFirstTimeLogin` - Mark first-time login as complete
- `resetTutorial` - Reset specific tutorial completion
- `resetAllTutorials` - Reset all tutorial completions

---

### 11. Locale Slice (`LocalSlice.ts`)
**Purpose:** Manages application locale/language settings.

**State Structure:**
```typescript
{
  locale: "en-IN" | "en-US";
}
```

**Actions:**
- `setLocale` - Set application locale

---

### 12. Token Error Slice (`TokenSllice.ts`)
**Purpose:** Tracks OAuth token errors for different platforms.

**State Structure:**
```typescript
{
  fbToken: boolean;
  googleAnalyticsToken: boolean;
  googleAdsToken: boolean;
}
```

**Actions:**
- `setFbTokenError` - Set Facebook token error state
- `setGoogleAnalyticsTokenError` - Set GA4 token error state
- `setGoogleAdsTokenError` - Set Google Ads token error state
- `resetAllTokenErrors` - Reset all token errors

**Selectors:**
- `selectFbTokenError` - Get Facebook token error
- `selectGoogleAnalyticsTokenError` - Get GA4 token error
- `selectGoogleAdsTokenError` - Get Google Ads token error
- `selectAnyTokenError` - Check if any token has error

---

## Redux Store Configuration

**Persist Configuration:**
- All slices are persisted to localStorage
- Custom transform for notifications (limits to 50, filters 7+ days old)
- Whitelist includes: `tokenError`, `conversionFilters`, `brand`, `user`, `date`, `campaignGroups`, `campaignLabels`, `tutorials`, `locale`, `interestFilter`, `brandForm`, `notifications`

**Middleware:**
- Redux Persist middleware configured
- Serializable check ignores persist actions

---

## Additional Notes

### Authentication
- Uses JWT tokens stored in cookies
- Supports multiple authentication methods: password, Google OAuth, Shopify OAuth
- Middleware `verifyAuth` protects authenticated routes
- Middleware `verifyShopify` validates Shopify requests

### Real-time Features
- Socket.IO integration for real-time notifications
- Redis pub/sub for worker notifications
- WebSocket connections for live metric updates

### Data Processing
- Cron jobs for scheduled metric calculations (production only)
- Background workers for metric processing
- Redis queues for async job processing
- Caching layer for frequently accessed data

### Platform Integrations
- **Shopify:** OAuth, Webhooks, GraphQL API, REST API
- **Meta/Facebook:** OAuth, Marketing API, Ad Insights API
- **Google Ads:** OAuth, Google Ads API
- **Google Analytics 4:** OAuth, GA4 Data API
- **Zoho:** OAuth for support ticket integration

---

## File Structure Summary

```
shopify_SAAS/
├── server/
│   ├── models/          # Database models (7 models)
│   ├── routes/          # API route definitions (23 route files)
│   ├── controller/      # Business logic controllers (25+ controllers)
│   ├── middleware/     # Auth and validation middleware
│   ├── config/         # Database, Redis, Socket.IO config
│   ├── utils/          # Utility functions
│   ├── webhooks/       # Webhook handlers
│   ├── workers/        # Background workers
│   └── Report/         # Report generation modules
│
└── client/
    ├── src/
    │   ├── pages/      # Page components (26+ page directories)
    │   ├── store/      # Redux store and slices (12 slices)
    │   ├── components/ # Reusable UI components
    │   ├── services/  # API and socket services
    │   ├── hooks/      # Custom React hooks
    │   ├── context/    # React contexts
    │   └── interfaces/ # TypeScript interfaces
    └── public/         # Static assets
```

---

**Documentation Version:** 1.0  
**Last Updated:** 2025  
**Maintained By:** Development Team
