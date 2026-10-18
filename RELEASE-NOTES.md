# Bucket Sidebar 0.5.7

## English

A small settings-discovery and release-trust patch. Minimum Obsidian version remains **1.7.7**.

- Make **Show Space names** and **Sidebar row height** discoverable in Obsidian 1.13+'s settings search. Older hosts keep their existing settings page, sharing the same controls and persistence.
- Reset row height in place, without rebuilding the settings page. Settings changes still save the complete Bucket data, including spaces, references and sort preferences.
- Build release files in GitHub Actions, generate and verify provenance attestations, then check uploaded bytes before publishing. Existing releases are never overwritten by this workflow.
- Add an English/Chinese contributing guide with privacy, compatibility and release instructions.

No CSS changes, command-ID or shortcut changes, dependency upgrades, data migrations, or personal Vault installation. The retained theme-isolation rules and stable command ID may still produce Community advisories; this patch does not promise a different overall rating.

Validation: **83 tests passed**, including eight new English/Chinese legacy/declarative settings-contract cases and four release-validation cases. Type checks, lint, build, legacy checks, UI contracts and release-asset checks passed. The new settings tests exercise the production plugin with host stubs, **not a new real-Obsidian or mobile-device UI run**. See [verification details](RELEASE-VERIFICATION.md).

Update through Community or replace only `main.js`, `manifest.json` and `styles.css` in `.obsidian/plugins/bucket-sidebar/`. Preserve your existing `data.json`.

## 中文

本次只补充设置搜索、发行来源证明和贡献指南，最低版本仍为 **Obsidian 1.7.7**。

- Obsidian 1.13+ 可以搜索「显示 Space 名称」「侧栏行高」；旧版保留原有设置页，新旧路径共享控件与保存方式。
- 恢复默认行高时只更新当前滑块，不重建整个设置页。修改设置仍保存完整 Bucket 数据，保留空间、引用与排序偏好。
- 由 GitHub Actions 构建发行文件、生成并验证来源证明，再核对上传后的字节，最后公开发布；该流程不覆盖已有发行版本。
- 添加中英文贡献指南，说明隐私保护、兼容性检查与发行流程。

不改 CSS、命令 ID、快捷键或数据结构，不升级依赖，也不安装到个人 Vault。为兼容主题保留的强制样式和稳定命令 ID 仍可能触发 Community 提示，本次不承诺整体评级改变。

验证：**83 项测试通过**，新增 8 项中英／新旧设置接口测试与 4 项发行校验测试；类型、规范、构建、旧版语法、界面约束及发行附件检查通过。设置测试运行真实插件代码，但宿主为测试替身，**不等于新的 Obsidian 实机或移动端界面验收**。详见 [验证说明](RELEASE-VERIFICATION.md)。

通过 Community 更新，或仅替换 `.obsidian/plugins/bucket-sidebar/` 下的 `main.js`、`manifest.json`、`styles.css`；请保留原有 `data.json`。
