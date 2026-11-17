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
  html = html.replace(/<link[^>]+fonts\.googleapis\.com[^>]*>\s*/gi, "");
  html = html.replace(/<link[^>]+fonts\.gstatic\.com[^>]*>\s*/gi, "");
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

    // Android 8+ launchers use adaptive icons, not the legacy mipmap PNGs.
    // Keep the woven mark inside the adaptive-icon safe zone on every density.
    const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="thread" x1="115" y1="95" x2="400" y2="420" gradientUnits="userSpaceOnUse">
          <stop stop-color="#eee5ff"/><stop offset=".48" stop-color="#c4a9ff"/><stop offset="1" stop-color="#8b6be8"/>
        </linearGradient>
      </defs>
      <path d="M354 157C326 127 289 111 246 111C160 111 99 173 99 256C99 339 161 401 246 401C329 401 389 342 389 260V246H258"
        fill="none" stroke="url(#thread)" stroke-width="47" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M258 246H389" fill="none" stroke="#eee5ff" stroke-width="29" stroke-linecap="round"/>
      <path d="M258 246H389" fill="none" stroke="#8b6be8" stroke-width="7" stroke-linecap="round" stroke-dasharray="20 18"/>
      <circle cx="246" cy="256" r="13" fill="#f7f2ff"/>
    </svg>`
    for (const [folder, size] of Object.entries(sizes)) {
      const dir = path.join(res, folder);
      await sharp(Buffer.from(foregroundSvg)).resize(size, size).png()
        .toFile(path.join(dir, "ic_launcher_foreground.png"));
    }

    const adaptiveDir = path.join(res, "mipmap-anydpi-v26");
    fs.mkdirSync(adaptiveDir, { recursive: true });
    const adaptive = `<?xml version="1.0" encoding="utf-8"?>
      <adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
        <background android:drawable="@color/gramweave_icon_background"/>
        <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
      </adaptive-icon>`;
    fs.writeFileSync(path.join(adaptiveDir, "ic_launcher.xml"), adaptive, "utf8");
    fs.writeFileSync(path.join(adaptiveDir, "ic_launcher_round.xml"), adaptive, "utf8");

    const valuesDir = path.join(res, "values");
    fs.mkdirSync(valuesDir, { recursive: true });
    fs.writeFileSync(path.join(valuesDir, "gramweave_icon.xml"),
      `<?xml version="1.0" encoding="utf-8"?><resources><color name="gramweave_icon_background">#111019</color></resources>`, "utf8");
  }
  console.log("Gram Weave web bundle prepared (offline).");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
