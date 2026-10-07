# Restaurant Feedback Intelligence Platform

A production-ready full-stack AI SaaS platform for modern restaurant operations. Restaurant owners and hospitality managers can automatically analyze customer feedback, extract aspect-level sentiments, identify recurring bottlenecks, view aggregated analytics, and ask questions across historical reviews using Retrieval-Augmented Generation (RAG).

---

## 1. Project Overview & Architecture

### Core Feedback Processing Pipeline
```
Customer Review (Direct / Web / CSV)
       │
       ▼
Validation & MongoDB Raw Review Store
       │
       ▼
Gemini Flash Structured Aspect Analysis
       │
       ▼
JSON Schema Validation & Analysis Storage
       │
       ▼
Gemini Embedding Generation
       │
       ▼
Vector Database Indexing
       │
       ▼
Real-Time Analytics & Problem Tracking
       │
       ▼
Executive Dashboard & Alerts
```

### RAG Historical Query Pipeline
```
User Natural Language Question
       │
       ▼
Query Embedding Generation
       │
       ▼
Semantic Vector Search (Cosine Similarity / Qdrant)
       │
       ▼
Retrieve Top K Grounded Reviews
       │
       ▼
Strict Evidence-Based Gemini Prompting
       │
       ▼
Transparent Answer with Clickable Source Quotes
```

---

## 2. Key Features

- **Automated Aspect Extraction**: Automatically detects predefined restaurant aspects (`food_quality`, `taste`, `temperature`, `service`, `staff`, `waiting_time`, `price`, `ambience`, `cleanliness`, `portion_size`, `delivery`, `packaging`, `menu`, `value_for_money`) with granular sentiment scores and direct evidence quotes.
- **Recurring Issue Detection & Severity**: Automatically classifies problems by priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and tracks whether occurrences are rising or stable over time.
- **RAG "Ask Your Reviews"**: Ask natural-language operational questions (e.g., *"What do customers think about our pizza?"* or *"Why are negative reviews increasing?"*). Answers are strictly grounded in retrieved reviews without hallucinations.
- **SaaS Executive Dashboard**: Real-time KPI cards, Recharts sentiment trend line charts, top positive aspects, top problems, and AI business recommendations.
- **Batch CSV Import**: Drag-and-drop or paste bulk CSV files with interactive preview, validation, and automated queue processing.
- **Manual Staff Review Entry**: Intuitive form with a progressive stepper showing real-time AI extraction stages.
- **50+ Realistic Seeded Reviews**: Pre-populated with authentic restaurant feedback covering Italian bistro dishes, delivery experiences, service delays, and temperature issues.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React
- **Backend**: Node.js, Express, TypeScript, TSX
- **AI Engine**: Google Gemini API (`@google/genai` SDK, `gemini-3.8-flash` model)
- **Embeddings**: `gemini-embedding-2-preview` with modular local semantic fallback
- **Vector Database**: Cosine Vector Engine (modular architecture ready for Qdrant)
- **Database**: MongoDB schema specification with persistent embedded document store
- **Authentication**: JWT token-based auth with bcrypt password hashing
- **Deployment**: Docker, Docker Compose, production-ready build configuration

---

## 4. Folder Structure

