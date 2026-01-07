# KPI Monitoring & Recommendation System Architecture

## Executive Summary

This document outlines architectural recommendations for implementing a KPI drop detection and recommendation system for your Shopify SAAS platform. The system will monitor KPIs (add to cart, bounce rate, purchases, etc.) and provide actionable suggestions when metrics drop.

---

## Current Architecture Analysis

### Existing Infrastructure ✅
- **Backend**: Node.js/Express monolithic application
- **Database**: MongoDB for data persistence
- **Real-time**: Socket.IO for WebSocket connections
- **Queue System**: Redis + BullMQ for background jobs
- **Workers**: Background workers for async processing
- **Cron Jobs**: Scheduled tasks (metrics calculation at 2 AM UTC)
- **Notification System**: Socket.IO + Redis pub/sub already in place
- **KPI Tracking**: Already tracking metrics in `summary.js` (addToCarts, purchases, bounce rate, etc.)

### Current Gaps ❌
- No KPI drop detection system
- No automated alerting for metric drops
- No recommendation engine
- No AI/ML capabilities for suggestions

---

## Recommended Architecture Options

### **Option 1: Integrated Service (RECOMMENDED for MVP) ⭐**

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│         Main Backend (Node.js/Express)          │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │   KPI Monitoring Service (New Module)    │  │
│  │  - Drop Detection                        │  │
│  │  - Threshold Management                 │  │
│  │  - Alert Generation                     │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │   Recommendation Engine (New Module)    │  │
│  │  - Rule-based suggestions               │  │
│  │  - AI-powered insights (optional)       │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │   Existing Notification System           │  │
│  │  - Socket.IO                             │  │
│  │  - Redis pub/sub                         │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ **Simplest to implement** - No new infrastructure needed
- ✅ **Low latency** - No network calls between services
- ✅ **Easier debugging** - All code in one codebase
- ✅ **Cost-effective** - No additional deployment overhead
- ✅ **Faster development** - Can leverage existing notification system
- ✅ **Easy to maintain** - Single codebase

**Cons:**
- ❌ Couples recommendation logic with main app
- ❌ May need refactoring if you scale later
- ❌ Single point of failure (but you already have this)

**Implementation:**
- Add new modules: `server/services/kpiMonitor.js` and `server/services/recommendationEngine.js`
- Extend existing cron job to run KPI monitoring
- Use existing Socket.IO for notifications
- Add new MongoDB collection for KPI thresholds and alert history

**Best For:** MVP, small to medium scale, rapid development

---

### **Option 2: Separate Microservice (For Scale)**

**Architecture:**
```
┌─────────────────────┐         ┌──────────────────────┐
│   Main Backend      │────────▶│  KPI Service         │
│   (Node.js)         │  HTTP   │  (Node.js/Python)    │
└─────────────────────┘         │  - Drop Detection    │
                                │  - Thresholds        │
                                │  - Alerts            │
                                └──────────────────────┘
                                        │
                                        ▼
                                ┌──────────────────────┐
                                │  Recommendation      │
                                │  Service             │
                                │  (Python/Node.js)   │
                                │  - Rule Engine       │
                                │  - AI/ML Models      │
                                └──────────────────────┘
```

**Pros:**
- ✅ **Separation of concerns** - Each service has single responsibility
- ✅ **Independent scaling** - Scale recommendation engine separately
- ✅ **Technology flexibility** - Use Python for ML if needed
- ✅ **Isolation** - Failures in one service don't affect others
- ✅ **Team autonomy** - Different teams can own different services

**Cons:**
- ❌ **More complex** - Service discovery, API versioning, etc.
- ❌ **Network latency** - HTTP calls between services
- ❌ **Deployment overhead** - Multiple services to deploy
- ❌ **More infrastructure** - Load balancers, service mesh, etc.
- ❌ **Harder debugging** - Distributed tracing needed

**Best For:** Large scale, multiple teams, need for different tech stacks

---

