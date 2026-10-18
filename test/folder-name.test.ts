import assert from "node:assert/strict";
import test from "node:test";
import { validateFolderName } from "../src/folder-name";

for (const name of ["项目甲", " New folder ", "2026.09 项目", "素材 📁", "设计-稿_v2", "a..b", "COM10"]) {
  test(`valid child folder name: ${name}`, () => assert.equal(validateFolderName(name), null));
}
for (const name of ["", "  ", ".", "..", "../旁边", ".obsidian", "a/b", "a\\b", "/外部", "a:b", "a*b", "a?b", 'a"b', "a<b", "a>b", "a|b", "a\nb", "a\tb", "a\u0000b", "a\u007fb", "项目.", "CON", "nul.txt", "COM1", "LPT9"]) {
  test(`reject unsafe/nonportable folder name: ${JSON.stringify(name)}`, () => assert.ok(validateFolderName(name)));
}
