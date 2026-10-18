# Contributing / 参与贡献

## English

Thank you for helping improve Bucket Sidebar. Small, focused issues and pull requests are welcome.

### Report a problem

Include the plugin and Obsidian versions, operating system, steps to reproduce, expected result and actual result. Use a small fictional Vault and a sanitised screenshot. **Do not upload your private Vault, `data.json`, credentials or application profile.** If a report contains sensitive information, remove it before posting publicly.

### Make a change

1. Discuss substantial changes in an issue first. Keep each pull request focused on one problem.
2. Use Node.js 22 and pnpm 10.11.0. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:legacy`, `pnpm check:ui` and `pnpm check:release`.
4. Test in an isolated, backed-up sample Vault, never directly in a personal Vault. For settings changes, check both Obsidian 1.7.7's `display()` path and 1.13+'s settings/search path, English/Chinese, keyboard operation and light/dark mode.
5. Describe what you verified and what remains untested. Automated contract tests do not replace host or device testing.

Preserve existing command IDs, file references, saved data and the Obsidian 1.7.7 minimum. Avoid dependencies on new host APIs without a legacy path. Settings are nested inside the full Bucket data object: use the existing setters rather than saving only a settings object. Add regression tests for any changed behavior. Keep English and Chinese UI/documentation in sync, and preserve license notices.

### Releases (maintainers)

Update `package.json`, `manifest.json`, `versions.json`, bilingual READMEs and release notes together. Push reviewed source and wait for CI. Run **Release with provenance** on `main` with the exact manifest version (no `v` prefix). The workflow rebuilds and checks the source, attests all three files, uploads a draft, verifies downloaded bytes, then publishes. It refuses existing tags/releases; inspect a failed draft rather than deleting or overwriting it automatically. Do not manually upload alternative bytes over attested assets.

The Community release contains only `main.js`, `manifest.json` and `styles.css`. Never ship a user's `data.json`. Trigger Community's release check afterward and inspect the independent scan. A successful GitHub build alone does not establish Community acceptance or mobile compatibility.

## 中文

欢迎通过小而明确的 Issue 或 Pull Request 改善 Bucket Sidebar。

### 反馈问题

请提供插件和 Obsidian 版本、操作系统、复现步骤、预期与实际结果。使用虚构的小型测试库，并对截图去除隐私。**不要上传私人 Vault、`data.json`、凭据或应用配置目录。** 公开提交前请先删除敏感信息。

### 提交修改

1. 较大调整先通过 Issue 讨论；每个 PR 聚焦一个问题。
2. 使用 Node.js 22、pnpm 10.11.0，执行 `pnpm install --frozen-lockfile`。
3. 运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm check:legacy`、`pnpm check:ui` 和 `pnpm check:release`。
4. 只在独立、已备份的示例库中测试。设置相关修改需检查 Obsidian 1.7.7 的旧设置页、1.13+ 的设置与搜索、中英界面、键盘操作和明暗模式。
5. 在 PR 中说明实际验证范围和未验证项；自动化接口测试不等于宿主或实机测试。

保持现有命令 ID、文件引用、保存数据及 Obsidian 1.7.7 最低版本不变。新接口必须保留旧版路径。设置只是 Bucket 完整数据的一部分，请使用已有保存方法，不能仅保存设置而覆盖分组。为行为修改添加回归测试，同步中英文，并保留许可证声明。

### 发行（维护者）

同步修改版本元数据、中英文介绍及发行说明，推送审核后的源码并等待 CI 通过。在 `main` 上手动运行 **Release with provenance**，填写不含 `v` 的准确版本号。流程完成构建、检查、来源证明、草稿上传和下载字节核验后才公开发布；已有版本或标签会阻止发布，失败草稿应人工检查，不自动删除或覆盖。不要用其它文件覆盖已证明的发行附件。

Community 附件仅包含 `main.js`、`manifest.json`、`styles.css`，绝不包含用户 `data.json`。随后触发 Community 更新检查并查看独立扫描结果。GitHub 构建成功不等于 Community 已接收或移动端兼容性已通过。
