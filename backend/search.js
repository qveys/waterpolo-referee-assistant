import { Client } from '@elastic/elasticsearch';
import { VertexAI } from '@google-cloud/vertexai';

const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_HOST,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  }
});

const vertexAI = new VertexAI({ project: process.env.GOOGLE_CLOUD_PROJECT_ID, location: 'europe-west1' });

async function searchRules(query) {
  // 1. Recherche dans Elasticsearch
  const { body: results } = await elasticClient.search({
    index: 'waterpolo-rules',
    body: {
      query: {
        match: { content: query }
      }
    }
  });

  // 2. Utiliser Vertex AI pour reformuler la réponse
  const model = vertexAI.preview.getGenerativeModel({ model: 'gemini-pro' });
  const prompt = `Réponds à la question suivante en utilisant les règles fournies : ${query}\n\nRègles pertinentes : ${JSON.stringify(results.hits.hits)}`;
  const response = await model.generateContent(prompt);

  return response.response.text();
}

// Exemple d'utilisation
searchRules("Que faire en cas d'exclusion temporaire ?").then(console.log);
