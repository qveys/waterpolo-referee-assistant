const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');

const client = new Client({
  node: process.env.ELASTICSEARCH_HOST,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  }
});

async function indexRules() {
  const rules = JSON.parse(fs.readFileSync('rules.json'));
  const defs = JSON.parse(fs.readFileSync('definitions.json'));

  for (const rule of rules) {
    await client.index({
      index: 'waterpolo-rules',
      body: {
        title: rule.title,
        content: rule.content,
        article: rule.article
      }
    });
  }

  console.log('Règles indexées avec succès !');

  for (const def of defs) {
    await client.index({
      index: 'waterpolo-definitions',
      body: {
        title: def.title,
        word: def.word,
        definition: def.definition
      }
    });
  }

  console.log('Définitions indexées avec succès !');
}

indexRules().catch(console.error);
