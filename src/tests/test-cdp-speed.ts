import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';
import fs from 'fs';

async function benchmark() {
  const browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(os.tmpdir(), 'valoria-bench-chrome-' + Date.now());
  fs.mkdirSync(tempProfile, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    userDataDir: tempProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--remote-debugging-port=0'],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/render?session=voiceT1', { waitUntil: 'domcontentloaded' });
  const client = await page.createCDPSession();

  console.log('Benchmarking 30 frames with Page.captureScreenshot...');
  const start = Date.now();
  for (let i = 0; i < 30; i++) {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
  }
  const elapsed = Date.now() - start;
  console.log(`Captured 30 frames in ${elapsed}ms (${(elapsed / 30).toFixed(1)}ms/frame, ${(30 / (elapsed / 1000)).toFixed(1)} fps render speed)`);

  await browser.close();
  try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
}

benchmark().catch(console.error);
