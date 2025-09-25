# Elasticsearch Configuration

This directory contains scripts to set up and manage the Elasticsearch index for water polo rules.

## Index Setup
1. Install the Elasticsearch client:
   ```bash
   npm install @elastic/elasticsearch
   ```

2. Run the index setup script:
   ```bash
   node setup_index.js
   ```

## Indexing Rules
To index the water polo rules, run:
```bash
node index_rules.js
```

This will load the rules from `data/rules.json` and index them in Elasticsearch.