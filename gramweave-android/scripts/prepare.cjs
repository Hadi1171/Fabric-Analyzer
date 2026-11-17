const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const project = path.resolve(__dirname, "..");
  const repo = path.resolve(project, "..");
  const source = path.join(repo, "weightex", "index.html");
  const webDir = path.join(project, "www");

  if (!fs.existsSync(source)) throw new Error("weightex/index.html is missing.");

  fs.rmSync(webDir, { recursive: true, force: true });
  fs.mkdirSync(webDir, { recursive: true });

  let html = fs.readFileSync(source, "utf8");
  // The Android build is fully offline: remove remote Google Fonts requests.
  html = html.replace(/<link[^>]+fonts\\.googleapis\\.com[^>]*>\\s*/gi, "");
  html = html.replace(/<link[^>]+fonts\\.gstatic\\.com[^>]*>\\s*/gi, "");
  fs.writeFileSync(path.join(webDir, "index.html"), html, "utf8");

  for (const name of ["icon.svg", "manifest.json"]) {
    const from = path.join(repo, "weightex", name);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(webDir, name));
  }

  // Create native launcher icons from the actual Gram Weave mark.
  const iconSvg = path.join(repo, "weightex", "icon.svg");
  const res = path.join(project, "android", "app", "src", "main", "res");
  const sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
  };
  if (fs.existsSync(iconSvg) && fs.existsSync(res)) {
    for (const [folder, size] of Object.entries(sizes)) {
      const dir = path.join(res, folder);
      fs.mkdirSync(dir, { recursive: true });
      await sharp(iconSvg).resize(size, size).png().toFile(path.join(dir, "ic_launcher.png"));
      await sharp(iconSvg).resize(size, size).png().toFile(path.join(dir, "ic_launcher_round.png"));
    }
  }
  console.log("Gram Weave web bundle prepared (offline).");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
