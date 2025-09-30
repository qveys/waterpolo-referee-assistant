import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '../backend/.env' });

const client = new Client({
  node: process.env.ELASTICSEARCH_HOST,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  }
});

// ==================== CONFIGURATION INDICES ====================

const RULES_INDEX = 'waterpolo-rules';
const DEFINITIONS_INDEX = 'waterpolo-definitions';

const rulesMapping = {
  mappings: {
    properties: {
      article: { type: 'keyword' },
      title: { 
        type: 'text',
        fields: {
          keyword: { type: 'keyword' }
        }
      },
      content: { 
        type: 'text',
        analyzer: 'french',
        fields: {
          english: { type: 'text', analyzer: 'english' }
        }
      },
      category: { type: 'keyword' },
      keywords: { type: 'keyword' },
      indexed_at: { type: 'date' }
    }
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        french: {
          type: 'french',
          stopwords: '_french_'
        }
      }
    }
  }
};

const definitionsMapping = {
  mappings: {
    properties: {
      title: { type: 'keyword' },
      word: { 
        type: 'text',
        fields: {
          keyword: { type: 'keyword' }
        }
      },
      definition: { 
        type: 'text',
        analyzer: 'french'
      },
      indexed_at: { type: 'date' }
    }
  }
};

// ==================== FONCTIONS UTILITAIRES ====================

async function deleteIndexIfExists(indexName) {
  try {
    const exists = await client.indices.exists({ index: indexName });
    if (exists) {
      console.log(`📦 Suppression index existant: ${indexName}`);
      await client.indices.delete({ index: indexName });
    }
  } catch (error) {
    console.error(`Erreur lors de la suppression de ${indexName}:`, error.message);
  }
}

async function createIndex(indexName, mapping) {
  try {
    console.log(`🔨 Création index: ${indexName}`);
    await client.indices.create({
      index: indexName,
      body: mapping
    });
    console.log(`✅ Index créé: ${indexName}`);
  } catch (error) {
    console.error(`Erreur création ${indexName}:`, error.message);
    throw error;
  }
}

async function bulkIndex(indexName, documents) {
  const operations = documents.flatMap(doc => [
    { index: { _index: indexName } },
    { ...doc, indexed_at: new Date().toISOString() }
  ]);

  try {
    const result = await client.bulk({ 
      refresh: true, 
      body: operations 
    });

    if (result.errors) {
      const erroredDocuments = result.items.filter(item => item.index?.error);
      console.error(`❌ ${erroredDocuments.length} documents ont échoué`);
      erroredDocuments.forEach((doc, idx) => {
        console.error(`  - Document ${idx}:`, doc.index.error);
      });
    } else {
      console.log(`✅ ${documents.length} documents indexés dans ${indexName}`);
    }

    return result;
  } catch (error) {
    console.error(`Erreur bulk indexing ${indexName}:`, error.message);
    throw error;
  }
}

// ==================== ENRICHISSEMENT DONNÉES ====================

function categorizeRule(title, content) {
  const categories = {
    'CHAMP DE JEU': 'terrain',
    'EQUIPES ET REMPLACANTS': 'equipes',
    'DUREE DU MATCH': 'temps',
    'DEBUT DU MATCH': 'debut',
    'BUT MARQUE': 'scoring',
    'FAUTE': 'fautes',
    'EXCLUSION': 'exclusions',
    'PENALTY': 'penalties',
    'ARBITRES': 'arbitrage',
    'PROCEDURES': 'procedures'
  };

  for (const [key, value] of Object.entries(categories)) {
    if (title.includes(key) || content.includes(key)) {
      return value;
    }
  }
  return 'general';
}

function extractKeywords(content) {
  const commonKeywords = [
    'faute', 'exclusion', 'but', 'gardien', 'penalty', 'temps', 
    'ballon', 'arbitre', 'joueur', 'équipe', 'ligne', 'zone'
  ];

  const keywords = new Set();
  const contentLower = content.toLowerCase();

  for (const keyword of commonKeywords) {
    if (contentLower.includes(keyword)) {
      keywords.add(keyword);
    }
  }

  return Array.from(keywords);
}

// ==================== SCRIPT PRINCIPAL ====================

async function setupElasticsearch() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Setup Elasticsearch - Waterpolo MVP   ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // Test connexion
    console.log('🔌 Test connexion Elasticsearch...');
    await client.ping();
    console.log('✅ Connexion établie\n');

    // Lecture fichiers JSON
    console.log('📖 Lecture fichiers de données...');
    const rules = JSON.parse(fs.readFileSync('rules.json', 'utf-8'));
    const definitions = JSON.parse(fs.readFileSync('definitions.json', 'utf-8'));
    console.log(`  - ${rules.length} règles trouvées`);
    console.log(`  - ${definitions.length} définitions trouvées\n`);

    // Setup index Rules
    await deleteIndexIfExists(RULES_INDEX);
    await createIndex(RULES_INDEX, rulesMapping);

    // Enrichissement règles
    const enrichedRules = rules.map(rule => ({
      ...rule,
      category: categorizeRule(rule.title, rule.content),
      keywords: extractKeywords(rule.content)
    }));

    await bulkIndex(RULES_INDEX, enrichedRules);

    // Setup index Definitions
    await deleteIndexIfExists(DEFINITIONS_INDEX);
    await createIndex(DEFINITIONS_INDEX, definitionsMapping);
    await bulkIndex(DEFINITIONS_INDEX, definitions);

    // Vérification
    console.log('\n📊 Vérification finale...');
    const rulesCount = await client.count({ index: RULES_INDEX });
    const defsCount = await client.count({ index: DEFINITIONS_INDEX });

    console.log(`\n✅ Setup terminé avec succès !`);
    console.log(`   - ${rulesCount.count} règles indexées`);
    console.log(`   - ${defsCount.count} définitions indexées`);

    // Test recherche simple
    console.log('\n🔍 Test recherche...');
    const testSearch = await client.search({
      index: RULES_INDEX,
      size: 3,
      query: {
        match: { content: 'exclusion' }
      }
    });

    console.log(`   - ${testSearch.hits.total.value} résultats pour "exclusion"`);
    console.log('   - Top 3 articles:', testSearch.hits.hits.map(h => h._source.article).join(', '));

  } catch (error) {
    console.error('\n❌ Erreur setup:', error.message);
    process.exit(1);
  }
}

// Exécution
setupElasticsearch()
  .then(() => {
    console.log('\n🎉 Elasticsearch prêt pour le MVP !\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
