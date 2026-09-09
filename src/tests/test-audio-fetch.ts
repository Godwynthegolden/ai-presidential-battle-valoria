async function testFetch() {
  const url = 'http://localhost:3000/api/save-game?sessionName=voiceT1&audioFile=01_campaign_01_jax-alvarez.mp3';
  console.log('Testing fetch to:', url);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));
    const buf = await res.arrayBuffer();
    console.log('Bytes received:', buf.byteLength);
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

testFetch();
