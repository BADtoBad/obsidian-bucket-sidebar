# Bucket Sidebar

Curate your workspace without rearranging your files. Bucket Sidebar groups references to existing notes and folders into independent spaces.

[中文](README.zh-CN.md) · [Downloads](https://github.com/BADtoBad/obsidian-bucket-sidebar/releases) · [Keyline theme](https://github.com/BADtoBad/obsidian-keyline)

## Features

- Multiple spaces, named Buckets, pinned references, and nested folders.
- The same file can appear in multiple Buckets without duplication.
- Create notes or folders inside a selected path.
- Rename-aware references, selection, drag reordering, folder exclusions, and undo for supported Bucket operations.
- English and Chinese menus/settings that follow Obsidian’s interface language. Restart after switching language. Existing user-defined names stay unchanged.

Removing a Bucket reference does not delete the original file. Explicit file deletion in a file menu remains a real file operation; do not confuse the two.

## Install / upgrade

Requires **Obsidian 1.7.7+**. Back up `.obsidian` and close the Vault. Copy `main.js`, `manifest.json`, and `styles.css` from Releases into `.obsidian/plugins/bucket-sidebar/`. Preserve your existing `data.json`, reopen Obsidian, and enable **Bucket Sidebar**.

Keyline is recommended for the coordinated visual style but is not required. The first bilingual public preview is **0.5.4**. Desktop macOS is the release-tested environment; mobile is not yet validated.

## Build

Use Node.js 22 and pnpm 10.11.0:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

## Feedback and license

Report version, reproduction steps, and a sanitised screenshot. Do not attach your private Vault or plugin data file to a public issue.

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
