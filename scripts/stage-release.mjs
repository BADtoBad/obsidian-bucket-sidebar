import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Deliberately separate Community release assets from optional manual ZIPs.
const assets = ["main.js", "manifest.json", "styles.css"];
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const versions = JSON.parse(await readFile("versions.json", "utf8"));
assert.equal(manifest.version, pkg.version);
assert.equal(versions[manifest.version], manifest.minAppVersion);
assert.match(manifest.description, /[.!?]$/);

const directory = await mkdtemp(path.join(tmpdir(), `bucket-release-${manifest.version}-`));
for (const asset of assets) {
  assert.ok((await readFile(asset)).length > 0, `${asset} must not be empty`);
  await copyFile(asset, path.join(directory, asset));
}
assert.deepEqual((await readdir(directory)).sort(), [...assets].sort());
console.log(JSON.stringify({ version: manifest.version, directory, assets }, null, 2));
