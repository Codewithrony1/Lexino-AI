// One-off asset generation for the favicon/apple-touch-icon derivatives.
// The 516x484 lexino-logo.png was being served as the favicon (68,295 B on every
// page load); these are the correctly sized versions of the same artwork.
const sharp = require('sharp');
const fs = require('fs');

const SRC = 'public/lexino-logo.png';

async function main() {
  const outputs = [
    { file: 'public/favicon-32.png', size: 32 },
    { file: 'public/favicon-16.png', size: 16 },
    { file: 'public/apple-touch-icon.png', size: 180 },
  ];

  for (const { file, size } of outputs) {
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true })
      .toFile(file);
    console.log(`${file.padEnd(32)} ${size}x${size}  ${fs.statSync(file).size} B`);
  }

  console.log(`${SRC.padEnd(32)} source     ${fs.statSync(SRC).size} B`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
