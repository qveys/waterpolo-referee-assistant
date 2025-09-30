import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
console.log(`Testing Vertex AI with project: ${projectId}`);
console.log(`Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

const testModel = async (modelName, location = 'us-central1') => {
  console.log(`\n=== Testing model: ${modelName} in ${location} ===`);
  try {
    const vertexAI = new VertexAI({ project: projectId, location });
    const model = vertexAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0.2, maxOutputTokens: 100 }
    });

    const prompt = 'Dis "test réussi" en français.';
    const result = await model.generateContent(prompt);
    const response = result.response.candidates[0].content.parts[0].text;

    console.log(`✅ SUCCESS: ${modelName}`);
    console.log(`Response: ${response}`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${modelName}`);
    console.log(`Error: ${error.message}`);
    return false;
  }
};

const testAllModels = async () => {
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.0-pro',
    'gemini-1.0-pro-001',
    'gemini-pro'
  ];

  const locations = ['us-central1', 'us-east4', 'europe-west4'];

  for (const location of locations) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing location: ${location}`);
    console.log('='.repeat(60));

    for (const model of modelsToTest) {
      const success = await testModel(model, location);
      if (success) {
        console.log(`\n✨ FOUND WORKING MODEL: ${model} in ${location} ✨\n`);
        process.exit(0);
      }
    }
  }

  console.log('\n❌ No working model found. Check your project configuration.');
  process.exit(1);
};

testAllModels();