```
├── server.ts                     # Express server & Vite integration
├── server/
│   ├── types/                   # Backend domain interfaces
│   ├── db/
│   │   ├── database.ts          # MongoDB document store engine
│   │   └── seedData.ts          # 50+ realistic verified reviews
│   ├── services/
│   │   ├── ai/
│   │   │   ├── aiProvider.ts    # AIProvider interface
│   │   │   ├── geminiProvider.ts# Gemini 3.8 Flash & fallback provider
│   │   │   ├── reviewAnalyzer.ts# Review analyzer service
│   │   │   ├── embeddingService.ts# Semantic embedding generator
│   │   │   ├── insightService.ts# Executive AI summaries
│   │   │   └── ragService.ts    # Evidence-grounded RAG query pipeline
│   │   ├── vector/
│   │   │   └── vectorDatabase.ts# Modular vector database & cosine math
│   │   ├── review/
│   │   │   └── reviewProcessor.ts# Complete review ingestion pipeline
│   │   └── analytics/
│   │       └── analyticsService.ts# KPI & chart aggregation
│   ├── middleware/
│   │   └── auth.ts              # JWT authentication & session handling
│   └── routes/
│       ├── authRoutes.ts        # Register, login, profile
│       ├── restaurantRoutes.ts  # Restaurant management
│       ├── reviewRoutes.ts      # Reviews CRUD & CSV import
│       ├── analyticsRoutes.ts   # Overview, trends, aspects, issues
│       ├── ragRoutes.ts         # Natural language RAG endpoint
│       └── insightRoutes.ts     # AI summary & demo reset
├── src/
│   ├── components/
│   │   ├── common/              # StatCard, Badges, FeedbackStates
│   │   ├── layout/              # Sidebar & TopNav
│   │   └── reviews/             # ReviewDetailDrawer
│   ├── pages/
│   │   ├── DashboardPage.tsx    # KPIs, trends, aspects, problems
│   │   ├── ReviewsPage.tsx      # Filterable reviews table
│   │   ├── AnalyticsPage.tsx    # Sentiment & rating distributions
│   │   ├── IssuesPage.tsx       # Recurring problem manager
│   │   ├── InsightsPage.tsx     # AI business summary & recommendations
│   │   ├── AskReviewsPage.tsx   # RAG conversational chat
│   │   ├── AddReviewPage.tsx    # Staff manual review input form
│   │   ├── ImportPage.tsx       # CSV file upload & preview
│   │   └── SettingsPage.tsx     # Configuration & seed benchmark controls
│   ├── services/
│   │   └── api.ts               # Frontend API client
│   └── App.tsx                  # Main application router & state
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 5. Environment Variables & Setup

Create a `.env` file from `.env.example`:

```bash
# Server Port
PORT=3000

# Google Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# MongoDB Connection String (Optional: default persistent JSON store used if not set)
MONGODB_URI="mongodb://localhost:27017/restaurant_intelligence"

# JWT Secret
JWT_SECRET="super-secret-jwt-key-change-in-prod"

# Vector Database (Optional)
VECTOR_DB_URL=""
VECTOR_DB_API_KEY=""
```

---

## 6. Local Development & Running

### Install Dependencies
```bash
npm install
```

### Start Full-Stack Dev Server (Port 3000)
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Run with Docker Compose
```bash
docker-compose up --build
```

---

## 7. Example Review & Structured AI Response

### Customer Input
> *"Food was amazing but the pizza was cold. Staff was very friendly, but we waited 30 minutes for our order."*

### Structured Output
```json
{
  "overall_sentiment": "mixed",
  "sentiment_score": 0.15,
  "aspects": [
    {
      "aspect": "taste",
      "sentiment": "positive",
      "score": 0.92,
      "evidence": "Food was amazing"
    },
    {
      "aspect": "temperature",
      "sentiment": "negative",
      "score": -0.89,
      "evidence": "pizza was cold"
    },
    {
      "aspect": "staff",
      "sentiment": "positive",
      "score": 0.91,
      "evidence": "Staff was very friendly"
    },
    {
      "aspect": "waiting_time",
      "sentiment": "negative",
      "score": -0.95,
      "evidence": "waited 30 minutes"
    }
  ],
  "issues": [
    {
      "category": "food_temperature",
      "severity": "medium",
      "evidence": "pizza was cold"
    },
    {
      "category": "waiting_time",
      "severity": "high",
      "evidence": "waited 30 minutes"
    }
  ],
  "summary": "Customer liked the food and staff but complained about cold food and long waiting time.",
  "suggested_action": "Audit heat lamps at the pizza station and expedite dinner rush kitchen ticket pacing."
}
```

---

## 8. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Owner authentication |
| `POST` | `/api/auth/register` | Register new restaurant owner |
| `GET` | `/api/reviews` | List reviews with filters & pagination |
| `POST` | `/api/reviews` | Ingest review and run full AI pipeline |
| `GET` | `/api/reviews/:id` | Get raw review and AI analysis |
| `DELETE` | `/api/reviews/:id` | Delete review and remove vector embedding |
| `POST` | `/api/reviews/:id/analyze` | Re-run AI analysis on a review |
| `POST` | `/api/reviews/import` | Bulk CSV reviews import |
| `GET` | `/api/analytics/overview` | KPI counts and percentages |
| `GET` | `/api/analytics/sentiment` | Sentiment trends over 7d, 30d, 90d, 1y |
| `GET` | `/api/analytics/aspects` | Aspect sentiment breakdowns |
| `GET` | `/api/analytics/issues` | Recurring problems and priority ranking |
| `POST` | `/api/rag/ask` | Natural language question over historical reviews |
| `GET` | `/api/insights` | Fetch latest executive AI business summary |
| `POST` | `/api/insights/generate` | Trigger on-demand fresh AI insight synthesis |
| `POST` | `/api/insights/reset-demo` | Reseed with 50+ benchmark customer reviews |
