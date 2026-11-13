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
      <stop offset="0" stop-color="#f4d9a8"/>
      <stop offset=".52" stop-color="#d8ad68"/>
      <stop offset="1" stop-color="#a77b45"/>
    </linearGradient>
  </defs>
  <g transform="translate(52 52) scale(3.4)" fill="none" stroke="url(#gold)"
     stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 31 C28 22 40 40 60 31 S92 22 108 31"/>
    <path d="M12 60 C28 51 40 69 60 60 S92 51 108 60"/>
    <path d="M12 89 C28 80 40 98 60 89 S92 80 108 89"/>
    <path d="M31 12 C22 28 40 40 31 60 S22 92 31 108"/>
    <path d="M60 12 C51 28 69 40 60 60 S51 92 60 108"/>
    <path d="M89 12 C80 28 98 40 89 60 S80 92 89 108"/>
  </g>
  <rect x="245.5" y="245.5" width="21" height="21" rx="3"
        fill="#f1d19b" transform="rotate(45 256 256)"/>
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
