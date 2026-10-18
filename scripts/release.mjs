import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const ASSETS = ["main.js", "manifest.json", "styles.css"];
export function validateVersion(version, manifest, pkg, versions) {
  assert.match(version || "", /^\d+\.\d+\.\d+$/, "Use an exact stable version, without a v prefix");
  assert.equal(manifest.id, "bucket-sidebar");
  assert.equal(version, manifest.version);
  assert.equal(version, pkg.version);
  assert.equal(versions[version], manifest.minAppVersion);
  assert.equal(manifest.minAppVersion, "1.7.7");
}
export function validateAssets(assets, expected) {
  assert.deepEqual(assets.map(a => a.name).sort(), [...ASSETS].sort(), "Exactly three release assets required");
  for (const asset of assets) {
    assert.equal(asset.state, "uploaded");
    assert.equal(asset.size, expected[asset.name].size, `${asset.name} size mismatch`);
    assert.equal(asset.digest, expected[asset.name].digest, `${asset.name} digest mismatch`);
  }
}
const digest = bytes => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function run(mode) {
  assert.ok(["preflight", "verify-draft"].includes(mode));
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, "BADtoBad/obsidian-bucket-sidebar");
  assert.equal(process.env.GITHUB_REF, "refs/heads/main");
  assert.equal(process.env.GITHUB_EVENT_NAME, "workflow_dispatch");
  const sha = process.env.GITHUB_SHA;
  assert.match(sha || "", /^[a-f0-9]{40}$/);
  assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), sha);
  const version = process.env.RELEASE_VERSION;
  const json = async path => JSON.parse(await readFile(path, "utf8"));
  validateVersion(version, await json("manifest.json"), await json("package.json"), await json("versions.json"));
  const token = process.env.GH_TOKEN;
  assert.ok(token, "Missing ephemeral Actions token");
  const base = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}`;
  async function api(path, accept = "application/vnd.github+json") {
    const response = await fetch(base + path, {
      headers: { Authorization: `Bearer ${token}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(30000)
    });
    if (response.status === 404) return null;
    assert.ok(response.ok, `GitHub returned HTTP ${response.status}`);
    return accept === "application/octet-stream" ? Buffer.from(await response.arrayBuffer()) : response.json();
  }
  // Drafts may not yet have a tag, so the tag endpoint can return 404.
  const release = await api(`/releases/tags/${version}`) ||
    (await api("/releases?per_page=100"))?.find(item => item.tag_name === version) || null;
  const tag = await api(`/git/ref/tags/${version}`);
  if (mode === "preflight") {
    assert.equal(release, null, "Release already exists; do not overwrite or auto-delete it");
    assert.equal(tag, null, "Tag already exists; review it manually");
    const firstBuild = digest(await readFile("main.js"));
    execFileSync(process.execPath, ["esbuild.config.mjs", "production"], { stdio: "inherit" });
    assert.equal(digest(await readFile("main.js")), firstBuild, "Repeated build changed the bundle");
  } else {
    assert.ok(release?.draft, "Only an unpublished draft can be verified");
    assert.equal(release.prerelease, false);
    assert.equal(release.tag_name, version);
    assert.equal(release.target_commitish, sha);
    // GitHub may defer tag creation until a draft is published.
    if (tag) { assert.equal(tag.object.type, "commit"); assert.equal(tag.object.sha, sha); }
    const expected = {};
    for (const name of ASSETS) {
      const bytes = await readFile(name);
      expected[name] = { size: bytes.length, digest: digest(bytes) };
    }
    validateAssets(release.assets, expected);
    for (const asset of release.assets) {
      const downloaded = await api(`/releases/assets/${asset.id}`, "application/octet-stream");
      assert.ok(downloaded, "Uploaded asset is unavailable");
      assert.equal(digest(downloaded), expected[asset.name].digest, `${asset.name} downloaded bytes mismatch`);
    }
  }
  console.log(`${mode} passed for ${version} at ${sha}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run(process.argv[2]);
}
