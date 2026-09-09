import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';
import fs from 'fs';

async function testLaunch() {
  const browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(os.tmpdir(), 'valoria-test-chrome-' + Date.now());
  fs.mkdirSync(tempProfile, { recursive: true });

  console.log('Testing launch with isolated profile:', tempProfile);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    userDataDir: tempProfile,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--remote-debugging-port=0',
      '--disable-gpu-sandbox',
    ],
  });

  console.log('Browser launched successfully!');
  const page = await browser.newPage();
  await page.goto('about:blank');
  console.log('Page loaded successfully!');
  await browser.close();

  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch {}

  console.log('Test passed!');
}

testLaunch().catch(err => {
  console.error('Launch test error:', err);
  process.exit(1);
});