### **Option 3: Hybrid Approach (Modular Monolith)**

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│         Main Backend (Node.js/Express)          │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │   KPI Monitoring Module                  │  │
│  │  (Can be extracted to microservice later)│  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │   Recommendation Module                 │  │
│  │  (Can be extracted to microservice later)│  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ **Best of both worlds** - Modular but integrated
- ✅ **Future-proof** - Easy to extract to microservices later
- ✅ **Clear boundaries** - Well-defined interfaces
- ✅ **Testable** - Each module can be tested independently

**Cons:**
- ❌ Still some coupling
- ❌ Requires discipline to maintain boundaries

**Best For:** Medium scale, planning for future growth

---

## Recommendation Engine Options

### **Option A: Rule-Based System (Start Here) ⭐**

**How it works:**
- Pre-defined rules based on KPI drops
- Example: "If addToCartRate drops >20%, suggest: check product page load time, review pricing, check mobile experience"

**Pros:**
- ✅ **Deterministic** - Predictable results
- ✅ **Fast** - No API calls needed
- ✅ **Cost-effective** - No AI API costs
- ✅ **Explainable** - Users understand why they got the suggestion
- ✅ **Easy to implement** - Simple if/else logic

**Cons:**
- ❌ **Limited** - Can't handle complex scenarios
- ❌ **Maintenance** - Need to update rules manually
- ❌ **Not personalized** - Same suggestions for all brands

**Implementation:**
```javascript
// Example rule structure
const recommendationRules = {
  addToCartRate: {
    dropThreshold: 0.20, // 20% drop
    suggestions: [
      "Check product page load time - slow pages reduce conversions",
      "Review pricing strategy - compare with competitors",
      "Test mobile experience - 60% of traffic is mobile",
      "Check product availability - out of stock items reduce ATC"
    ]
  },
  bounceRate: {
    increaseThreshold: 0.15, // 15% increase
    suggestions: [
      "Improve page load speed - aim for <3 seconds",
      "Optimize landing page relevance - match ad copy",
      "Check mobile responsiveness",
      "Review content quality - ensure clear value proposition"
    ]
  }
  // ... more rules
}
```

---

### **Option B: AI-Powered Recommendations (Advanced)**

**How it works:**
- Use LLM (OpenAI GPT-4, Claude, etc.) to generate contextual suggestions
- Feed historical data, current metrics, and context to AI
- AI generates personalized, contextual recommendations

**Pros:**
- ✅ **Intelligent** - Handles complex scenarios
- ✅ **Contextual** - Considers brand-specific context
- ✅ **Personalized** - Different suggestions per brand
- ✅ **Adaptive** - Learns from patterns
- ✅ **Natural language** - Human-readable suggestions

**Cons:**
- ❌ **Cost** - API calls cost money ($0.01-0.10 per request)
- ❌ **Latency** - API calls take 1-3 seconds
- ❌ **Unpredictable** - May generate inconsistent results
- ❌ **Rate limits** - API rate limits may apply
- ❌ **Privacy** - Sending data to third-party APIs

**Implementation:**
```javascript
// Example AI recommendation
const generateAIRecommendation = async (kpi, dropPercentage, brandContext) => {
  const prompt = `
    Brand: ${brandContext.name}
    Industry: ${brandContext.industry}
    KPI: ${kpi} dropped by ${dropPercentage}%
    Historical data: ${JSON.stringify(brandContext.metrics)}
    
    Provide 3 actionable suggestions to improve ${kpi}.
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  
  return response.choices[0].message.content;
};
```

---

### **Option C: Hybrid Approach (RECOMMENDED) ⭐**

**How it works:**
- Use rule-based for common scenarios (fast, cheap)
- Use AI for complex/edge cases (intelligent, contextual)
- Cache AI responses for similar scenarios

**Pros:**
- ✅ **Best of both** - Fast for common cases, intelligent for complex
- ✅ **Cost-effective** - Only use AI when needed
- ✅ **Scalable** - Can handle high volume
- ✅ **Flexible** - Easy to adjust strategy

**Cons:**
- ❌ **More complex** - Need to decide when to use AI vs rules
- ❌ **Caching logic** - Need to implement smart caching

**Implementation Strategy:**
1. **Tier 1 (Rule-based)**: Common drops (<30% change) → Use rules
2. **Tier 2 (AI)**: Significant drops (>30%) or complex scenarios → Use AI
3. **Tier 3 (Cached AI)**: Similar scenarios seen before → Use cached AI response

---

## Data Flow Architecture

### Recommended Flow (Option 1 + Option C):

```
1. Cron Job (Every hour or after metrics calculation)
   ↓
