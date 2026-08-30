// CDP screenshot harness for visual-regression checks: captures full-page PNGs of a
// URL at a given viewport so before/after states can be pixel-diffed.
const { spawn } = require('child_process');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const URL = process.argv[2];
const WIDTH = Number(process.argv[3]);
const HEIGHT = Number(process.argv[4]);
const OUT = process.argv[5];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--user-data-dir=' + process.cwd() + '\\.perf-tmp-chrome-shot',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = tabs.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('CDP endpoint unavailable');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let seq = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  });

  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: WIDTH < 768,
  });
  // Freeze CSS animations so successive captures are comparable frame-for-frame.
  await send('Animation.enable').catch(() => {});
  await send('Animation.setPlaybackRate', { playbackRate: 0 }).catch(() => {});
  await send('Network.setCookie', {
    name: '__clerk_db_jwt',
    value: 'dvb_3IdAGrswqXorMbqJa1NZr6dsbiS',
    domain: 'localhost',
    path: '/',
  });
  await send('Page.navigate', { url: URL });
  await sleep(7000);

  // Scroll the whole document so every content-visibility section has rendered, then
  // return to the top before capturing.
  await send('Runtime.evaluate', {
    expression: `(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 600));
      return document.documentElement.scrollHeight;
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  await sleep(1200);

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    fromSurface: true,
  });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(`${OUT}  ${fs.statSync(OUT).size} B`);

  ws.close();
  child.kill();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
