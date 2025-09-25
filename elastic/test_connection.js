import { Client } from '@elastic/elasticsearch';

const client = new Client({
    node: 'https://8feefc0a14be471385c422c5d248909e.europe-west1.gcp.cloud.es.io:443',
    auth: {
      apiKey: 'NXVMTmdaa0JGSDVfUHpLN3lvUG46RzVEaV9SWVBEc1M4Z2hzWkx3S2tvZw=='
    },
  });

async function testConnection() {
  const info = await client.info();
  console.log(info);
}

testConnection();
