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

  // Prefer the user's newly uploaded launcher artwork; keep the SVG as fallback.
  const uploadedIcon = path.join(repo, "weightex", "file_00000000ace88210b5975889446341b5.png");
  const iconSvg = path.join(repo, "weightex", "icon.svg");
  const iconSource = fs.existsSync(uploadedIcon) ? uploadedIcon : iconSvg;
  if (fs.existsSync(uploadedIcon)) {
    fs.copyFileSync(uploadedIcon, path.join(webDir, "icon.png"));
  }
  const res = path.join(project, "android", "app", "src", "main", "res");
  const sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
  };
  if (fs.existsSync(iconSource) && fs.existsSync(res)) {
    for (const [folder, size] of Object.entries(sizes)) {
      const dir = path.join(res, folder);
      fs.mkdirSync(dir, { recursive: true });
      await sharp(iconSvg).resize(size, size).png().toFile(path.join(dir, "ic_launcher.png"));
      await sharp(iconSvg).resize(size, size).png().toFile(path.join(dir, "ic_launcher_round.png"));
    }

    // Android 8+ launchers use adaptive icons, not the legacy mipmap PNGs.
    // Keep the woven mark inside the adaptive-icon safe zone on every density.
    const foregroundBuffer = await sharp(iconSource)
      .resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
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
