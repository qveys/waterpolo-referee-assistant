import { Client } from '@elastic/elasticsearch';

const client = new Client({
    node: 'https://8feefc0a14be471385c422c5d248909e.europe-west1.gcp.cloud.es.io:443',
    auth: {
      apiKey: 'd29Db2k1a0JCMXBXNE5MQXNlUEQ6SHVCa2RPUnNFUXoyWUY4Y0FvVVphQQ=='
    },
  });

async function testConnection() {
  const info = await client.info();
  console.log(info);
}

testConnection();
