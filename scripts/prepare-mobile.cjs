const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "index.html");
const webDir = path.join(root, "www");

if (!fs.existsSync(source)) {
  throw new Error("index.html was not found in the project root.");
}

fs.mkdirSync(webDir, { recursive: true });
fs.copyFileSync(source, path.join(webDir, "index.html"));
console.log("Prepared the current Fabric Analyzer web app for Capacitor.");
