const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "release", "sharma-pharmacy-windows.exe");
const targetDir = path.join(root, "public", "downloads");
const target = path.join(targetDir, "sharma-pharmacy-windows.exe");

if (!fs.existsSync(source)) {
  throw new Error(`Windows build not found at ${source}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);

const sizeMb = fs.statSync(target).size / (1024 * 1024);
console.log(`Copied Windows download to ${target} (${sizeMb.toFixed(1)} MB)`);
