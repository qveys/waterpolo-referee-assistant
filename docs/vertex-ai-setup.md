# Guide de Configuration Vertex AI

Ce guide explique comment activer et configurer Vertex AI pour l'assistant arbitre water-polo.

## Prérequis

- Un compte Google Cloud avec facturation activée
- Le projet Google Cloud `waterpolo-referee-assistant` (ou votre propre projet)
- Droits administrateur sur le projet

## Étapes de Configuration

### 1. Activer l'API Vertex AI

```bash
# Via gcloud CLI
gcloud services enable aiplatform.googleapis.com --project=waterpolo-referee-assistant

# Ou via la Console Google Cloud:
# https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
```

### 2. Vérifier l'accès aux modèles Gemini

Les modèles Gemini sont disponibles dans certaines régions. Vérifiez:

```bash
gcloud ai models list --region=us-central1 --project=waterpolo-referee-assistant
```

Si vous voyez une erreur, essayez d'autres régions:
- `us-central1` (recommandé)
- `us-east4`
- `europe-west4`

### 3. Créer un Service Account (si nécessaire)

```bash
# Créer le service account
gcloud iam service-accounts create waterpolo-referee-sa \
    --display-name="Waterpolo Referee Assistant" \
    --project=waterpolo-referee-assistant

# Attribuer les permissions nécessaires
gcloud projects add-iam-policy-binding waterpolo-referee-assistant \
    --member="serviceAccount:waterpolo-referee-sa@waterpolo-referee-assistant.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Créer la clé JSON
gcloud iam service-accounts keys create waterpolo-referee-sa-key.json \
    --iam-account=waterpolo-referee-sa@waterpolo-referee-assistant.iam.gserviceaccount.com \
    --project=waterpolo-referee-assistant
```

### 4. Configurer les credentials dans le backend

Placez le fichier `waterpolo-referee-sa-key.json` dans le dossier `backend/`:

```bash
mv waterpolo-referee-sa-key.json backend/
```

Vérifiez le fichier `.env` dans `backend/`:

```env
GOOGLE_CLOUD_PROJECT_ID=waterpolo-referee-assistant
GOOGLE_APPLICATION_CREDENTIALS=waterpolo-referee-sa-key.json
ELASTICSEARCH_HOST=https://your-elasticsearch-host
ELASTICSEARCH_API_KEY=your-elasticsearch-api-key
```

### 5. Tester la configuration

```bash
# Redémarrer le backend
cd backend
npm start
```

Tester l'agent:

```bash
curl -X POST http://localhost:3001/api/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Quelle est la durée d'\''une exclusion ?"}'
```

La réponse devrait indiquer `"mode": "vertex-ai"` au lieu de `"mode": "fallback"`.

## Dépannage

### Erreur: "Model not found"

**Problème:** Le projet n'a pas accès aux modèles Gemini.

**Solutions:**
1. Vérifier que l'API Vertex AI est activée
2. Essayer une autre région dans `backend/server.js`:
   ```javascript
   const vertexAI = new VertexAI({
     project: projectId,
     location: 'us-east4'  // Essayer différentes régions
   });
   ```
3. Vérifier que la facturation est activée sur le projet
4. Contacter le support Google Cloud si le problème persiste

### Erreur: "Permission denied"

**Problème:** Le service account n'a pas les bonnes permissions.

**Solution:**
```bash
gcloud projects add-iam-policy-binding waterpolo-referee-assistant \
    --member="serviceAccount:waterpolo-referee-sa@waterpolo-referee-assistant.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

### Erreur: "Credentials not found"

**Problème:** Le chemin vers le fichier JSON est incorrect.

**Solutions:**
1. Vérifier que le fichier existe: `ls -la backend/waterpolo-referee-sa-key.json`
2. Vérifier le chemin dans `.env`
3. Essayer un chemin absolu dans `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/backend/waterpolo-referee-sa-key.json
   ```

## Commandes Utiles

```bash
# Vérifier l'authentification
gcloud auth list

# Vérifier le projet actif
gcloud config get-value project

# Lister les APIs activées
gcloud services list --enabled --project=waterpolo-referee-assistant

# Voir les logs d'erreur Vertex AI
tail -f logs/backend.log | grep -i vertex
```

## Coûts

Les modèles Gemini 1.5 Flash ont un coût par requête. Pour le développement:
- **Gemini 1.5 Flash:** ~$0.00002 par 1000 caractères d'input
- Budget estimé pour le hackathon: <$1

Pour la production, considérer:
- Mettre en place des quotas
- Surveiller l'utilisation via Google Cloud Console
- Utiliser le mode fallback comme solution de secours

## Alternative: Mode Fallback

Si Vertex AI n'est pas disponible ou trop coûteux, le système fonctionne parfaitement en mode fallback qui:
- Retourne les 3 articles les plus pertinents
- Utilise uniquement Elasticsearch (gratuit avec Elastic Cloud trial)
- Fournit des réponses précises avec citations d'articles

Le mode fallback est activé automatiquement si Vertex AI échoue.