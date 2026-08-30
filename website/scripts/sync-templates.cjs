const fs = require('fs');
const path = require('path');

const websiteDir = path.resolve(__dirname, '..');
const lexinoWebsiteDir = path.join(websiteDir, 'Lexino Website');
const publicDir = path.join(websiteDir, 'public');
const publicLexinoDir = path.join(publicDir, 'lexino-website');
const libDir = path.join(websiteDir, 'lib');

if (!fs.existsSync(publicLexinoDir)) {
  fs.mkdirSync(publicLexinoDir, { recursive: true });
}
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// 1. Sync styles.css
const srcStyles = path.join(lexinoWebsiteDir, 'styles.css');
if (fs.existsSync(srcStyles)) {
  fs.copyFileSync(srcStyles, path.join(publicLexinoDir, 'styles.css'));
  console.log('✅ Synchronized public/lexino-website/styles.css');
}

// 2. Sync script.js
const srcScript = path.join(lexinoWebsiteDir, 'script.js');
if (fs.existsSync(srcScript)) {
  fs.copyFileSync(srcScript, path.join(publicLexinoDir, 'script.js'));
  console.log('✅ Synchronized public/lexino-website/script.js');
}

// 3. Sync all media assets (images, videos, audio)
// Served from /lexino-website/<file> only — no second copy in the public root,
// because nothing references the root paths and the duplicate doubled deploy weight.
const MEDIA_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.svg', '.ico',
  '.webp', '.avif',
  '.mp4', '.webm',
  '.mp3', '.m4a',
];

// Uncompressed masters kept in source control for future re-encodes, but not shipped:
// the page now references the optimized derivatives instead.
const UNSHIPPED_MASTERS = new Set([
  'mp_.mp4',
  'Manifest Anything You Desire  10 Minute Meditation Music.mp3',
]);

const allFiles = fs.readdirSync(lexinoWebsiteDir);
for (const file of allFiles) {
  const ext = path.extname(file).toLowerCase();
  if (!MEDIA_EXTENSIONS.includes(ext)) continue;
  if (UNSHIPPED_MASTERS.has(file)) {
    console.log(`⏭️  Skipped unshipped master: ${file}`);
    continue;
  }
  const src = path.join(lexinoWebsiteDir, file);
  fs.copyFileSync(src, path.join(publicLexinoDir, file));
  console.log(`✅ Synchronized asset: ${file}`);
}

// 4. Extract and generate staticLandingHtml.ts from Lexino Website/index.html
const landingHtmlPath = path.join(lexinoWebsiteDir, 'index.html');
if (fs.existsSync(landingHtmlPath)) {
  const rawHtml = fs.readFileSync(landingHtmlPath, 'utf8');
  let bodyContent = rawHtml;
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
    bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  bodyContent = bodyContent.replace(/\/website\/Lexino Website\/Image22\.png/g, '/lexino-website/Image22.png');
  bodyContent = bodyContent.replace(/src="Image22\.png"/g, 'src="/lexino-website/Image22.png"');

  const tsContent = '// Auto-generated during build from Lexino Website/index.html\nexport const STATIC_LANDING_HTML = ' + JSON.stringify(bodyContent) + ';\n';
  fs.writeFileSync(path.join(libDir, 'staticLandingHtml.ts'), tsContent);
  console.log('✅ Generated website/lib/staticLandingHtml.ts');
}

// 5. Extract and generate staticChatHtml.ts from website/index.html
const chatHtmlPath = path.join(websiteDir, 'index.html');
if (fs.existsSync(chatHtmlPath)) {
  const rawChatHtml = fs.readFileSync(chatHtmlPath, 'utf8');
  let chatBody = rawChatHtml;
  const chatBodyMatch = rawChatHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (chatBodyMatch) {
    chatBody = chatBodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  }
  const chatTsContent = '// Auto-generated during build from website/index.html\nexport const STATIC_CHAT_HTML = ' + JSON.stringify(chatBody) + ';\n';
  fs.writeFileSync(path.join(libDir, 'staticChatHtml.ts'), chatTsContent);
  console.log('✅ Generated website/lib/staticChatHtml.ts');
}
