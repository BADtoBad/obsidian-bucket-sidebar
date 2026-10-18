import { readFile } from "node:fs/promises";

const source = await readFile("main.js", "utf8");
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

const forbiddenSyntax = [
  ["optional chaining", /\?\.(?!\d)/],
  ["nullish coalescing", /\?\?/],
  ["private class fields", /(?:^|[;{}])\s*#[A-Za-z_$]/m]
];

const forbiddenApis = [
  "Object.hasOwn",
  "structuredClone",
  ".replaceAll(",
  "registerBasesView",
  "onExternalSettingsChange",
  "loadIfDeferred",
  "getActiveViewOfType"
];

const failures = [];

try {
  new Function(source);
} catch (error) {
  failures.push(`构建产物无法被 JavaScript 解析：${String(error)}`);
}

for (const [label, pattern] of forbiddenSyntax) {
  if (pattern.test(source)) failures.push(`包含旧运行环境不应出现的语法：${label}`);
}

for (const api of forbiddenApis) {
  if (source.includes(api)) failures.push(`包含超出兼容边界的 API：${api}`);
}

const runtimeImports = Array.from(source.matchAll(/require\(["']([^"']+)["']\)/g), (match) => match[1]);
const unexpectedImports = runtimeImports.filter((name) => name !== "obsidian");
if (unexpectedImports.length > 0) {
  failures.push(`存在非 Obsidian 运行时依赖：${Array.from(new Set(unexpectedImports)).join(", ")}`);
}

if (manifest.minAppVersion !== "1.7.7") {
  failures.push(`manifest.minAppVersion 应为 1.7.7，实际为 ${manifest.minAppVersion}`);
}

if (!source.includes("module.exports")) {
  failures.push("构建产物不是 Obsidian 旧版可加载的 CommonJS 格式");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Legacy compatibility checks passed (ES2018/CommonJS, minAppVersion 1.7.7).");
}
