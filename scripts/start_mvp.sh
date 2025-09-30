#!/bin/bash

# ========================================
# Script de lancement MVP
# Waterpolo Referee Assistant
# ========================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  Waterpolo Referee Assistant - MVP     ║"
echo "║  AI Accelerate Hackathon 2025          ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ELASTIC_DIR="$PROJECT_ROOT/elastic"

# ========================================
# Vérifications
# ========================================

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 n'est pas installé${NC}"
        exit 1
    else
        echo -e "${GREEN}✓${NC} $1 installé"
    fi
}

check_env_file() {
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        echo -e "${RED}❌ Fichier .env manquant dans backend/${NC}"
        exit 1
    else
        echo -e "${GREEN}✓${NC} Fichier .env présent"
    fi
}

echo -e "\n${YELLOW}📋 Vérification des prérequis...${NC}"

check_command "node"
check_command "npm"
check_env_file

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ requise${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js v$NODE_VERSION"

# ========================================
# Installation dépendances
# ========================================

echo -e "\n${YELLOW}📦 Installation des dépendances...${NC}"

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "  → Backend dependencies..."
    cd "$BACKEND_DIR"
    npm install --silent
    echo -e "${GREEN}✓${NC} Backend prêt"
else
    echo -e "${GREEN}✓${NC} Backend déjà installé"
fi

if [ ! -d "$ELASTIC_DIR/node_modules" ]; then
    echo "  → Elastic dependencies..."
    cd "$ELASTIC_DIR"
    npm install --silent
    echo -e "${GREEN}✓${NC} Elastic prêt"
else
    echo -e "${GREEN}✓${NC} Elastic déjà installé"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "  → Frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install --silent
    echo -e "${GREEN}✓${NC} Frontend prêt"
else
    echo -e "${GREEN}✓${NC} Frontend déjà installé"
fi

# ========================================
# Configuration Elasticsearch
# ========================================

echo -e "\n${YELLOW}🔧 Configuration Elasticsearch...${NC}"

set -a
source "$BACKEND_DIR/.env"
set +a

echo "  → Indexation des règles..."
cd "$ELASTIC_DIR"
if node setup_index.js; then
    echo -e "${GREEN}✓${NC} Règles indexées avec succès"
else
    echo -e "${YELLOW}⚠${NC} Erreur lors de l'indexation"
fi

# ========================================
# Lancement services
# ========================================

echo -e "\n${YELLOW}🚀 Lancement des services...${NC}"

LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Cleanup existing processes on ports 3000 and 3001
echo "  → Nettoyage des ports..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

cleanup() {
    echo -e "\n${YELLOW}🛑 Arrêt des services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓${NC} Services arrêtés"
    exit 0
}
trap cleanup INT

echo "  → Backend sur port 3001..."
cd "$BACKEND_DIR"
node server.js > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready (check health endpoint)
echo "  → Attente démarrage backend..."
for i in {1..10}; do
    sleep 1
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend lancé (PID: $BACKEND_PID)"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Erreur démarrage backend${NC}"
        cat "$LOG_DIR/backend.log"
        exit 1
    fi
done

echo "  → Frontend sur port 3000..."
cd "$FRONTEND_DIR"
PORT=3000 BROWSER=none npm start > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "  → Attente démarrage frontend..."
for i in {1..30}; do
    sleep 1
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend lancé (PID: $FRONTEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Erreur démarrage frontend${NC}"
        echo -e "${YELLOW}Dernières lignes du log:${NC}"
        tail -20 "$LOG_DIR/frontend.log"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done

# ========================================
# Informations
# ========================================

echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║         🎉 MVP PRÊT À UTILISER 🎉      ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📱 Frontend:${NC}   http://localhost:3000"
echo -e "${BLUE}🔌 Backend API:${NC} http://localhost:3001"
echo -e "${BLUE}📊 Health Check:${NC} http://localhost:3001/health"
echo ""
echo -e "${YELLOW}📝 Logs: $LOG_DIR${NC}"
echo -e "${YELLOW}⌨️  Ctrl+C pour arrêter${NC}"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
fi

wait
