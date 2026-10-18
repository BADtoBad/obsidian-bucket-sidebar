# Bucket Sidebar 0.5.6

## English

A small compatibility and release-hygiene patch. No new features, data migration, or changes to your shortcuts.

- Replace two `Array.flatMap` paths with typed ES2018-compatible iteration. Creating a note or subfolder still reveals matching pinned and grouped folder references.
- Use scanner-compatible ending punctuation in the plugin manifest description.
- Keep Community release attachments to the standard three files: `main.js`, `manifest.json`, and `styles.css`. Previous release ZIPs remain available.
- Remove `clip-path` from the visually hidden tree label while preserving its accessible name and visible layout.

Validation: 71 regression tests, full and browser-only ES2018 type checks, zero ESLint errors/unsafe-type diagnostics, production build, compatibility and UI checks, and a four-case label accessibility/layout fixture. Existing unrelated advisory warnings remain; the Community score is determined by its independent scan. See [verification details](RELEASE-VERIFICATION.md) for test boundaries.

Requires Obsidian 1.7.7+. Update through Community, or replace only the three plugin files in `.obsidian/plugins/bucket-sidebar/`. Keep your existing `data.json`.

## 中文

本次只处理兼容性与发行规范，不增加功能，不迁移数据，也不改快捷键。

- 将两处 `Array.flatMap` 改为有明确类型的 ES2018 兼容遍历；新建笔记或子文件夹后，仍展开对应的置顶和分组文件夹引用。
- 修正插件描述的结尾标点，满足扫描规则。
- Community 发行附件仅保留 `main.js`、`manifest.json`、`styles.css`；旧版本 ZIP 继续保留。
- 移除隐藏读屏标签的 `clip-path`，保留可访问名称和原有可见布局。

验证：71 项回归测试、完整及浏览器端 ES2018 类型检查通过；ESLint 无错误、无 unsafe 类型告警；构建、兼容性、界面检查，以及中英文／明暗模式标签检查通过。其余已知提示未在本次修改，Community 评级以独立复扫为准。测试边界见 [验证说明](RELEASE-VERIFICATION.md)。

需要 Obsidian 1.7.7 或更新版本。可通过 Community 更新，或只替换 `.obsidian/plugins/bucket-sidebar/` 下的三个插件文件；请保留原有 `data.json`。
