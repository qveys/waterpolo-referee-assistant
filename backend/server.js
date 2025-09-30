import express from 'express';
import cors from 'cors';
import { Client } from '@elastic/elasticsearch';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logStream = fs.createWriteStream(path.join(logsDir, 'backend.log'), { flags: 'a' });
const emitConsole = process.stdout.isTTY;
logStream.on('error', error => {
  const message = `Logger stream error: ${error.message}`;
  if (emitConsole) console.error(message);
  else process.stderr.write(`${message}\n`);
});

const sanitize = value => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = sanitize(val);
      return acc;
    }, {});
  }
  return value;
};

const log = (level, message, metadata) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(metadata ? { metadata: sanitize(metadata) } : {})
  };
  const entry = `${JSON.stringify(payload)}\n`;
  if (logStream.writable) logStream.write(entry);
  if (emitConsole) {
    if (level === 'error' || level === 'warn') {
      console.error(entry.trim());
    } else {
      console.log(entry.trim());
    }
  }
};

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  log('info', 'Incoming request', { method: req.method, url: req.originalUrl, body: req.body, query: req.query, ip: req.ip });
  res.on('finish', () => {
    log('info', 'Request completed', { method: req.method, url: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
});
const esNode = process.env.ELASTICSEARCH_HOST;
const esApiKey = process.env.ELASTICSEARCH_API_KEY;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

const missingConfig = [];
if (!esNode) missingConfig.push('ELASTICSEARCH_HOST');
if (!esApiKey) missingConfig.push('ELASTICSEARCH_API_KEY');
if (!projectId) missingConfig.push('GOOGLE_CLOUD_PROJECT_ID');

if (missingConfig.length) {
  log('error', 'Configuration manquante', { missingConfig });
  process.exit(1);
}

const elasticClient = new Client({ node: esNode, auth: { apiKey: esApiKey } });
const vertexAI = new VertexAI({ project: projectId, location: 'us-central1' });

app.get('/health', async (req, res) => {
  try {
    await elasticClient.ping();
    res.json({ status: 'ok', elasticsearch: 'connected' });
  } catch (error) {
    log('error', 'Health check failed', { error: error.message });
    res.status(503).json({ status: 'error', error: error.message });
  }
});

app.post('/api/search/rules', async (req, res) => {
  try {
    const { query, maxResults = 5 } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const response = await elasticClient.search({
      index: 'waterpolo-rules',
      size: maxResults,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query,
                fields: ['content^3', 'title^2', 'keywords^2'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            },
            {
              multi_match: {
                query,
                fields: ['content', 'title'],
                type: 'phrase',
                boost: 2
              }
            }
          ]
        }
      },
      highlight: { fields: { content: { pre_tags: ['<mark>'], post_tags: ['</mark>'] } } }
    });

    const results = response.hits.hits.map(hit => ({
      article: hit._source.article,
      title: hit._source.title,
      content: hit._source.content,
      score: hit._score,
      highlight: hit.highlight?.content?.[0]
    }));

    log('info', 'Rule search results', { query, maxResults, total: response.hits.total.value });
    res.json({ query, results, total: response.hits.total.value });
  } catch (error) {
    log('error', 'Search failed', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Search failed' });
  }
});
app.post('/api/agent/ask', async (req, res) => {
  try {
    const { question, maxContext = 10 } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    // Expand query with common water polo terms
    const expandQuery = (q) => {
      const expansions = {
        'durée.*exclusion': 'exclusion secondes temps',
        'combien.*joueur': 'joueur équipe nombre',
        'penalty|pénalty': 'penalty pénalty 5 mètres',
        'gardien': 'gardien but bonnet rouge',
        'temps.*jeu': 'période minute temps durée',
        'faute': 'faute ordinaire exclusion'
      };

      let expanded = q;
      for (const [pattern, addition] of Object.entries(expansions)) {
        if (new RegExp(pattern, 'i').test(q)) {
          expanded += ' ' + addition;
        }
      }
      return expanded;
    };

    const expandedQuery = expandQuery(question);

    // Use bool query with should clauses for better relevance
    const searchResponse = await elasticClient.search({
      index: 'waterpolo-rules',
      size: maxContext,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query: expandedQuery,
                fields: ['content^4', 'title^3', 'keywords^2'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            },
            {
              multi_match: {
                query: question,
                fields: ['content^2', 'title'],
                type: 'phrase',
                boost: 3
              }
            },
            {
              match: {
                keywords: {
                  query: expandedQuery,
                  boost: 2
                }
              }
            }
          ],
          minimum_should_match: 1
        }
      }
    });

    const rules = searchResponse.hits.hits;
    if (rules.length === 0) {
      log('info', 'Agent no rules found', { question });
      return res.json({ question, answer: "Aucune règle trouvée dans la base de données. Veuillez reformuler votre question.", references: [] });
    }

    const context = rules.map((hit, idx) => `[${idx + 1}] Article ${hit._source.article}: ${hit._source.title}\n${hit._source.content}`).join('\n\n');

    try {
      const model = vertexAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      });

      const prompt = `Tu es un expert en règles de water-polo FINA. Tu dois répondre de manière précise et détaillée aux questions sur les règles.

CONTEXTE - RÈGLES PERTINENTES:
${context}

QUESTION: ${question}

INSTRUCTIONS:
- Fournis une réponse complète et détaillée basée UNIQUEMENT sur les règles fournies ci-dessus
- Cite TOUJOURS les articles exacts (ex: "Selon l'Article 20.15, ...")
- Si plusieurs articles sont pertinents, explique chacun clairement
- Utilise des exemples concrets si cela aide à la compréhension
- Structure ta réponse avec des points ou paragraphes si nécessaire
- Si les règles fournies ne contiennent pas l'information exacte, dis-le clairement

RÉPONSE:`;

      const result = await model.generateContent(prompt);
      const answer = result.response.candidates[0].content.parts[0].text;
      const references = rules.map(hit => ({ article: hit._source.article, title: hit._source.title }));
      log('info', 'Agent response generated with Vertex AI', { question, referencesCount: references.length });
      
      res.json({ question, answer, references, mode: 'vertex-ai' });
    } catch (aiError) {
      log('warn', 'Vertex AI generation failed, using fallback', { error: aiError.message });
      // Fallback: provide top 3 most relevant articles with full details
      const topRules = rules.slice(0, 3);
      const answer = topRules.map((rule, idx) =>
        `${idx + 1}. Article ${rule._source.article} - ${rule._source.title}:\n${rule._source.content}\n`
      ).join('\n');
      const references = rules.map(hit => ({ article: hit._source.article, title: hit._source.title }));
      log('info', 'Agent response generated via fallback', { question, referencesCount: references.length });
      res.json({ question, answer, references, mode: 'fallback' });
    }
  } catch (error) {
    log('error', 'Agent failed', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Agent failed' });
  }
});

