# Setup Guide

## Prerequisites
- Google Cloud account with billing enabled (free credits available)
- Elastic Cloud account (free trial)
- Node.js (v18+) or Python (3.9+)

## Environment Variables
Create a `.env` file in the `backend` directory with the following variables:

```env
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json

# Elasticsearch
ELASTICSEARCH_HOST=https://your-elasticsearch-host
ELASTICSEARCH_API_KEY=your-api-key

# Fivetran (if applicable)
FIVETRAN_API_KEY=your-fivetran-api-key
FIVETRAN_API_SECRET=your-fivetran-api-secret
```

## Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/qveys/waterpolo-referee-assistant.git
   ```

2. **Install dependencies**:
   - For Node.js backend:
     ```bash
     cd backend
     npm install
     ```
   - For Python backend:
     ```bash
     cd backend
     pip install -r requirements.txt
     ```

3. **Set up Elasticsearch**:
   - Create an index for water polo rules:
     ```bash
     cd elastic
     ./setup_index.sh
     ```

4. **Deploy to Google Cloud**:
   - Follow the [Google Cloud Run documentation](https://cloud.google.com/run/docs/deploying) to deploy the backend.

## Running Locally
- Start the backend:
  ```bash
  cd backend
  npm start  # or python main.py
  ```
- Start the frontend:
  ```bash
  cd frontend
  flutter run  # or npm start
  ```