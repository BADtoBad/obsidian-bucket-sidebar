import { localize } from './locale/ui';
import { App, Modal, TAbstractFile, TFile, TFolder, setIcon } from "obsidian";
import {
  Bucket,
  BucketTarget,
  isPathExcluded,
  isSameOrDescendant,
  normalizeDescendantPaths
} from "./model";
import {
  SelectionMarkers,
  createSelectionMarkers,
  exclusionsForRoot,
  isMarkerPartial,
  isMarkerSelected,
  selectedPlanRoots,
  toggleMarkerSelection
} from "./selection";

function isBucketFile(file: TAbstractFile): file is TFile {
  return file instanceof TFile && ["md", "pdf"].includes(file.extension.toLowerCase());
}

function eligibleChildren(folder: TFolder): Array<TFile | TFolder> {
  return folder.children
    .filter((child): child is TFile | TFolder => child instanceof TFolder || isBucketFile(child))
    .sort((left, right) => {
      const leftFolder = left instanceof TFolder;
      const rightFolder = right instanceof TFolder;
      if (leftFolder !== rightFolder) return leftFolder ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
}

function appendIcon(parent: HTMLElement, icon: string, className: string): HTMLElement {
  const element = createSpan();
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  setIcon(element, icon);
  parent.appendChild(element);
  return element;
}

export class BatchTargetPickerModal extends Modal {
  private readonly bucket: Bucket;
  private readonly onSubmitTargets: (targets: BucketTarget[], selectedItemCount: number) => void;
  private readonly markers: SelectionMarkers = createSelectionMarkers();
  private readonly expandedPaths = new Set<string>();
  private readonly filesByPath = new Map<string, TFile | TFolder>();
  private query = "";
  private treeEl: HTMLElement | null = null;
  private confirmButton: HTMLButtonElement | null = null;
  private countEl: HTMLElement | null = null;

  constructor(
    app: App,
    bucket: Bucket,
    onSubmitTargets: (targets: BucketTarget[], selectedItemCount: number) => void
  ) {
    super(app);
    this.bucket = bucket;
    this.onSubmitTargets = onSubmitTargets;
    this.indexFiles(this.app.vault.getRoot());
  }

  onOpen(): void {
    this.modalEl.classList.add("bucket-target-picker-modal");
    this.titleEl.textContent = localize`添加到 ${this.bucket.name}`;
    this.contentEl.replaceChildren();

    const layout = createDiv();
    layout.className = "bucket-target-picker";

    const search = createEl("input");
    search.type = "search";
    search.className = "bucket-target-search";
    search.placeholder = localize("搜索 Markdown、PDF 或文件夹…");
    search.setAttribute("aria-label", localize("搜索 Markdown、PDF 或文件夹"));
    search.addEventListener("input", () => {
      this.query = search.value.trim().toLocaleLowerCase();
      this.renderTree(false);
    });

    this.treeEl = createDiv();
    this.treeEl.className = "bucket-target-tree";
    this.treeEl.setAttribute("role", "tree");
    this.treeEl.setAttribute("aria-label", localize("Vault 文件层级"));

    const hint = createDiv();
    hint.className = "bucket-target-hint";
    hint.textContent = localize("选择文件夹会包含其后代；可继续取消不需要的子项。");

    const footer = createDiv();
    footer.className = "bucket-target-footer";
    this.countEl = createDiv();
    this.countEl.className = "bucket-target-count";

    const footerActions = createDiv();
    footerActions.className = "bucket-target-footer-actions";
    const cancel = createEl("button");
    cancel.type = "button";
    cancel.textContent = localize("取消");
    cancel.addEventListener("click", () => this.close());
    this.confirmButton = createEl("button");
    this.confirmButton.type = "button";
    this.confirmButton.className = "mod-cta";
    this.confirmButton.addEventListener("click", () => this.submit());

    footerActions.append(cancel, this.confirmButton);
    footer.append(this.countEl, footerActions);
    layout.append(search, this.treeEl, hint, footer);
    this.contentEl.appendChild(layout);

    this.renderTree(false);
    window.setTimeout(() => search.focus(), 0);
  }

  onClose(): void {
    this.modalEl.classList.remove("bucket-target-picker-modal");
    this.contentEl.replaceChildren();
    this.treeEl = null;
    this.confirmButton = null;
    this.countEl = null;
  }

  private indexFiles(folder: TFolder): void {
    for (const child of eligibleChildren(folder)) {
      this.filesByPath.set(child.path, child);
      if (child instanceof TFolder) this.indexFiles(child);
    }
  }

  private renderTree(preserveScroll: boolean): void {
    if (!this.treeEl) return;
    const previousScroll = preserveScroll ? this.treeEl.scrollTop : 0;
    this.treeEl.replaceChildren();
    const matchCache = new Map<string, boolean>();
    const root = this.app.vault.getRoot();

    for (const child of eligibleChildren(root)) {
      if (!this.matchesTree(child, matchCache)) continue;
      this.renderNode(this.treeEl, child, 0, matchCache);
    }

    if (!this.treeEl.hasChildNodes()) {
      const empty = createDiv();
      empty.className = "bucket-target-empty";
      empty.textContent = this.query ? localize("没有匹配的文件或文件夹") : localize("Vault 中没有 Markdown、PDF 或文件夹");
      this.treeEl.appendChild(empty);
    }
    this.treeEl.scrollTop = previousScroll;
    this.updateFooter();
  }

  private renderNode(
    parent: HTMLElement,
    file: TFile | TFolder,
    depth: number,
    matchCache: Map<string, boolean>
  ): void {
    const row = createDiv();
    row.className = "bucket-target-row";
    row.style.setProperty("--bucket-picker-indent", `${depth * 14}px`);
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-level", String(depth + 1));

    const isFolder = file instanceof TFolder;
    const hasMatchingChild = isFolder && eligibleChildren(file).some((child) => this.matchesTree(child, matchCache));
    const expanded = isFolder && (this.expandedPaths.has(file.path) || (Boolean(this.query) && hasMatchingChild));
    if (isFolder) row.setAttribute("aria-expanded", String(expanded));

    if (isFolder) {
      const disclosure = createEl("button");
      disclosure.type = "button";
      disclosure.className = "bucket-target-disclosure";
      disclosure.setAttribute("aria-label", expanded ? localize`收起 ${file.path}` : localize`展开 ${file.path}`);
      setIcon(disclosure, expanded ? "chevron-down" : "chevron-right");
      disclosure.addEventListener("click", () => this.toggleFolder(file.path));
      row.appendChild(disclosure);
    } else {
      const spacer = createSpan();
      spacer.className = "bucket-target-disclosure-spacer";
      row.appendChild(spacer);
    }

    appendIcon(row, isFolder ? "folder" : "file-text", "bucket-target-icon");

    const label = createEl("button");
    label.type = "button";
    label.className = "bucket-target-label";
    label.textContent = file instanceof TFile && file.extension.toLowerCase() === "md" ? file.basename : file.name;
    label.title = file.path;
    label.addEventListener("click", () => {
      if (isFolder) this.toggleFolder(file.path);
      else this.toggleTarget(file.path);
    });
    row.appendChild(label);

    const existing = this.isCoveredByExisting(file.path);
    const selected = existing || isMarkerSelected(file.path, this.markers);
    const partial = !existing && isMarkerPartial(file.path, this.markers);
    if (selected) row.classList.add("is-selected");
    if (partial) row.classList.add("is-partial");
    if (existing) row.classList.add("is-existing");
    row.setAttribute("aria-selected", String(selected));

    const toggle = createEl("button");
    toggle.type = "button";
    toggle.className = "bucket-target-toggle";
    if (selected) toggle.classList.add("is-selected");
    if (partial) toggle.classList.add("is-partial");
    if (existing) toggle.classList.add("is-existing");
    toggle.disabled = existing;
    toggle.setAttribute("aria-checked", partial ? "mixed" : String(selected));
    toggle.setAttribute("role", "checkbox");

    const stateLabel = existing
      ? localize("已在此 Bucket 中")
      : partial
        ? localize("部分选中")
        : selected
          ? localize("取消加入")
          : localize("加入");
    toggle.setAttribute("aria-label", `${stateLabel}：${file.path}`);
    toggle.title = stateLabel;
    setIcon(toggle, partial ? "minus" : selected ? "check" : "plus");
    toggle.addEventListener("click", () => this.toggleTarget(file.path));
    row.appendChild(toggle);
    parent.appendChild(row);

    if (isFolder && expanded) {
      for (const child of eligibleChildren(file)) {
        if (!this.matchesTree(child, matchCache)) continue;
        this.renderNode(parent, child, depth + 1, matchCache);
      }
    }
  }

  private toggleFolder(path: string): void {
    if (this.expandedPaths.has(path)) this.expandedPaths.delete(path);
    else this.expandedPaths.add(path);
    this.renderTree(true);
  }

  private toggleTarget(path: string): void {
    if (this.isCoveredByExisting(path)) return;
    toggleMarkerSelection(path, this.markers);
    this.renderTree(true);
  }

  private matchesTree(file: TFile | TFolder, cache: Map<string, boolean>): boolean {
    if (!this.query) return true;
    const cached = cache.get(file.path);
    if (cached !== undefined) return cached;
    const matchesSelf = file.name.toLocaleLowerCase().includes(this.query) ||
      file.path.toLocaleLowerCase().includes(this.query);
    const matchesChild = file instanceof TFolder &&
      eligibleChildren(file).some((child) => this.matchesTree(child, cache));
    const matches = matchesSelf || matchesChild;
    cache.set(file.path, matches);
    return matches;
  }

  private isCoveredByExisting(path: string): boolean {
    return this.bucket.entries.some((entry) => {
      if (entry.type === "file") return entry.path === path;
      return isSameOrDescendant(path, entry.path) && !isPathExcluded(entry, path);
    });
  }

  private selectedItemCount(): number {
    let count = 0;
    for (const [path] of this.filesByPath) {
      if (!this.isCoveredByExisting(path) && isMarkerSelected(path, this.markers)) count += 1;
    }
    return count;
  }

  private buildTargets(): BucketTarget[] {
    const targets: BucketTarget[] = [];
    for (const path of selectedPlanRoots(this.markers)) {
      const file = this.filesByPath.get(path);
      if (!file || this.isCoveredByExisting(path)) continue;
      if (file instanceof TFolder) {
        const existingDescendants = this.bucket.entries
          .map((entry) => entry.path)
          .filter((existingPath) => existingPath !== path && isSameOrDescendant(existingPath, path));
        const excludedPaths = normalizeDescendantPaths(path, [
          ...exclusionsForRoot(path, this.markers),
          ...existingDescendants
        ]);
        targets.push({ type: "folder", path, excludedPaths });
      } else {
        targets.push({ type: "file", path });
      }
    }
    return targets;
  }

  private updateFooter(): void {
    const count = this.selectedItemCount();
    const targets = this.buildTargets();
    if (this.countEl) this.countEl.textContent = count > 0 ? localize`已选择 ${count} 项` : localize("尚未选择新项目");
    if (this.confirmButton) {
      this.confirmButton.textContent = count > 0 ? localize`加入 ${count} 项` : localize("加入");
      this.confirmButton.disabled = count === 0 || targets.length === 0;
    }
  }

  private submit(): void {
    const count = this.selectedItemCount();
    const targets = this.buildTargets();
    if (count === 0 || targets.length === 0) return;
    this.onSubmitTargets(targets, count);
    this.close();
  }
}
