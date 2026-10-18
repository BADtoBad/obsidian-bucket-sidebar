import assert from "node:assert/strict";
import test from "node:test";
import { ASSETS, validateAssets, validateVersion } from "../scripts/release.mjs";

const manifest = { id: "bucket-sidebar", version: "0.5.7", minAppVersion: "1.7.7" };
test("release version must match all metadata and retain the compatibility floor", () => {
  assert.doesNotThrow(() => validateVersion("0.5.7", manifest, { version: "0.5.7" }, { "0.5.7": "1.7.7" }));
  for (const version of ["v0.5.7", "0.5.8", "0.5.7;echo", "0.5.7-beta", ""]) {
    assert.throws(() => validateVersion(version, manifest, { version: "0.5.7" }, { "0.5.7": "1.7.7" }));
  }
  assert.throws(() => validateVersion("0.5.7", { ...manifest, minAppVersion: "1.13.0" },
    { version: "0.5.7" }, { "0.5.7": "1.13.0" }));
});
const expected = Object.fromEntries(ASSETS.map(name => [name, { size: 100, digest: `sha256:${name}` }]));
const assets = ASSETS.map(name => ({ name, state: "uploaded", ...expected[name] }));
test("release accepts exactly the expected assets and digests", () => {
  assert.doesNotThrow(() => validateAssets(assets, expected));
});
test("release rejects extra, missing and duplicate assets", () => {
  for (const invalid of [[...assets, { name: "bundle.zip" }], assets.slice(1), [assets[0], assets[0], assets[2]]]) {
    assert.throws(() => validateAssets(invalid, expected));
  }
});
test("release rejects incomplete or changed bytes", () => {
  for (const patch of [{ state: "new" }, { size: 99 }, { digest: "sha256:wrong" }, { digest: null }]) {
    assert.throws(() => validateAssets([{ ...assets[0], ...patch }, ...assets.slice(1)], expected));
  }
});