app.get('/api/article/:articleNumber', async (req, res) => {
  try {
    const { articleNumber } = req.params;
    if (!articleNumber) return res.status(400).json({ error: 'Article number required' });

    const response = await elasticClient.search({
      index: 'waterpolo-rules',
      query: { term: { article: articleNumber } }
    });

    if (response.hits.hits.length === 0) {
      log('info', 'Article not found', { articleNumber });
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = response.hits.hits[0]._source;
    log('info', 'Article fetched', { articleNumber });
    res.json(article);
  } catch (error) {
    log('error', 'Failed to fetch article', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const rulesCount = await elasticClient.count({ index: 'waterpolo-rules' });
    const defsCount = await elasticClient.count({ index: 'waterpolo-definitions' }).catch(() => ({ count: 0 }));
    log('info', 'Stats fetched', { rules: rulesCount.count, definitions: defsCount.count });
    res.json({ rules: rulesCount.count, definitions: defsCount.count });
  } catch (error) {
    log('error', 'Stats unavailable', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Stats unavailable' });
  }
});

const PORT = 3001;
app.listen(PORT, () => log('info', 'Server listening', { port: PORT }));

process.on('unhandledRejection', reason => {
  log('error', 'Unhandled promise rejection', { reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason });
});

process.on('uncaughtException', error => {
  log('error', 'Uncaught exception', { error: { message: error.message, stack: error.stack } });
  process.exit(1);
});

process.on('exit', () => {
  if (logStream.writable) logStream.end();
});
