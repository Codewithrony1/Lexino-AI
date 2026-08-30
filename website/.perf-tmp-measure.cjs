// Minimal CDP client: measures landing-page section geometry at a mobile viewport so
// content-visibility intrinsic sizes can be set from real numbers instead of guesses.
const { spawn } = require('child_process');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const URL = process.argv[2] || 'http://localhost:3111/';
const WIDTH = Number(process.argv[3] || 412);
const HEIGHT = Number(process.argv[4] || 823);

const EXPR = `(() => {
  const out = [];
  document.querySelectorAll('#home-page > section, #home-page > div, .page-content > section').forEach((el) => {
    const r = el.getBoundingClientRect();
    out.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: el.className || null,
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
    });
  });
  return JSON.stringify({
    viewport: [window.innerWidth, window.innerHeight],
    docHeight: document.documentElement.scrollHeight,
    sections: out,
    counts: {
      allElements: document.querySelectorAll('*').length,
      backdropFilter: [...document.querySelectorAll('*')].filter(
        (e) => (getComputedStyle(e).backdropFilter || 'none') !== 'none'
      ).length,
      blurFilter: [...document.querySelectorAll('*')].filter(
        (e) => (getComputedStyle(e).filter || 'none').includes('blur')
      ).length,
      animated: [...document.querySelectorAll('*')].filter(
        (e) => (getComputedStyle(e).animationName || 'none') !== 'none'
      ).length,
    },
  });
})()`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--no-sandbox',
      '--disable-gpu',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--user-data-dir=' + process.cwd() + '\\.perf-tmp-chrome',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false }
  );

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      target = tabs.find((t) => t.type === 'page');
    } catch {
      /* chrome not up yet */
    }
  }
  if (!target) throw new Error('Chrome CDP endpoint never became available');

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
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  // The local Clerk instance is a development instance, so clerkMiddleware issues a
  // dev-browser handshake redirect on first navigation. Pre-seeding the dev-browser
  // cookie skips it; production instances do not do this.
  await send('Network.setCookie', {
    name: '__clerk_db_jwt',
    value: 'dvb_3IdAGrswqXorMbqJa1NZr6dsbiS',
    domain: 'localhost',
    path: '/',
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 2,
    mobile: true,
  });
  const nav = await send('Page.navigate', { url: URL });
  console.error('navigate ->', JSON.stringify(nav));
  await sleep(7000);
  const probe = await send('Runtime.evaluate', {
    expression: 'document.location.href + " | readyState=" + document.readyState + " | els=" + document.querySelectorAll("*").length',
    returnByValue: true,
  });
  console.error('probe ->', JSON.stringify(probe.result && probe.result.value));

  const { result } = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true });
  fs.writeFileSync('.perf-tmp-geometry.json', result.value);
  console.log(result.value);

  ws.close();
  child.kill();
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
