# Bucket Sidebar

**One file. More than one way to organise it.**

A research note can belong beside a project brief, on a reading shelf and in this week’s working set. Bucket Sidebar lets you organise references to Markdown notes, PDFs and folders around what you are doing, without moving or duplicating the originals. Keep the folder structure you already have; give each task its own useful view.

[中文](README.zh-CN.md) · [Downloads](https://github.com/BADtoBad/obsidian-bucket-sidebar/releases) · [Keyline theme](https://github.com/BADtoBad/obsidian-keyline)

![Bucket Sidebar in light mode: space tabs, a pinned note and three groups on the right](assets/keyline-showcase-light.png)

**Bucket is the grouped panel on the right.** These native screenshots use the fictional, all-English [Keyline Studio example Vault](https://github.com/BADtoBad/obsidian-keyline#try-the-example-vault), with the optional Keyline theme and Keyline interactions.

## Organise around your work

- **Reuse a reference, not a copy.** Put the same note or PDF in several Buckets. Each reference opens the same source file, so edits do not create competing versions.
- **Separate contexts without splitting the Vault.** Use spaces for work, personal projects or research, then arrange named Buckets within each space.
- **Keep today’s material close.** Pin frequently used references and drag items into an order that makes sense for the current task.
- **Bring in folders without taking everything.** Navigate nested folders and exclude items that do not belong in the group. Create a note or subfolder at a chosen real path when you need new material.
- **Change the arrangement, keep the files.** Removing a reference only removes it from Bucket. References follow file renames, and supported Bucket operations can be undone.

## A sidebar for the task at hand

The example separates Studio and Personal spaces, pins a starting note, and groups references under In focus, Reference shelf and Daily practice. You can build your own view of the same Vault instead of repeatedly reorganising its real folders. English and Chinese menus and settings follow Obsidian’s interface language.

![Bucket Sidebar in dark mode: the same pinned references and groups without rearranging the original files](assets/keyline-showcase-dark.png)

The coloured file-type icons in the **native File Explorer on the left** and the workspace switcher come from Keyline interactions. Bucket currently references Markdown and PDF files; other attachment formats shown in the native explorer are not Bucket features.

## Recommended companions

Bucket works independently. Pair it with the **[Keyline theme](https://github.com/BADtoBad/obsidian-keyline)** for a coordinated, ready-to-use light and dark workspace. Add **[Keyline interactions](https://github.com/BADtoBad/keyline-interactions)** for block editing, file-type icons and workspace switching. Neither is required by Bucket.

## Your files and data

Bucket stores references and settings in this Vault’s plugin `data.json`. Normal operation makes no network requests, and there is no telemetry or self-updater. Removing a Bucket reference does not delete its source; an explicit **Delete file** action in a file menu does delete the real file.

## Install / upgrade

Use **Add to Obsidian** on the [Bucket Sidebar Community page](https://community.obsidian.md/plugins/bucket-sidebar), or use the manual installation steps below.

Requires **Obsidian 1.7.7+**. Back up `.obsidian` and close the Vault. Copy `main.js`, `manifest.json`, and `styles.css` from Releases into `.obsidian/plugins/bucket-sidebar/`. Preserve your existing `data.json`, reopen Obsidian, and enable **Bucket Sidebar**.

## Language and compatibility

Current release: **0.5.7**. The interface supports English and Chinese; restart after changing Obsidian’s language. Settings are searchable on Obsidian 1.13+; older versions keep the same controls. Existing user-defined names stay unchanged. Disabling and re-enabling the plugin preserves its pane placement. Desktop macOS is the release-tested environment; mobile is not yet device-validated. See [release verification](RELEASE-VERIFICATION.md).

## Build

Use Node.js 22 and pnpm 10.11.0:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check:release
```

The type check also validates browser-only ES2018 APIs without ambient Node types. `check:release` stages exactly `main.js`, `manifest.json`, and `styles.css` in a temporary folder. Releases use the **Release with provenance** workflow to build, attest and verify these exact three files before publication. Optional manual-install ZIPs belong outside Community release assets. See [contributing and release instructions](CONTRIBUTING.md).

## Feedback and license

Report version, reproduction steps, and a sanitised screenshot. Do not attach your private Vault or plugin data file to a public issue.

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
