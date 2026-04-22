import { OpenRouterAIProvider } from './lib/providers/implementations/openrouter-ai';

async function test() {
  const provider = new OpenRouterAIProvider();
  try {
    const res = await provider.chat([{ role: 'user', content: 'What is my Vata dosha type?' }]);
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
