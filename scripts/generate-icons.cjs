const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "assets", "app-icon.svg");
const assetsDir = path.join(root, "assets");

const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f1d19b"/>
      <stop offset=".5" stop-color="#d8ad68"/>
      <stop offset="1" stop-color="#a77b45"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g transform="translate(46 46) scale(.82)">
    <g transform="rotate(-8 256 256)" fill="none" stroke="url(#gold)"
       stroke-width="9" stroke-linecap="round" filter="url(#glow)">
      <path d="M76 150V362 M148 150V362 M220 150V362 M292 150V362 M364 150V362 M436 150V362"/>
      <path d="M76 150H436 M76 192H436 M76 234H436 M76 276H436 M76 318H436 M76 362H436"/>
    </g>
    <g fill="none" stroke="#f1d19b" filter="url(#glow)">
      <circle cx="256" cy="256" r="27" stroke-width="5"/>
      <circle cx="256" cy="256" r="13" stroke-width="4" opacity=".82"/>
      <circle cx="256" cy="256" r="49" stroke-width="2" opacity=".35"/>
    </g>
  </g>
</svg>`;

async function main() {
  if (!fs.existsSync(svgPath)) throw new Error("assets/app-icon.svg is missing.");

  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoFiles = [];
  for (const size of icoSizes) {
    const file = path.join(assetsDir, `icon-${size}.png`);
    await sharp(svgPath).resize(size, size).png().toFile(file);
    icoFiles.push(file);
  }
  fs.writeFileSync(path.join(assetsDir, "icon.ico"), await pngToIco(icoFiles));

  const resDir = path.join(root, "android", "app", "src", "main", "res");
  const densities = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
  };

  if (fs.existsSync(resDir)) {
    for (const [folder, size] of Object.entries(densities)) {
      const dir = path.join(resDir, folder);
      fs.mkdirSync(dir, { recursive: true });
      await sharp(svgPath).resize(size, size).png().toFile(path.join(dir, "ic_launcher.png"));
      await sharp(svgPath).resize(size, size).png().toFile(path.join(dir, "ic_launcher_round.png"));
      await sharp(Buffer.from(foregroundSvg)).resize(size, size).png()
        .toFile(path.join(dir, "ic_launcher_foreground.png"));
    }

    const adaptiveDir = path.join(resDir, "mipmap-anydpi-v26");
    fs.mkdirSync(adaptiveDir, { recursive: true });
    const adaptive = `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
    fs.writeFileSync(path.join(adaptiveDir, "ic_launcher.xml"), adaptive);
    fs.writeFileSync(path.join(adaptiveDir, "ic_launcher_round.xml"), adaptive);
    fs.writeFileSync(
      path.join(resDir, "values", "ic_launcher_background.xml"),
      '<resources><color name="ic_launcher_background">#10141D</color></resources>\n'
    );
  }
  console.log("Generated Fabric Analyzer navy-and-gold intro icons for Windows, Android and web.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
