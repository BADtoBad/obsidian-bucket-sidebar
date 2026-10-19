# Bucket Sidebar 0.5.8

## English

A more compact desktop sidebar, clearer mobile controls and safer save recovery. Minimum Obsidian version remains **1.7.7**.

- Desktop default/reset row height is now **28px**, closer to the native sidebar. All saved heights are preserved, including 32px; use **Reset row height** to adopt the new default. The preference also works when the Keyline theme is enabled.
- Mobile rows and controls keep at least **44px** touch targets. Row and Space menus stay visible, deep indentation is capped, and the target picker fits narrow screens. Opening the mobile picker focuses its heading rather than immediately requesting the keyboard; desktop search autofocus is retained.
- Refreshing a view preserves horizontal Space scrolling and each Space's vertical position. These positions are remembered only for the lifetime of the view, not written to or synced with your data.
- Failed saves retain the latest complete data snapshot and show a persistent **Retry saving** notice. Saves are read back for verification so a host write failure is not mistaken for success. Retry before closing the Vault or disabling the plugin: unsaved changes exist only in the current session.
- English and Chinese mobile settings now call the row slider **Desktop row height**, making the separate phone touch-size floor explicit.

No data-schema migration, dependency upgrade, command-ID or shortcut change. No personal Vault installation. Existing theme-isolation CSS and the stable command ID may still produce Community advisories; this patch does not promise a different overall rating.

Validation: **123 automated tests** and **50 checks in an isolated Obsidian 1.13.7 macOS host** passed, including default/Keyline themes, unchanged desktop custom heights, compact rows, mobile-layout emulation, touch actions and scroll restoration. Type checks, lint, build, legacy checks, UI contracts and release-asset checks passed. Mobile focus logic is separately covered with host stubs. **Physical iOS/Android, software keyboards, VoiceOver and mobile drawer lifecycle remain unverified.** See [verification details](RELEASE-VERIFICATION.md).

Update through Community or replace only `main.js`, `manifest.json` and `styles.css` in `.obsidian/plugins/bucket-sidebar/`. Preserve your existing `data.json`.

## 中文

本次让桌面侧栏更紧凑、移动端操作入口更清晰，并补齐保存失败后的恢复。最低版本仍为 **Obsidian 1.7.7**。

- 桌面默认／重置行高改为 **28px**，更接近原生侧栏。包括 32px 在内的已有设置全部保留；可点击 **恢复默认行高** 使用新密度。启用 Keyline 主题时也会正确遵循该设置。
- 移动端的行和控件保留至少 **44px** 触控区；行菜单和 Space 菜单常显，限制深层缩进，选择器适应窄屏。打开移动端选择器时先聚焦标题，不立即请求弹出键盘；桌面端保留搜索自动聚焦。
- 视图刷新时保留 Space 栏的横向滚动及各 Space 的纵向位置。位置只在当前视图存续期间记忆，不写入或同步到数据文件。
- 保存失败时保留最新完整数据快照，持续显示 **重试保存** 提示；保存后读回校验，避免把宿主写入失败误判为成功。请在关闭库或停用插件前重试，未保存的修改只存在于当前会话。
- 中英文移动设置将行高滑块明确标为 **桌面行高**，说明手机触控行高独立保留。

不迁移数据结构，不升级依赖，不修改命令 ID 或快捷键，也不安装到个人 Vault。主题隔离样式与稳定命令 ID 仍可能触发 Community 提示，本次不承诺整体评级改变。

验证：**123 项自动化测试**及**独立 Obsidian 1.13.7 macOS 宿主中的 50 项检查**通过，覆盖默认／Keyline 主题、桌面已有自定义行高不变、新默认密度、移动布局模拟、触控操作与滚动位置恢复；类型、规范、构建、旧版语法、界面约束及发行附件检查通过。移动焦点逻辑另有宿主替身测试。**iOS／Android 真机、软键盘、VoiceOver 和移动抽屉生命周期尚未验收。** 详见 [验证说明](RELEASE-VERIFICATION.md)。

通过 Community 更新，或仅替换 `.obsidian/plugins/bucket-sidebar/` 下的 `main.js`、`manifest.json`、`styles.css`；请保留原有 `data.json`。
