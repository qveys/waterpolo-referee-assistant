import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({ 
  project: 'ton_project_id', 
  location: 'europe-west1' 
});

async function testVertexAI() {
  try {
    // Test with a simple text generation
    const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Hello, this is a test message.');
    const response = await result.response;
    const text = response.text();
    
    console.log('Vertex AI test successful!');
    console.log('Response:', text);
  } catch (error) {
    console.error('Vertex AI test failed:', error.message);
  }
}

testVertexAI();
