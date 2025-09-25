# Waterpolo Referee Assistant

**A digital assistant for water polo referees** developed for the **AI Accelerate 2025 Hackathon**.

## 🏆 Goals
- **Intelligent rule search** using Elasticsearch + Vertex AI (RAG).
- **Advanced statistics** and real-time score tracking.
- Integration with **Google Cloud** and **Fivetran** (optional).

## 🛠 Technologies
| Component       | Technology                          |
|-----------------|--------------------------------------|
| Frontend        | Flutter/React                        |
| Backend         | Node.js/Python (FastAPI)             |
| Search          | Elasticsearch + Vertex AI (RAG)      |
| Data            | Firestore, BigQuery, Fivetran SDK    |
| Cloud           | Google Cloud (Cloud Run, Functions)  |

## 🚀 Installation
### Prerequisites
- [Google Cloud](https://cloud.google.com/) account (free credits available).
- [Elastic Cloud](https://www.elastic.co/elasticsearch/) account (free trial).
- Node.js/Python depending on your backend choice.

### Steps
1. Clone this repository:
   ```bash
   git clone https://github.com/qveys/waterpolo-referee-assistant.git
   ```
2. Set up environment variables (see `docs/setup.md`).

## 📂 Project Structure
```
/
├── README.md          # Project overview and setup instructions
├── LICENSE            # MIT License
├── docs/              # Technical and user documentation
│   ├── architecture.md # Architecture diagram
│   └── setup.md       # Setup guide
├── frontend/          # Flutter/React application code
├── backend/           # Node.js/Python backend code
├── elastic/           # Elasticsearch configuration and indexing scripts
├── fivetran/          # Fivetran connector code (Fivetran Challenge)
├── scripts/           # Utility scripts (e.g., data import)
└── assets/            # Mockups, logos, and other assets
```

## 📄 License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.