async function getModels() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const models = data.data.filter((m: any) => m.id.toLowerCase().includes('nemotron'));
  console.log(models.map((m: any) => m.id));
}
getModels();
