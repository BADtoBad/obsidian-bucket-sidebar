# Bucket Sidebar — verification

## Unreleased compact rows and mobile polish — 2026-10-19

- Desktop default/reset row height is now **28px** (previously 32px). Existing saved heights, including 32px, are preserved; no preference migration or configuration rewrite runs at startup. Bucket-owned row selectors now respect that preference even when Keyline supplies a different minimum.
- The current view retains horizontal Space scrolling on refresh, reveals a newly selected Space and remembers each Space's vertical position for the lifetime of the view. These positions are not persisted or synced; closing the view clears them.
- Mobile target picking initially focuses a non-editable heading, not the search input. Desktop deferred search focus remains, with a disconnected-element guard. The heading uses separate action/name lines on mobile, and the selection ring is visually 22px inside the unchanged 44px target. Full names remain in text/accessible content.
- Mobile settings explicitly label the slider “Desktop row height” / “桌面行高” and explain that it does not change phone row height. These changes follow the Apple HIG distinction between touch area and visual control size, and respect software-keyboard intent.
- Full and browser-only TypeScript checks, **123 automated tests**, production build, legacy/API checks and UI contracts passed. ESLint: zero errors, one existing stable-command-ID advisory. New tests execute the actual picker with mobile/desktop Platform stubs in both languages and verify new/reset defaults without overwriting stored preferences.
- The owned Obsidian 1.13.7 macOS host harness passed **50 checks**: eight unchanged desktop comparisons using an existing 40px preference, default/Keyline 28px rendering, retained desktop search focus, 32 mobile layout cases, touch interactions, and Space/scroll restoration. The fixture verified 400px vertical and 582px horizontal positions survived refresh, and returning to the Space restored 400px.
- Evidence: suite `docs/evidence/plugin-mobile-polish-2026-10-19/result.json` and screenshots; harness `scripts/check-plugin-mobile-host.mjs`. Captures were reviewed. The fixture still uses the desktop Platform runtime: mobile focus decisions are covered by the separate stub tests, not a real software-keyboard test.
- **Unreleased; no personal Vault installation.** No storage/retry logic, note contents, command IDs or dependency versions changed. iOS WebKit, Android, software keyboards, VoiceOver and mobile drawer lifecycle still need physical-device acceptance.

桌面默认行高由 32px 缩至 28px；已保存设置保留，旧库可通过“恢复默认行高”采用新密度。移动端继续保持 44px 点击区，并补齐 Space 滚动位置、选择器标题/按钮和搜索焦点处理。本轮未发布，也未修改个人 Vault。

## Unreleased mobile touch pass — 2026-10-19

- Mobile-only touch targets (at least 44px), persistent row menus, a visible current-Space menu, capped deep indentation and a shrinkable/wrapping target picker. Keyline's desktop hover/overlay styling is overridden only under `body.is-mobile`.
- Saved desktop row height, data schema, storage/retry logic, drag behaviour and note contents are unchanged. Mobile settings explain the separate touch-size floor in English and Chinese.
- TypeScript, 116 tests, production build, legacy checks and UI contracts pass. ESLint: zero errors; the existing stable-command-ID advisory remains.
- Isolated Obsidian 1.13.7 macOS renderer: 8 desktop geometry/style comparisons match the previous CSS; 32 mobile sidebar/picker cases pass across 320/390/430/768px, default/Keyline themes and light/dark. Touch menus, collapse/expand, selecting/adding a reference with disk verification, file opening and constrained-height picker checks pass. The combined suite harness also verifies desktop Keyline load/unload (46 checks total).
- Evidence/harness: suite `docs/evidence/plugin-mobile-2026-10-19/result.json` and `scripts/check-plugin-mobile-host.mjs`. Captures were visually reviewed. The harness owns a temporary Vault/profile, never personal Vaults.
- **Not released or installed in a personal Vault.** Physical iOS/Android, iOS WebKit, software keyboards, VoiceOver and native mobile drawer lifecycle remain unverified. Emulated mobile CSS and touch input are not device certification.

本轮为未发布的移动端低风险补丁：触控入口常显、点击区至少 44px、弹窗适应窄屏；不改桌面保存设置、文件内容或保存恢复逻辑。默认主题与 Keyline 明暗模式已完成独立宿主模拟检查，尚不代表 iPhone／Android 真机验收。

## Bucket Sidebar 0.5.7 — patch verification, 2026-10-19

- Same pinned dependencies and lockfile as 0.5.6; Obsidian minimum remains 1.7.7.
- 83 automated tests passed: 71 existing regression tests, eight settings-contract cases and four release-policy cases. Settings tests execute the actual bundled plugin with a minimal host stub, exercise English/Chinese and old/new render paths, and confirm complete-data persistence, bounds, reset, no writes during indexing/rendering, and matching labels. They are not a replacement for actual host settings-search UI acceptance.
- Full and browser-only ES2018 type checks, production build, legacy/API checks, UI contracts, version/asset checks and ESLint passed with zero errors. Two existing lint advisories remain (legacy language lookup and stable command ID); the missing settings-definition advisory is resolved locally.
- CSS, saved-data model, dependency lockfile and all command IDs are unchanged from 0.5.6. The native controls remain keyboard-operable through the existing host components; no custom UI or theme styling was introduced.
- No personal Vault installation or data changes. Native application automation was unavailable during this patch, so **no fresh real-Obsidian, old-Mac or mobile UI pass is claimed**. The historical 1.7.7/1.13.7 host baseline below remains historical.
- The new manually dispatched GitHub workflow builds from `main`, generates and verifies attestations for all three files, stages a draft, validates both asset digests and downloaded bytes, then publishes. Existing releases/tags cause it to stop rather than overwrite. Check the linked GitHub Actions run and Community scan for external publication results; local checks alone do not establish either.

