const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
const gradlePath = path.join(root, "android", "app", "build.gradle");

if (!fs.existsSync(manifestPath) || !fs.existsSync(gradlePath)) {
  throw new Error("Capacitor Android project was not generated.");
}

let manifest = fs.readFileSync(manifestPath, "utf8");
// No device permissions are needed by this offline calculator.
manifest = manifest.replace(/^\s*<uses-permission[^>]*\/>\s*\r?\n/gm, "");
manifest = manifest.replace(/<application\b([^>]*)>/, (match, attrs) => {
  let next = attrs
    .replace(/\sandroid:allowBackup="[^"]*"/g, "")
    .replace(/\sandroid:usesCleartextTraffic="[^"]*"/g, "");
  next += ' android:allowBackup="false" android:usesCleartextTraffic="false"';
  return "<application" + next + ">";
});
fs.writeFileSync(manifestPath, manifest, "utf8");

let gradle = fs.readFileSync(gradlePath, "utf8");
if (/buildTypes\s*\{/.test(gradle)) {
  if (!/debug\s*\{[^}]*debuggable\s+false/s.test(gradle)) {
    gradle = gradle.replace(/buildTypes\s*\{/, 'buildTypes {\n        debug { debuggable false }');
  }
} else {
  throw new Error("Could not locate Android buildTypes block.");
}
fs.writeFileSync(gradlePath, gradle, "utf8");

// Fail closed if a future plugin reintroduces network/device permissions.
if (/<uses-permission\b/i.test(manifest)) {
  throw new Error("Unexpected Android permissions found in manifest.");
}
if (/android:usesCleartextTraffic="true"/.test(manifest)) {
  throw new Error("Cleartext traffic must remain disabled.");
}
console.log("Android hardening applied: no permissions, no cleartext traffic, backup off, WebView debugging off.");
