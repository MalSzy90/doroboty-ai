import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const source = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
const allowed = (name) =>
  name === "index.html" ||
  name === "_headers" ||
  name === "case/baseline.csv" ||
  /^cv\/[^/]+\.pdf$/.test(name) ||
  /^company-logos\/[^/]+\.png$/.test(name) ||
  /^assets\/[^/]+\.(?:js|css|svg|png|woff2)$/.test(name);
const omitted = new Set(["cv/README.md"]);

if (!fs.existsSync(path.join(source, "index.html"))) throw new Error("Build dist/ first.");
fs.mkdirSync(artifacts, { recursive: true });
const target = fs.mkdtempSync(path.join(artifacts, "netlify-drop-"));
const files = {};
let bytes = 0;
function visit(folder, prefix = "") {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const name = prefix + entry.name;
    const absolute = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in build: ${name}`);
    if (entry.isDirectory()) {
      visit(absolute, `${name}/`);
      continue;
    }
    if (!entry.isFile()) throw new Error(`Unsupported build entry: ${name}`);
    if (omitted.has(name)) continue;
    if (!allowed(name)) throw new Error(`Unexpected public file: ${name}`);
    const data = fs.readFileSync(absolute);
    const destination = path.join(target, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, data);
    files[name] = createHash("sha256").update(data).digest("hex");
    bytes += data.length;
  }
}
visit(source);
if (
  !files["_headers"] ||
  !files["case/baseline.csv"] ||
  !Object.keys(files).some((n) => n.endsWith(".pdf"))
)
  throw new Error("Required public assets are missing.");
const ordered = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
const fingerprint = createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
const manifest = {
  stage: "fictional-demo",
  fingerprint,
  fileCount: Object.keys(ordered).length,
  bytes,
  files: ordered,
};
const manifestPath = `${target}.manifest.json`;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  JSON.stringify({
    uploadFolder: target,
    manifest: manifestPath,
    fingerprint,
    fileCount: manifest.fileCount,
    bytes,
  }),
);
