const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "assets", "app-icon.svg");
const assetsDir = path.join(root, "assets");

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

  const androidDir = path.join(root, "android", "app", "src", "main", "res");
  const densities = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
  };
  if (fs.existsSync(androidDir)) {
    for (const [folder, size] of Object.entries(densities)) {
      const dir = path.join(androidDir, folder);
      fs.mkdirSync(dir, { recursive: true });
      await sharp(svgPath).resize(size, size).png().toFile(path.join(dir, "ic_launcher.png"));
      await sharp(svgPath).resize(size, size).png().toFile(path.join(dir, "ic_launcher_round.png"));
    }
  }
  console.log("Generated Fabric Analyzer icons for Windows, Android and web.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