2. KPI Monitor Service
   - Fetch current metrics
   - Compare with historical baseline
   - Detect drops (threshold-based)
   ↓
3. Recommendation Engine
   - Check if rule-based suggestion exists
   - If complex scenario → Call AI
   - Generate actionable suggestions
   ↓
4. Notification Service
   - Format notification with KPI drop + suggestions
   - Send via Socket.IO (real-time)
   - Store in database for history
   ↓
5. Frontend
   - Display notification
   - Show KPI drop alert
   - Display suggestions
```

---

## Database Schema

### New Collections Needed:

```javascript
// KPI Thresholds (per brand)
const kpiThresholdSchema = {
  brandId: ObjectId,
  kpi: String, // 'addToCartRate', 'bounceRate', etc.
  threshold: Number, // e.g., 0.20 for 20% drop
  baseline: Number, // Historical average
  enabled: Boolean,
  notificationChannels: ['socket', 'email'], // Where to send alerts
  createdAt: Date,
  updatedAt: Date
}

// KPI Alerts History
const kpiAlertSchema = {
  brandId: ObjectId,
  kpi: String,
  currentValue: Number,
  previousValue: Number,
  dropPercentage: Number,
  threshold: Number,
  status: 'triggered' | 'resolved',
  recommendations: [String], // Array of suggestions
  notifiedAt: Date,
  resolvedAt: Date,
  metadata: Object // Additional context
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
1. ✅ Create KPI monitoring service module
2. ✅ Add database models for thresholds and alerts
3. ✅ Implement basic drop detection logic
4. ✅ Integrate with existing notification system
5. ✅ Add API endpoints for threshold management

### Phase 2: Rule-Based Recommendations (Week 2-3)
1. ✅ Create recommendation rule engine
2. ✅ Define rules for common KPIs
3. ✅ Test with real data
4. ✅ Add UI for viewing recommendations

### Phase 3: AI Integration (Week 3-4) - Optional
1. ✅ Integrate OpenAI/Claude API
2. ✅ Implement hybrid recommendation system
3. ✅ Add caching for AI responses
4. ✅ Test and optimize

### Phase 4: UI/UX (Week 4-5)
1. ✅ Notification UI components
2. ✅ KPI alert dashboard
3. ✅ Recommendation display
4. ✅ Threshold configuration UI

---

## Cost Analysis

### Rule-Based Only:
- **Cost**: $0/month
- **Latency**: <10ms
- **Scalability**: Unlimited

### AI-Powered (OpenAI GPT-4):
- **Cost**: ~$0.01-0.10 per recommendation
- **Monthly (1000 brands, 10 alerts/month)**: ~$100-1000/month
- **Latency**: 1-3 seconds
- **Scalability**: Rate limited by API

### Hybrid Approach:
- **Cost**: ~$10-100/month (only use AI for 10-20% of cases)
- **Latency**: <10ms for rules, 1-3s for AI
- **Scalability**: High

---

## Final Recommendation

### **Start with Option 1 (Integrated Service) + Option C (Hybrid Recommendations)**

**Why:**
1. **Fastest to market** - Can build in 2-3 weeks
2. **Cost-effective** - Minimal infrastructure changes
3. **Scalable** - Can extract to microservices later if needed
4. **Flexible** - Easy to add AI later without major refactoring

**Implementation Steps:**
1. Build rule-based system first (Week 1-2)
2. Add AI integration for complex cases (Week 3)
3. Monitor usage and costs
4. Optimize based on real-world data

**Future Migration Path:**
- If you need to scale, extract to microservices (Option 2)
- Keep modular structure to make extraction easier

---

## Next Steps

1. **Decide on architecture** (I recommend Option 1)
2. **Define KPI thresholds** (what % drop triggers alert?)
3. **Create rule database** (common suggestions for each KPI)
4. **Set up monitoring cron job** (when to check for drops?)
5. **Design notification UI** (how to display alerts?)

Would you like me to start implementing Option 1 with rule-based recommendations?

