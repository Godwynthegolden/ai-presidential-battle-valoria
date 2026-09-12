import { fishAudioService } from '../src/services/fishAudio';

async function fetchDiverseCatalog() {
  const apiKey = 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0';
  
  const searchQueries = [
    'news', 'anchor', 'president', 'senator', 'governor', 'minister', 'leader', 'speech', 
    'orator', 'debater', 'deep', 'radio', 'podcast', 'broadcast', 'narrator', 'documentary',
    'british', 'southern', 'charlie', 'morgan', 'trump', 'biden', 'obama', 'prosecutor',
    'female', 'woman', 'activist', 'professor', 'captain', 'commander', 'warrior', 'general',
    'scientist', 'executive', 'shark', 'preacher', 'pastor', 'gritty', 'raspy'
  ];

  const modelMap = new Map<string, any>();

  for (const q of searchQueries) {
    try {
      const url = new URL('https://api.fish.audio/model');
      url.searchParams.set('page_size', '30');
      url.searchParams.set('title', q);
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          for (const item of data.items) {
            if (item._id && !modelMap.has(item._id)) {
              modelMap.set(item._id, item);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Query failed for', q, e);
    }
  }

  console.log(`Discovered ${modelMap.size} distinct Fish Audio models.`);

  // Filter English / Latin models with descriptive tags or clear titles
  const allList = Array.from(modelMap.values());
  const formattedList = allList.map(m => ({
    id: m._id,
    title: m.title || 'Unknown',
    tags: m.tags || [],
    description: m.description || '',
    languages: m.languages || [],
    gender: (m.tags || []).includes('female') || (m.tags || []).includes('woman') ? 'female' : 'male',
  }));

  console.log('\n--- Sample Selected Distinct Voices ---');
  formattedList.slice(0, 50).forEach((m, idx) => {
    console.log(`${idx + 1}. ID: '${m.id}', Name: '${m.title}', Gender: '${m.gender}', Tags: [${m.tags.slice(0, 5).join(', ')}]`);
  });
}

fetchDiverseCatalog().catch(console.error);
