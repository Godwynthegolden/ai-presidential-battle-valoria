async function main() {
  const apiKey = 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0';
  
  // Search terms to find diverse political / charismatic / dramatic voices
  const queries = ['', 'news', 'president', 'trump', 'biden', 'obama', 'senator', 'deep', 'radio', 'narration', 'female', 'male', 'british', 'scottish', 'southern', 'governor', 'boss', 'military'];
  
  const allModels = new Map<string, any>();

  for (const q of queries) {
    try {
      const url = new URL('https://api.fish.audio/model');
      url.searchParams.set('page_size', '20');
      if (q) url.searchParams.set('title', q);
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': 'Bearer ' + apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          for (const item of data.items) {
            allModels.set(item._id, item);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching query', q, e);
    }
  }

  console.log(`Found ${allModels.size} unique Fish Audio models.`);
  const sorted = Array.from(allModels.values());
  sorted.slice(0, 60).forEach((m, idx) => {
    console.log(`${idx + 1}. ID: ${m._id} | Title: "${m.title}" | Tags: [${(m.tags || []).join(', ')}] | Desc: "${(m.description || '').slice(0, 60)}"`);
  });
}

main().catch(console.error);