Primary API reference: [Obsidian's dual-support migration guide](https://docs.obsidian.md/plugins/guides/migrate-declarative-settings). The old `display()` path and new `getSettingDefinitions()` share render callbacks. Automatic control saving is deliberately not used because settings are nested within the full Bucket data object.

## Previous 0.5.6 patch verification — 2026-10-19

- Frozen-lockfile dependency install completed with pnpm 10.11.0. Local checks used Node.js 24.19.0; CI separately uses Node.js 22.
- 71 regression tests passed, including six new folder-expansion cases covering pinned and grouped references, nested paths, existing expansion/exclusion state, unrelated paths, non-ASCII names, and Space isolation.
- Both the full TypeScript project and a browser-only ES2018 project without ambient Node types passed. The latter prevents Node type declarations from masking unsupported browser APIs.
- Obsidian ESLint passed with zero errors and zero unsafe-type diagnostics, including a separate browser-only type-aware run. Three existing advisory warnings remain: the legacy language fallback, stable command ID, and settings-search API. None was disabled for this patch.
- Production build, ES2018/CommonJS legacy checks, UI contracts, version consistency, and standard release-asset staging passed.
- The isolated accessible-label browser fixture passed light/dark and English/Chinese checks: both baseline and current trees expose their names in the accessibility tree; visible row dimensions and offsets match. This is a CSS/accessibility regression check, not a complete Obsidian-host test or VoiceOver listening test.
- The theme compatibility boundary and existing `!important` declarations are unchanged. The hidden label no longer uses `clip-path`.
- The 0.5.6 release stages only `main.js`, `manifest.json`, and `styles.css`. Existing releases and their downloadable ZIPs are retained.
- No personal Vault installation or data change was performed. Minimum supported Obsidian version remains 1.7.7. No new physical old-Mac or mobile certification is claimed.

To reproduce the label check: run `node scripts/serve-label-check.mjs`, open the printed loopback URL, inspect both tree names in the browser accessibility view, and compare each pair of rows. Stop the server after use.

## Historical full-host baseline — 2026-10-18

The checks below apply to the previous full-host baseline, not a fresh host run of 0.5.6.

Versions: Keyline theme 0.8.23; optional Keyline interactions 0.7.4; Bucket Sidebar 0.5.5.

## Checks performed

- TypeScript checks, production builds and regression tests: 453 interaction tests and 65 Bucket tests passed.
- Official Obsidian ESLint recommended rules: no errors in either plugin. Remaining advisory warnings are reviewed below.
- Official Obsidian Stylelint preset: no errors. 23 advisory warnings with the browser target lowered to Electron 31. Explicit, documented exceptions retain Obsidian-owned mixed-case selectors, measured platform font aliases, and the established component cascade.
- Real macOS Obsidian 1.13.7: both plugins load; settings pass English/Chinese, light/dark and wide/narrow cases (8 combinations).
- Official Obsidian 1.7.7 application core running in a separate current Electron/macOS host: both plugins load and the same 8 settings combinations pass. Static inspection also confirms all 42 imported host symbols exist in 1.7.7.
- Bucket: disable/re-enable retains leaf identity, parent and saved data on both cores. View opening waits for reveal completion; an injected rejection is handled without escaping the command.
- Theme cleanup: before/after computed visual styles and element geometry match in light/dark on 1.13.7 (402 visible elements) and 1.7.7 (404 elements).
- Bucket bundle remains ES2018/CommonJS, imports only the host module, and passes the standalone UI contract checks.

## Deliberate compatibility choices

- Document-specific element creation remains in the interaction plugin for pop-out ownership; replacing it with a main-document shortcut is not a safe mechanical cleanup.
- The legacy language fallback and IME composition guard remain for older hosts. New settings-definition APIs are not assumed available on the minimum supported core.
- Bucket's existing command ID remains stable so user hotkeys do not silently break.
- Theme `:has()` selectors are limited to specific rows/paragraphs, not unrestricted document descendants. Remaining `!important` rules target host cursor/overlay behavior; partial-support warnings concern basic clip-path/text-indent forms, visually checked in the host.

## Limits and publication status

- The old-core test uses today's Electron runtime. It is **not** a physical old-Mac, macOS 10.15, old WebView, iOS, Android, Windows or Linux device certification.
- Mobile device acceptance and arbitrary third-party plugin combinations remain unverified. Bucket uses host APIs and has no Node-only runtime dependency, but this does not substitute for mobile testing.
- Screenshots include optional companions; the theme itself does not supply JavaScript interactions.
- GitHub publication is not Community directory acceptance. Theme and Bucket are prepared for independent Community submission. Interaction-plugin submission is on hold until publicly documented upstream permission is available; upstream MIT notices and provenance remain intact.

## Reproduce local checks

Use Node.js 22 and pnpm 10.11.0 with the committed lockfile. Run `pnpm install --frozen-lockfile`, then `pnpm lint`. Plugin repositories also support `pnpm typecheck`, `pnpm test`, and `pnpm build`; run `pnpm pretest` before the interaction suite. Bucket adds `pnpm check:legacy` and `pnpm check:ui`.

No personal Vault content, credentials, application profiles or workspace recovery files are part of these packages.
