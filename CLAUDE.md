# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Waterpolo Referee Assistant is a hackathon project (AI Accelerate 2025) that provides intelligent rule search using Elasticsearch + Vertex AI (RAG), advanced statistics, and real-time score tracking for water polo referees.

## Architecture

This is a multi-component project with:

- **Frontend**: React app (port 3000) with water polo rule search interface, score tracking, and statistics dashboard
- **Backend**: Node.js Express server (port 3001) providing REST API for rule search and statistics
- **Elasticsearch**: Indexes water polo rules for intelligent search with fuzzy matching
- **Google Cloud Vertex AI**: Powers RAG (Retrieval-Augmented Generation) for enhanced rule search
- **Data Storage**: Firestore for real-time match data, BigQuery for historical statistics

## Development Commands

### Quick Start

```bash
# Start entire MVP (recommended for development)
./scripts/start_mvp.sh
```

This script handles dependency installation, environment checks, Elasticsearch indexing, and starts both frontend and backend services.

### Individual Components

**Frontend (React)**:

```bash
cd frontend
npm install
npm start          # Development server on port 3000
npm run build      # Production build
npm test           # Run tests
```

**Backend (Node.js)**:

```bash
cd backend
npm install
npm start          # Start server on port 3001
```

**Elasticsearch Setup**:

```bash
cd elastic
npm install
node setup_index.js  # Create and populate indices
node test_connection.js  # Test Elasticsearch connection
```

## Environment Configuration

Create `.env` file in `backend/` directory:

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
ELASTICSEARCH_HOST=https://your-elasticsearch-host
ELASTICSEARCH_API_KEY=your-api-key
```

## Key Files and Structure

- `backend/server.js`: Express API server with Elasticsearch and Vertex AI integration
- `elastic/setup_index.js`: Creates and populates Elasticsearch indices for rules and definitions
- `elastic/rules.json`: Water polo rules data for indexing
- `elastic/definitions.json`: Water polo definitions data
- `frontend/src/App.js`: Main React application component
- `scripts/start_mvp.sh`: Complete development environment setup script

## API Endpoints

- `GET /health`: Health check with Elasticsearch connection status
- `GET /api/stats`: Retrieve count of indexed rules and definitions
- `GET /api/article/:articleNumber`: Fetch a specific article by its number (e.g., `/api/article/3.3`)
- `POST /api/search/rules`: Search water polo rules (requires `query` parameter, optional `maxResults`)
- `POST /api/agent/ask`: Conversational agent with RAG (requires `question`, optional `maxContext`). Uses Vertex AI (Gemini 1.5 Flash) with fallback to direct Elasticsearch results

## Testing

- Frontend: Uses React Testing Library (`npm test` in frontend/)
- Backend: No test framework currently configured
- Elasticsearch: Connection testing via `elastic/test_connection.js`

## Deployment

Designed for Google Cloud:

- Backend: Google Cloud Run
- Frontend: Firebase Hosting or Vercel
- Functions: Google Cloud Functions for real-time alerts

## Important Notes

- All components use ES modules (`"type": "module"` in package.json)
- Elasticsearch indices: `waterpolo-rules` and `waterpolo-definitions`
- Backend requires Node.js 18+ (checked by start script)
- Frontend uses React 19+ with modern testing library setup and functional components with hooks
- Logs are written to `logs/` directory when using start script
- RAG pipeline: Elasticsearch retrieves relevant rules → Vertex AI generates natural language responses with article citations
- Frontend has two modes: conversational agent (chat interface) and direct rule search
- Article references in chat are clickable - clicking opens a modal with full article details
- Elasticsearch mappings include French and English analyzers for multilingual support
