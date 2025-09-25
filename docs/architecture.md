# Project Architecture

## Overview
The Waterpolo Referee Assistant is built with a modular architecture to separate concerns and ensure scalability.

### Frontend
- **Framework**: Flutter (for mobile) or React (for web)
- **Hosting**: Firebase Hosting or Vercel
- **Features**:
  - Rule search interface
  - Real-time score tracking
  - Statistics dashboard

### Backend
- **Framework**: Node.js (Express) or Python (FastAPI)
- **Hosting**: Google Cloud Run
- **Features**:
  - REST API for rule search and statistics
  - Integration with Elasticsearch and Vertex AI
  - Authentication via Firebase Auth

### Data Layer
- **Elasticsearch**: Indexes water polo rules for intelligent search
- **Firestore**: Stores real-time match data
- **BigQuery**: Stores historical statistics
- **Fivetran Connector**: Imports external match data (optional)

### Cloud Services
- **Google Cloud Vertex AI**: Powers the RAG (Retrieval-Augmented Generation) for rule search
- **Google Cloud Functions**: Handles real-time alerts and notifications
- **BigQuery**: Analyzes match statistics

## Data Flow
1. **Rule Search**: User query → Elasticsearch → Vertex AI → Response
2. **Statistics**: Match data → Firestore/BigQuery → Dashboard
3. **Score Tracking**: Real-time updates → Firestore → Alerts