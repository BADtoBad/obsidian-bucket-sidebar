# Bucket Sidebar

不用移动文件，也能重新组织工作空间。Bucket Sidebar 将既有笔记和文件夹的引用整理为独立 Space 与 Bucket。

[English](README.md) · [下载](https://github.com/BADtoBad/obsidian-bucket-sidebar/releases) · [Keyline 主题](https://github.com/BADtoBad/obsidian-keyline)

## 功能

- 多个 Space、命名 Bucket、置顶引用与嵌套文件夹。
- 同一文件可出现在多个 Bucket 中，不复制原文件。
- 在选定路径下新建笔记或文件夹。
- 随重命名更新引用，支持选择、拖动排序、文件夹排除和部分 Bucket 操作撤销。
- 中文与英文菜单、设置，跟随 Obsidian 界面语言，切换后重启。已保存的用户自定义名称不变。

移除 Bucket 引用不会删除原文件；文件菜单中的明确“删除文件”仍是真实文件操作，请区分。

## 安装与升级

需要 **Obsidian 1.7.7+**。备份 `.obsidian` 并关闭库，将 Releases 的 `main.js`、`manifest.json`、`styles.css` 放入 `.obsidian/plugins/bucket-sidebar/`，保留自己的 `data.json`。重新打开 Obsidian，启用 **Bucket Sidebar**。

建议搭配 Keyline 获得统一样式，但并非强制依赖。当前版本 **0.5.5**，修复停用后侧栏位置重置及打开视图时的错误处理。发行验收环境为 macOS 桌面端，移动端尚未实机验证。详见 [发行验证](RELEASE-VERIFICATION.md)。

引用目前支持 Markdown 和 PDF；其它附件仍可在 Obsidian 原生文件浏览器中使用。常规操作不发起网络请求，无遥测或自更新；引用和设置保存在本库插件的 `data.json`，只有明确的文件操作才改动笔记。构建检查需包含 `pnpm lint`。

## 构建与反馈

使用 Node.js 22 和 pnpm 10.11.0，运行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm test`、`pnpm build`。

反馈请附版本、复现步骤和已去除隐私的截图，不要将私人 Vault 或插件数据文件上传到公开 Issue。

MIT，见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
