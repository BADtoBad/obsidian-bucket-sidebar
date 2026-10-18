import { localize } from './locale/ui';
import {
  App,
  FuzzySuggestModal,
  ItemView,
  Menu,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  TFolder,
  WorkspaceLeaf,
  setIcon
} from "obsidian";
import {
  Bucket,
  BucketData,
  BucketEntry,
  BucketTarget,
  FolderSortOrder,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_SPACE_ICON,
  MAX_ROW_HEIGHT,
  MIN_ROW_HEIGHT,
  Space,
  addBucket,
  addEntryToBucket,
  addPinnedEntry,
  addSpace,
  cloneData,
  copyEntryBetweenBuckets,
  createEmptyData,
  findBucket,
  getActiveSpace,
  getFolderSortOrder,
  isPathExcluded,
  isTargetPinned,
  normalizeData,
  normalizeRowHeight,
  removeBucket,
  removeEntryFromBucket,
  removePinnedEntry,
  removeSpace,
  renameBucket,
  renameSpace,
  reorderEntry,
  setActiveSpace,
  setSpaceIcon,
  setFolderSortOrder,
  updatePathsAfterRename
} from "./model";
import { BatchTargetPickerModal } from "./target-picker";
import { CreateFolderModal } from "./create-folder-modal";
import { validateFolderName } from "./folder-name";
import { compareFolderChildren } from "./folder-sort";
import { expandFolderAncestors } from "./folder-expansion";

const VIEW_TYPE_BUCKET_SIDEBAR = "bucket-sidebar-view";
const DRAG_MIME = "application/x-obsidian-bucket-entry";
let bucketViewLabelSequence = 0;

interface HistoryEntry {
  label: string;
  data: BucketData;
}

interface DragPayload {
  bucketId: string;
  entryId: string;
}

interface SpaceIconChoice {
  id: string;
  label: string;
}

const SPACE_ICON_CHOICES: SpaceIconChoice[] = [
  { id: "layers", label: localize("图层") },
  { id: "home", label: localize("主页") },
  { id: "briefcase", label: localize("工作") },
  { id: "folder", label: localize("文件夹") },
  { id: "star", label: localize("收藏") },
  { id: "bookmark", label: localize("书签") },
  { id: "book-open", label: localize("阅读") },
  { id: "lightbulb", label: localize("灵感") },
  { id: "target", label: localize("目标") },
  { id: "rocket", label: localize("项目") },
  { id: "code-2", label: localize("代码") },
  { id: "palette", label: localize("创作") },
  { id: "heart", label: localize("生活") },
  { id: "globe-2", label: localize("领域") },
  { id: "archive", label: localize("归档") },
  { id: "user", label: localize("个人") }
];

function isBucketFile(file: TAbstractFile | null): file is TFile {
  return file instanceof TFile && ["md", "pdf"].includes(file.extension.toLowerCase());
}

function targetFromFile(file: TAbstractFile): BucketTarget | null {
  if (file instanceof TFolder && file.path) return { type: "folder", path: file.path };
  if (isBucketFile(file)) return { type: "file", path: file.path };
  return null;
}

function displayName(path: string): string {
  const parts = path.split("/");
  const name = parts[parts.length - 1] || path;
  return name.toLowerCase().endsWith(".md") ? name.slice(0, -3) : name;
}

function iconButton(
  parent: HTMLElement,
  icon: string,
  label: string,
  onClick: (event: MouseEvent) => void
): HTMLButtonElement {
  const button = createEl("button");
  button.type = "button";
  button.className = "bucket-icon-button clickable-icon";
  button.setAttribute("aria-label", label);
  button.title = label;
  setIcon(button, icon);
  button.addEventListener("click", onClick);
  parent.appendChild(button);
  return button;
}

class TextInputModal extends Modal {
  private readonly heading: string;
  private readonly initialValue: string;
  private readonly placeholder: string;
  private readonly submitLabel: string;
  private readonly onSubmitValue: (value: string) => void;

  constructor(
    app: App,
    heading: string,
    initialValue: string,
    placeholder: string,
    submitLabel: string,
    onSubmitValue: (value: string) => void
  ) {
    super(app);
    this.heading = heading;
    this.initialValue = initialValue;
    this.placeholder = placeholder;
    this.submitLabel = submitLabel;
    this.onSubmitValue = onSubmitValue;
  }

  onOpen(): void {
    this.titleEl.textContent = this.heading;
    this.contentEl.replaceChildren();

    const form = createEl("form");
    form.className = "bucket-text-form";
    const input = createEl("input");
    input.type = "text";
    input.value = this.initialValue;
    input.placeholder = this.placeholder;
    input.className = "bucket-text-input";
    input.setAttribute("aria-label", this.heading);

    const actions = createDiv();
    actions.className = "bucket-modal-actions";
    const cancel = createEl("button");
    cancel.type = "button";
    cancel.textContent = localize("取消");
    cancel.addEventListener("click", () => this.close());
    const submit = createEl("button");
    submit.type = "submit";
    submit.className = "mod-cta";
    submit.textContent = this.submitLabel;

    actions.append(cancel, submit);
    form.append(input, actions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      this.onSubmitValue(value);
      this.close();
    });
    this.contentEl.appendChild(form);

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }

  onClose(): void {
    this.contentEl.replaceChildren();
  }
}

class SpaceIconPickerModal extends Modal {
  private readonly currentIcon: string;
  private readonly onChooseIcon: (icon: string) => void;

  constructor(app: App, currentIcon: string, onChooseIcon: (icon: string) => void) {
    super(app);
    this.currentIcon = currentIcon;
    this.onChooseIcon = onChooseIcon;
  }

  onOpen(): void {
    this.modalEl.classList.add("bucket-space-icon-modal");
    this.titleEl.textContent = localize("选择 Space 图标");
    this.contentEl.replaceChildren();

    const grid = createDiv();
    grid.className = "bucket-space-icon-grid";
    grid.setAttribute("role", "listbox");
    grid.setAttribute("aria-label", localize("Space 图标"));

    let selectedButton: HTMLButtonElement | null = null;
    for (const choice of SPACE_ICON_CHOICES) {
      const button = createEl("button");
      button.type = "button";
      button.className = "bucket-space-icon-choice";
      button.setAttribute("role", "option");
      const selected = choice.id === this.currentIcon;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
      button.title = choice.label;

      const icon = createSpan();
      icon.className = "bucket-space-icon-choice-symbol";
      icon.setAttribute("aria-hidden", "true");
      setIcon(icon, choice.id);
      const label = createSpan();
      label.className = "bucket-space-icon-choice-label";
      label.textContent = choice.label;
      button.append(icon, label);
      button.addEventListener("click", () => {
        this.onChooseIcon(choice.id);
        this.close();
      });
      grid.appendChild(button);
      if (selected) selectedButton = button;
    }
    this.contentEl.appendChild(grid);
    window.setTimeout(() => (selectedButton || grid.querySelector("button"))?.focus(), 0);
  }

  onClose(): void {
    this.modalEl.classList.remove("bucket-space-icon-modal");
    this.contentEl.replaceChildren();
  }
}

class BucketPickerModal extends FuzzySuggestModal<Bucket> {
  private readonly buckets: Bucket[];
  private readonly onChooseBucket: (bucket: Bucket) => void;

  constructor(app: App, buckets: Bucket[], placeholder: string, onChooseBucket: (bucket: Bucket) => void) {
    super(app);
    this.buckets = buckets;
    this.onChooseBucket = onChooseBucket;
    this.setPlaceholder(placeholder);
  }

  getItems(): Bucket[] {
    return this.buckets;
  }

  getItemText(bucket: Bucket): string {
    return localize`${bucket.name}  ·  ${bucket.entries.length} 项`;
  }

  onChooseItem(bucket: Bucket): void {
    this.onChooseBucket(bucket);
  }
}

export default class BucketSidebarPlugin extends Plugin {
  data: BucketData = createEmptyData();
  private history: HistoryEntry[] = [];
  private creatingFolders = new Set<string>();
  private pendingSubfolders = new Set<string>();

  promptCreateFolder(folderPath: string): void {
    const parent = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(parent instanceof TFolder)) {
      new Notice(localize("这个文件夹已不存在，无法新建子文件夹。"));
      return;
    }
    // Keep the original path, object and Space even if navigation changes while naming.
    const space = this.activeSpace;
    new CreateFolderModal(this.app, folderPath, name =>
      this.createFolderInFolder(folderPath, name, parent, space)
    ).open();
  }

  async createFolderInFolder(
    folderPath: string, value: string, expectedParent: TFolder, space: Space = this.activeSpace
  ): Promise<string | null> {
    const invalidName = validateFolderName(value);
    if (invalidName) return invalidName;
    if (this.app.vault.getAbstractFileByPath(folderPath) !== expectedParent || !(expectedParent instanceof TFolder)) {
      return localize("原文件夹已被移动或删除，请关闭此窗口后重新选择位置。");
    }
    const path = `${folderPath ? folderPath + "/" : ""}${value.trim()}`;
    if (this.pendingSubfolders.has(path)) return localize("这个文件夹正在创建，请稍候。");
    if (this.app.vault.getAbstractFileByPath(path)) return localize("此位置已存在同名文件或文件夹，请换一个名称。");
    this.pendingSubfolders.add(path);
    let created = false;
    try {
      await this.app.vault.createFolder(path);
      created = true;
      expandFolderAncestors(space, folderPath);
      await this.persist();
      return null;
    } catch (error) {
      console.error("Bucket Sidebar: create folder", error);
      if (created) {
        new Notice(localize`文件夹已创建：${path}，但未能刷新侧栏。`);
        return null;
      }
      return this.app.vault.getAbstractFileByPath(path)
        ? localize("此位置已存在同名文件或文件夹，请换一个名称。")
        : localize("新建文件夹失败，请检查同步状态或文件夹写入权限后重试。");
    } finally { this.pendingSubfolders.delete(path); }
  }

  async createNoteInFolder(folderPath: string): Promise<TFile | null> {
    if (this.creatingFolders.has(folderPath)) return null;
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      new Notice(localize("这个文件夹已不存在，无法新建笔记。"));
      return null;
    }
    const space = this.activeSpace;
    let created: TFile | null = null;
    this.creatingFolders.add(folderPath);
    try {
      for (let index = 0; index < 10000; index++) {
        if (this.app.vault.getAbstractFileByPath(folderPath) !== folder) throw new Error("Folder changed");
        const path = localize`${folderPath}/未命名${index ? ` ${index}` : ""}.md`;
        if (this.app.vault.getAbstractFileByPath(path)) continue;
        try { created = await this.app.vault.create(path, ""); break; }
        catch (error) {
          // A concurrent creator can occupy the candidate after preflight.
          // Retry only that collision; permission/storage errors fail closed.
          if (!this.app.vault.getAbstractFileByPath(path)) throw error;
        }
      }
      if (!created) throw new Error("No available note name");
      expandFolderAncestors(space, folderPath);
      await this.persist();
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(created);
      // Native inline title gives the new note the same naming interaction.
      const title = leaf.view.containerEl.querySelector<HTMLElement>(".inline-title");
      if (title?.isContentEditable) {
        title.focus();
        const range = title.ownerDocument.createRange(); range.selectNodeContents(title);
        const selection = title.ownerDocument.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
      }
      return created;
    } catch (error) {
      console.error("Bucket Sidebar: create note", error);
      new Notice(created ? localize`笔记已创建：${created.path}，但未能自动打开。` : localize("新建笔记失败，原有文件没有被改动。"));
      return created;
    } finally { this.creatingFolders.delete(folderPath); }
  }

  get activeSpace(): Space {
    return getActiveSpace(this.data);
  }

  async onload(): Promise<void> {
    this.data = normalizeData(await this.loadData());
    this.addSettingTab(new BucketSidebarSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_BUCKET_SIDEBAR, (leaf) => new BucketSidebarView(leaf, this));
    this.addRibbonIcon("layers", localize("打开 Bucket Sidebar"), () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-bucket-sidebar",
      name: localize("打开 Bucket Sidebar"),
      callback: () => {
        void this.activateView();
      }
    });

    this.addCommand({
      id: "create-bucket",
      name: localize("新建 Bucket"),
      callback: () => this.promptCreateBucket()
    });

    this.addCommand({
      id: "create-space",
      name: localize("新建 Project / Area"),
      callback: () => this.promptCreateSpace()
    });

    this.addCommand({
      id: "add-active-file-to-bucket",
      name: localize("把当前笔记加入 Bucket"),
      checkCallback: (checking) => {
        const active = this.app.workspace.getActiveFile();
        if (!active) return false;
        if (!checking) this.chooseBucketForTarget({ type: "file", path: active.path });
        return true;
      }
    });

    this.addCommand({
      id: "toggle-pin-active-file",
      name: localize("切换当前笔记的置顶状态"),
      checkCallback: (checking) => {
        const active = this.app.workspace.getActiveFile();
        if (!active) return false;
        if (!checking) this.togglePinned({ type: "file", path: active.path });
        return true;
      }
    });

    this.addCommand({
      id: "undo-bucket-change",
      name: localize("撤销上一次 Bucket 变更"),
      checkCallback: (checking) => {
        if (this.history.length === 0) return false;
        if (!checking) this.undo();
        return true;
      }
    });

    this.addCommand({
      id: "sort-active-folder",
      name: localize("设置当前笔记所在文件夹的 Bucket 排序"),
      checkCallback: checking => {
        const folder = this.app.workspace.getActiveFile()?.parent;
        if (!folder?.path) return false;
        if (!checking) this.promptFolderSort(folder.path);
        return true;
      }
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        const target = targetFromFile(file);
        if (!target) return;
        this.addFolderSortMenu(menu, file);
        menu.addItem((item) => {
          const pinned = this.isPinned(target);
          item
            .setTitle(pinned ? localize("从 Bucket Sidebar 取消置顶") : localize("置顶到 Bucket Sidebar"))
            .setIcon(pinned ? "pin-off" : "pin")
            .onClick(() => this.togglePinned(target));
        });
        menu.addItem((item) => {
          item
            .setTitle(localize("添加到 Bucket…"))
            .setIcon("layers")
            .onClick(() => this.chooseBucketForTarget(target));
        });
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        const renamedType = file instanceof TFolder ? "folder" : "file";
        const before = cloneData(this.data);
        const changed = updatePathsAfterRename(this.data, oldPath, file.path, renamedType);
        if (changed === 0) { this.refreshViews(); return; }
        this.pushHistory(localize("更新重命名后的引用"), before);
        void this.persist();
      })
    );

    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshViews()));
    this.registerEvent(this.app.vault.on("create", () => this.refreshViews()));
    this.registerEvent(this.app.vault.on("delete", () => this.refreshViews()));
    this.registerEvent(this.app.metadataCache.on("changed", file => {
      if (file.parent && getFolderSortOrder(this.data.settings, file.parent.path) === "created-desc") this.refreshViews();
    }));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.refreshViews()));

    this.app.workspace.onLayoutReady(() => {
      if (this.app.workspace.getLeavesOfType(VIEW_TYPE_BUCKET_SIDEBAR).length === 0) {
        void this.activateView();
      }
    });
  }

  async activateView(): Promise<void> {
    try {
      let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(VIEW_TYPE_BUCKET_SIDEBAR)[0] || null;
      if (!leaf) {
        leaf = this.app.workspace.getLeftLeaf(false);
        if (!leaf) {
          new Notice(localize("无法创建左侧栏视图"));
          return;
        }
        await leaf.setViewState({ type: VIEW_TYPE_BUCKET_SIDEBAR, active: true });
      }
      await this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      console.error("Bucket Sidebar: failed to open view", error);
      new Notice(localize("无法创建左侧栏视图"));
    }
  }

  promptCreateBucket(): void {
    new TextInputModal(
      this.app,
      localize("新建 Bucket"),
      "",
      localize("例如：本周关注"),
      localize("创建"),
      (name) => {
        this.mutate(localize("新建 Bucket"), () => {
          addBucket(this.data, name);
          return true;
        });
      }
    ).open();
  }

  promptCreateSpace(): void {
    new TextInputModal(
      this.app,
      localize("新建 Project / Area"),
      "",
      localize("例如：工作、个人或 Project Atlas"),
      localize("创建"),
      (name) => {
        const changed = this.mutate(localize("新建 Project / Area"), () => addSpace(this.data, name) !== null);
        if (!changed) new Notice(localize("Project / Area 名称不能为空，也不能与现有名称重复"));
      }
    ).open();
  }

  promptRenameSpace(space: Space): void {
    new TextInputModal(
      this.app,
      localize("重命名 Space"),
      space.name,
      localize("Space 名称"),
      localize("保存"),
      (name) => {
        const changed = this.mutate(localize("重命名 Space"), () => renameSpace(this.data, space.id, name));
        if (!changed && name !== space.name) new Notice(localize("Space 名称不能为空，也不能与现有名称重复"));
      }
    ).open();
  }

  promptChangeSpaceIcon(space: Space): void {
    new SpaceIconPickerModal(this.app, space.icon, (icon) => {
      this.mutate(localize("更换 Space 图标"), () => setSpaceIcon(this.data, space.id, icon));
    }).open();
  }

  activateSpace(spaceId: string): void {
    if (!setActiveSpace(this.data, spaceId)) return;
    void this.persist();
  }

  removeSpace(spaceId: string): void {
    const changed = this.mutate(localize("移除 Space"), () => removeSpace(this.data, spaceId));
    if (changed) new Notice(localize("已移除 Space；真实文件没有改变，可撤销"));
    else new Notice(localize("至少需要保留一个 Space"));
  }

  promptRenameBucket(bucket: Bucket): void {
    new TextInputModal(
      this.app,
      localize("重命名 Bucket"),
      bucket.name,
      localize("Bucket 名称"),
      localize("保存"),
      (name) => {
        this.mutate(localize("重命名 Bucket"), () => renameBucket(this.data, bucket.id, name));
      }
    ).open();
  }

  promptAddTarget(bucketId: string): void {
    const bucket = findBucket(this.data, bucketId);
    if (!bucket) return;
    new BatchTargetPickerModal(this.app, bucket, (targets, selectedItemCount) => {
      this.addTargets(bucketId, targets, selectedItemCount);
    }).open();
  }

  chooseBucketForTarget(target: BucketTarget): void {
    const buckets = this.activeSpace.buckets;
    if (buckets.length === 0) {
      new Notice(localize("请先新建一个 Bucket"));
      this.promptCreateBucket();
      return;
    }
    new BucketPickerModal(this.app, buckets, localize("选择目标 Bucket…"), (bucket) => {
      this.addTarget(bucket.id, target);
    }).open();
  }

  addTarget(bucketId: string, target: BucketTarget, index?: number): void {
    const changed = this.mutate(localize("添加引用"), () =>
      addEntryToBucket(this.data, bucketId, target, index) !== null
    );
    if (!changed) new Notice(localize("这个引用已在该 Bucket 中"));
  }

  addTargets(bucketId: string, targets: BucketTarget[], selectedItemCount: number): void {
    let added = 0;
    const changed = this.mutate(localize("批量添加引用"), () => {
      for (const target of targets) {
        if (addEntryToBucket(this.data, bucketId, target) !== null) added += 1;
      }
      return added > 0;
    });
    if (changed) new Notice(localize`已加入 ${selectedItemCount} 项`);
    else new Notice(localize("所选内容已经在这个 Bucket 中"));
  }

  copyEntry(sourceBucketId: string, entryId: string, targetBucketId: string, targetIndex?: number): void {
    const changed = this.mutate(localize("复制引用到另一个 Bucket"), () =>
      copyEntryBetweenBuckets(this.data, sourceBucketId, entryId, targetBucketId, targetIndex) !== null
    );
    if (!changed) new Notice(localize("目标 Bucket 已经包含这个引用"));
  }

  reorder(bucketId: string, entryId: string, targetIndex: number): void {
    this.mutate(localize("调整 Bucket 顺序"), () => reorderEntry(this.data, bucketId, entryId, targetIndex));
  }

  removeEntry(bucketId: string, entryId: string): void {
    const changed = this.mutate(localize("移除引用"), () => removeEntryFromBucket(this.data, bucketId, entryId));
    if (changed) new Notice(localize("已移除引用；真实文件没有改变"));
  }

  isPinned(target: BucketTarget): boolean {
    return isTargetPinned(this.data, target.type, target.path);
  }

  togglePinned(target: BucketTarget): void {
    if (this.isPinned(target)) this.unpinTarget(target);
    else this.pinTarget(target);
  }

  pinTarget(target: BucketTarget): void {
    const changed = this.mutate(localize("置顶引用"), () => addPinnedEntry(this.data, target) !== null);
    if (changed) new Notice(localize("已置顶；真实文件没有移动"));
    else new Notice(localize("这个项目已经置顶"));
  }

  unpinTarget(target: BucketTarget): void {
    const changed = this.mutate(localize("取消置顶"), () => removePinnedEntry(this.data, target.type, target.path));
    if (changed) new Notice(localize("已取消置顶；真实文件没有改变"));
  }

  removeBucket(bucketId: string): void {
    const changed = this.mutate(localize("移除 Bucket"), () => removeBucket(this.data, bucketId));
    if (changed) new Notice(localize("已移除虚拟 Bucket；真实文件没有改变，可撤销"));
  }

  setUiState(operation: () => boolean): void {
    if (!operation()) return;
    void this.persist();
  }

  undo(): void {
    const previous = this.history.pop();
    if (!previous) {
      new Notice(localize("没有可撤销的 Bucket 变更"));
      return;
    }
    const currentSettings = this.data.settings;
    this.data = previous.data;
    const previousSortOrders = this.data.settings.folderSortOrders;
    this.data.settings = { ...currentSettings };
    if (previousSortOrders) this.data.settings.folderSortOrders = previousSortOrders;
    else delete this.data.settings.folderSortOrders;
    void this.persist();
    new Notice(localize`已撤销：${previous.label}`);
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  async setSidebarRowHeight(value: number): Promise<void> {
    const rowHeight = normalizeRowHeight(value);
    if (this.data.settings.rowHeight === rowHeight) return;
    this.data.settings.rowHeight = rowHeight;
    await this.persist();
  }

  async setShowSpaceNames(value: boolean): Promise<void> {
    if (this.data.settings.showSpaceNames === value) return;
    this.data.settings.showSpaceNames = value;
    await this.persist();
  }

  addFolderSortMenu(menu: Menu, file: TAbstractFile | null): void {
    if (!(file instanceof TFolder) || !file.path) return;
    menu.addItem(item => item.setTitle(localize("Bucket 文件夹排序…")).setIcon("arrow-down-wide-narrow")
      .onClick(() => this.promptFolderSort(file.path)));
  }

  promptFolderSort(path: string): void {
    if (!(this.app.vault.getAbstractFileByPath(path) instanceof TFolder)) return;
    const modal = new Modal(this.app);
    modal.titleEl.textContent = localize("Bucket 文件夹排序");
    const resolved = getFolderSortOrder(this.data.settings, path);
    new Setting(modal.contentEl).setName(path)
      .setDesc(localize("仅影响此文件夹及未单独设置的子文件夹。文件夹仍在前；日期优先读取 created 属性，缺失时使用文件创建时间，不使用修改时间。"))
      .addDropdown(dropdown => dropdown
        .addOption("inherit", localize("跟随上级（默认按名称）"))
        .addOption("name-asc", localize("名称：A → Z"))
        .addOption("created-desc", localize("创建时间：新 → 旧"))
        .setValue(this.data.settings.folderSortOrders?.[path] || "inherit")
        .onChange(value => {
          if (!(this.app.vault.getAbstractFileByPath(path) instanceof TFolder)) {
            new Notice(localize("文件夹已移动或删除，请重新选择。")); modal.close(); return;
          }
          this.changeFolderSort(path, value as FolderSortOrder | "inherit");
          modal.close();
        }));
    const description = createEl("p");
    description.textContent = localize`当前生效：${resolved === "created-desc" ? localize("创建时间，新到旧") : localize("名称，A 到 Z")}。可通过 Bucket 撤销命令恢复。`;
    modal.contentEl.appendChild(description);
    modal.open();
  }

  changeFolderSort(path: string, order: FolderSortOrder | "inherit"): void {
    this.mutate(localize("调整文件夹排序"), () => setFolderSortOrder(this.data.settings, path, order));
  }

  private mutate(label: string, operation: () => boolean): boolean {
    const before = cloneData(this.data);
    if (!operation()) return false;
    this.pushHistory(label, before);
    void this.persist();
    return true;
  }

  private pushHistory(label: string, data: BucketData): void {
    this.history.push({ label, data });
    if (this.history.length > 30) this.history.shift();
  }

  private async persist(): Promise<void> {
    try {
      await this.saveData(this.data);
      this.refreshViews();
    } catch (error) {
      console.error("Bucket Sidebar: failed to save data", error);
      new Notice(localize("Bucket Sidebar 保存失败，请查看开发者控制台"));
    }
  }

  private refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_BUCKET_SIDEBAR)) {
      if (leaf.view instanceof BucketSidebarView) leaf.view.render();
    }
  }
}

class BucketSidebarSettingTab extends PluginSettingTab {
  private readonly bucketPlugin: BucketSidebarPlugin;

  constructor(app: App, plugin: BucketSidebarPlugin) {
    super(app, plugin);
    this.bucketPlugin = plugin;
  }

  display(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName(localize("外观"))
      .setHeading();

    new Setting(this.containerEl)
      .setName(localize("显示 Space 名称"))
      .setDesc(localize("默认只显示图标。Space 数量较少时，可同时显示图标和名称。"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.bucketPlugin.data.settings.showSpaceNames)
          .onChange((value) => {
            void this.bucketPlugin.setShowSpaceNames(value);
          });
      });

    const rowHeightSetting = new Setting(this.containerEl)
      .setName(localize("侧栏行高"))
      .setDesc(localize`调整 Bucket、文件夹和笔记的每行高度。范围 ${MIN_ROW_HEIGHT}–${MAX_ROW_HEIGHT}px，默认 ${DEFAULT_ROW_HEIGHT}px。`);

    rowHeightSetting.addSlider((slider) => {
      slider
        .setLimits(MIN_ROW_HEIGHT, MAX_ROW_HEIGHT, 1)
        .setValue(this.bucketPlugin.data.settings.rowHeight)
        .setDynamicTooltip()
        .onChange((value) => {
          void this.bucketPlugin.setSidebarRowHeight(value);
        });
    });

    rowHeightSetting.addExtraButton((button) => {
      button
        .setIcon("reset")
        .setTooltip(localize("恢复默认行高"))
        .onClick(() => {
          void this.bucketPlugin.setSidebarRowHeight(DEFAULT_ROW_HEIGHT).then(() => this.display());
        });
    });
  }
}

class BucketSidebarView extends ItemView {
  private readonly plugin: BucketSidebarPlugin;
  private rootEl: HTMLElement | null = null;
  private readonly addCurrentAction: HTMLElement;
  private readonly undoAction: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: BucketSidebarPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.addAction("layout-grid", localize("新建 Project / Area"), () => this.plugin.promptCreateSpace());
    this.addAction("plus", localize("新建 Bucket"), () => this.plugin.promptCreateBucket());
    this.addCurrentAction = this.addAction("file-plus", localize("把当前笔记加入 Bucket"), () => {
      const current = this.app.workspace.getActiveFile();
      if (!current) {
        new Notice(localize("当前没有打开文件"));
        return;
      }
      this.plugin.chooseBucketForTarget({ type: "file", path: current.path });
    });
    this.undoAction = this.addAction("undo", localize("撤销上一次 Bucket 变更"), () => {
      if (this.plugin.canUndo()) this.plugin.undo();
    });
  }

  getViewType(): string {
    return VIEW_TYPE_BUCKET_SIDEBAR;
  }

  getDisplayText(): string {
    return "Bucket";
  }

  getIcon(): string {
    return "layers";
  }

  async onOpen(): Promise<void> {
    this.rootEl = createDiv();
    this.rootEl.className = "bucket-sidebar-root";
    this.contentEl.replaceChildren(this.rootEl);
    this.render();
  }

  async onClose(): Promise<void> {
    this.rootEl = null;
    this.contentEl.replaceChildren();
  }

  render(): void {
    if (!this.rootEl) return;
    this.rootEl.replaceChildren();
    this.rootEl.style.setProperty("--bucket-row-height", `${this.plugin.data.settings.rowHeight}px`);
    this.syncNativeActions();
    this.rootEl.appendChild(this.renderSpaceSwitcher());

    const activeSpace = this.plugin.activeSpace;

    const list = createDiv();
    list.className = "bucket-list";
    list.setAttribute("role", "tree");
    const treeLabel = createSpan();
    treeLabel.className = "bucket-accessible-label";
    treeLabel.id = `bucket-tree-label-${++bucketViewLabelSequence}`;
    treeLabel.textContent = localize("虚拟 Bucket 列表");
    list.setAttribute("aria-labelledby", treeLabel.id);
    list.appendChild(treeLabel);

    const hasPinnedEntries = activeSpace.pinnedEntries.length > 0;
    if (hasPinnedEntries) {
      list.appendChild(this.renderPinnedSection());
      if (activeSpace.buckets.length > 0) {
        const groupsHeading = this.renderSectionHeading(localize("分组"));
        groupsHeading.classList.add("bucket-groups-heading");
        list.appendChild(groupsHeading);
      }
    }

    if (activeSpace.buckets.length === 0) {
      list.appendChild(this.renderEmptyState());
    } else {
      for (const bucket of activeSpace.buckets) list.appendChild(this.renderBucket(bucket));
    }
    this.rootEl.appendChild(list);
  }

  private renderSpaceSwitcher(): HTMLElement {
    const wrapper = createDiv();
    wrapper.className = "bucket-space-switcher-wrap";

    const switcher = createDiv();
    switcher.className = "bucket-space-switcher";

    const tabs = createDiv();
    tabs.className = "bucket-space-tabs";
    tabs.setAttribute("role", "radiogroup");
    tabs.setAttribute("aria-label", localize("Project / Area 切换器"));

    const spaces = this.plugin.data.spaces;
    const activeSpaceId = this.plugin.data.activeSpaceId;
    for (let index = 0; index < spaces.length; index += 1) {
      const space = spaces[index];
      const active = space.id === activeSpaceId;
      const button = createEl("button");
      button.type = "button";
      button.className = "bucket-space-tab";
      button.classList.toggle("is-active", active);
      button.dataset.spaceId = space.id;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(active));
      button.setAttribute("aria-label", space.name);
      button.tabIndex = active ? 0 : -1;
      button.title = space.name;

      const icon = createSpan();
      icon.className = "bucket-space-tab-icon";
      icon.setAttribute("aria-hidden", "true");
      setIcon(icon, space.icon || DEFAULT_SPACE_ICON);
      button.appendChild(icon);

      if (this.plugin.data.settings.showSpaceNames) {
        const label = createSpan();
        label.className = "bucket-space-tab-label";
        label.textContent = space.name;
        button.appendChild(label);
      }

      button.addEventListener("click", () => this.plugin.activateSpace(space.id));
      button.addEventListener("contextmenu", (event) => this.showSpaceMenu(event, space));
      button.addEventListener("keydown", (event) => {
        let targetIndex = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          targetIndex = (index + 1) % spaces.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          targetIndex = (index - 1 + spaces.length) % spaces.length;
        } else if (event.key === "Home") {
          targetIndex = 0;
        } else if (event.key === "End") {
          targetIndex = spaces.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        const target = spaces[targetIndex];
        this.plugin.activateSpace(target.id);
        window.setTimeout(() => this.focusSpaceTab(target.id), 0);
      });
      tabs.appendChild(button);
    }

    const addButton = createEl("button");
    addButton.type = "button";
    addButton.className = "bucket-space-add";
    addButton.setAttribute("aria-label", localize("新建 Project / Area"));
    addButton.title = localize("新建 Project / Area");
    const addIcon = createSpan();
    addIcon.setAttribute("aria-hidden", "true");
    setIcon(addIcon, "plus");
    addButton.appendChild(addIcon);
    addButton.addEventListener("click", () => this.plugin.promptCreateSpace());

    switcher.appendChild(tabs);
    switcher.appendChild(addButton);
    wrapper.appendChild(switcher);
    return wrapper;
  }

  private focusSpaceTab(spaceId: string): void {
    const buttons = this.rootEl?.querySelectorAll<HTMLButtonElement>(".bucket-space-tab");
    if (!buttons) return;
    for (const button of Array.from(buttons)) {
      if (button.dataset.spaceId === spaceId) {
        button.focus();
        return;
      }
    }
  }

  private renderPinnedSection(): HTMLElement {
    const section = createEl("section");
    section.className = "bucket-pinned-section";
    section.setAttribute("role", "group");
    section.setAttribute("aria-label", localize("置顶"));

    section.appendChild(this.renderSectionHeading(localize("置顶")));

    const entries = createDiv();
    entries.className = "bucket-pinned-entries";
    entries.setAttribute("role", "group");
    for (const entry of this.plugin.activeSpace.pinnedEntries) {
      entries.appendChild(this.renderPinnedEntry(entry));
    }
    section.appendChild(entries);
    return section;
  }

  private renderSectionHeading(label: string): HTMLElement {
    const heading = createDiv();
    heading.className = "bucket-section-heading";
    heading.textContent = label;
    heading.setAttribute("role", "heading");
    heading.setAttribute("aria-level", "2");
    return heading;
  }

  private renderPinnedEntry(entry: BucketEntry): HTMLElement {
    const wrapper = createDiv();
    wrapper.className = "bucket-entry-wrapper bucket-pinned-entry";
    wrapper.dataset.entryId = entry.id;
    const target = this.app.vault.getAbstractFileByPath(entry.path);
    const validFolder = entry.type === "folder" && target instanceof TFolder ? target : null;
    const validFile = entry.type === "file" && isBucketFile(target) ? target : null;
    const missing = validFolder === null && validFile === null;

    const row = createDiv();
    row.className = "bucket-entry-row";
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-level", "1");
    row.dataset.bucketPath = entry.path;
    row.dataset.bucketKind = entry.type;
    if (missing) row.classList.add("is-missing");
    if (validFile && this.app.workspace.getActiveFile()?.path === validFile.path) {
      row.classList.add("is-active");
      row.setAttribute("aria-current", "page");
    }
    row.addEventListener("contextmenu", (event) => this.showPinnedMenu(event, entry));

    if (entry.type === "folder") {
      const disclosure = iconButton(
        row,
        entry.expanded ? "chevron-down" : "chevron-right",
        entry.expanded ? localize`收起 ${entry.path}` : localize`展开 ${entry.path}`,
        (event) => {
          event.stopPropagation();
          if (!validFolder) return;
          this.plugin.setUiState(() => {
            entry.expanded = !entry.expanded;
            return true;
          });
        }
      );
      disclosure.classList.add("bucket-disclosure");
      disclosure.disabled = validFolder === null;
      disclosure.setAttribute("aria-expanded", String(entry.expanded === true));
    } else {
      const spacer = createSpan();
      spacer.className = "bucket-disclosure-spacer";
      row.appendChild(spacer);
    }

    const leading = createSpan();
    leading.className = "bucket-entry-icon";
    leading.setAttribute("aria-hidden", "true");
    setIcon(leading, entry.type === "folder" ? "folder" : "file-text");
    row.appendChild(leading);

    const label = createEl("button");
    label.type = "button";
    label.className = "bucket-entry-label";
    label.textContent = entry.label || displayName(entry.path);
    label.title = missing ? localize`${entry.path}（目标当前不存在）` : entry.path;
    label.addEventListener("click", () => {
      if (validFile) {
        void this.app.workspace.getLeaf(false).openFile(validFile);
      } else if (validFolder) {
        this.plugin.setUiState(() => {
          entry.expanded = !entry.expanded;
          return true;
        });
      } else {
        new Notice(localize`找不到目标：${entry.path}`);
      }
    });
    row.appendChild(label);

    if (missing) {
      const status = createSpan();
      status.className = "bucket-missing-label";
      status.textContent = localize("缺失");
      row.appendChild(status);
    }

    const actions = createDiv();
    actions.className = "bucket-row-actions";
    if (validFolder) this.addCreationAction(actions, validFolder.path);
    iconButton(actions, "more-horizontal", localize`${label.textContent || entry.path} 的更多操作`, (event) => {
      event.stopPropagation();
      this.showPinnedMenu(event, entry);
    });
    row.appendChild(actions);
    wrapper.appendChild(row);

    if (validFolder && entry.expanded) {
      const children = createDiv();
      children.className = "bucket-folder-children";
      children.setAttribute("role", "group");
      this.renderFolderChildren(children, entry, validFolder, 1, 1);
      wrapper.appendChild(children);
    }
    return wrapper;
  }

  private syncNativeActions(): void {
    this.setNativeActionEnabled(this.addCurrentAction, this.app.workspace.getActiveFile() !== null);
    this.setNativeActionEnabled(this.undoAction, this.plugin.canUndo());
  }

  private setNativeActionEnabled(action: HTMLElement, enabled: boolean): void {
    action.classList.toggle("is-disabled", !enabled);
    action.setAttribute("aria-disabled", String(!enabled));
  }

  private renderEmptyState(): HTMLElement {
    const empty = createDiv();
    empty.className = "bucket-empty-state";
    const heading = createDiv();
    heading.className = "bucket-empty-heading";
    heading.textContent = localize("还没有 Bucket");
    const description = createDiv();
    description.className = "bucket-empty-description";
    description.textContent = localize("Bucket 只保存引用，不会移动或删除真实文件。");
    const create = createEl("button");
    create.type = "button";
    create.className = "mod-cta";
    create.textContent = localize("新建 Bucket");
    create.addEventListener("click", () => this.plugin.promptCreateBucket());
    empty.append(heading, description, create);
    return empty;
  }

  private renderBucket(bucket: Bucket): HTMLElement {
    const section = createEl("section");
    section.className = "bucket-section";
    section.dataset.bucketId = bucket.id;
    section.setAttribute("role", "treeitem");
    section.setAttribute("aria-expanded", String(!bucket.collapsed));

    const header = createDiv();
    header.className = "bucket-header";
    const disclosure = iconButton(
      header,
      bucket.collapsed ? "chevron-right" : "chevron-down",
      bucket.collapsed ? localize`展开 ${bucket.name}` : localize`收起 ${bucket.name}`,
      () => {
        this.plugin.setUiState(() => {
          bucket.collapsed = !bucket.collapsed;
          return true;
        });
      }
    );
    disclosure.classList.add("bucket-disclosure");
    disclosure.setAttribute("aria-expanded", String(!bucket.collapsed));

    const bucketIcon = createSpan();
    bucketIcon.className = "bucket-leading-icon";
    bucketIcon.setAttribute("aria-hidden", "true");
    setIcon(bucketIcon, "layers");
    header.appendChild(bucketIcon);

    const name = createEl("button");
    name.type = "button";
    name.className = "bucket-name";
    name.textContent = bucket.name;
    name.title = bucket.name;
    name.addEventListener("click", () => disclosure.click());
    header.appendChild(name);

    const count = createSpan();
    count.className = "bucket-count";
    count.textContent = String(bucket.entries.length);
    count.setAttribute("aria-label", localize`${bucket.entries.length} 个引用`);
    header.appendChild(count);

    const actions = createDiv();
    actions.className = "bucket-row-actions";
    iconButton(actions, "plus", localize`向 ${bucket.name} 添加内容`, (event) => {
      event.stopPropagation();
      this.plugin.promptAddTarget(bucket.id);
    });
    iconButton(actions, "more-horizontal", localize`${bucket.name} 的更多操作`, (event) => {
      event.stopPropagation();
      this.showBucketMenu(event, bucket);
    });
    header.appendChild(actions);
    header.addEventListener("contextmenu", (event) => this.showBucketMenu(event, bucket));
    header.addEventListener("dragover", (event) => this.prepareDrop(event, bucket.id));
    header.addEventListener("drop", (event) => {
      event.stopPropagation();
      this.handleDrop(event, bucket.id, bucket.entries.length);
    });
    section.appendChild(header);

    const entries = createDiv();
    entries.className = "bucket-entries";
    entries.setAttribute("role", "group");
    entries.hidden = bucket.collapsed === true;
    entries.addEventListener("dragover", (event) => this.prepareDrop(event, bucket.id));
    entries.addEventListener("drop", (event) => this.handleDrop(event, bucket.id, bucket.entries.length));

    if (bucket.entries.length === 0) {
      const empty = createEl("button");
      empty.type = "button";
      empty.className = "bucket-entry-empty";
      empty.textContent = localize("添加笔记或文件夹…");
      empty.addEventListener("click", () => this.plugin.promptAddTarget(bucket.id));
      entries.appendChild(empty);
    } else {
      bucket.entries.forEach((entry, index) => {
        entries.appendChild(this.renderEntry(bucket, entry, index));
      });
    }
    section.appendChild(entries);

    section.addEventListener("dragenter", () => section.classList.add("is-drop-target"));
    section.addEventListener("dragleave", (event) => {
      const related = event.relatedTarget;
      if (!(related instanceof Node) || !section.contains(related)) section.classList.remove("is-drop-target");
    });
    section.addEventListener("drop", () => section.classList.remove("is-drop-target"));
    return section;
  }

  private renderEntry(bucket: Bucket, entry: BucketEntry, index: number): HTMLElement {
    const wrapper = createDiv();
    wrapper.className = "bucket-entry-wrapper";
    wrapper.dataset.entryId = entry.id;
    const target = this.app.vault.getAbstractFileByPath(entry.path);
    const validFolder = entry.type === "folder" && target instanceof TFolder ? target : null;
    const validFile = entry.type === "file" && isBucketFile(target) ? target : null;
    const missing = validFolder === null && validFile === null;

    const row = createDiv();
    row.className = "bucket-entry-row";
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-level", "2");
    row.dataset.bucketPath = entry.path;
    row.dataset.bucketKind = entry.type;
    row.draggable = true;
    if (missing) row.classList.add("is-missing");
    if (validFile && this.app.workspace.getActiveFile()?.path === validFile.path) {
      row.classList.add("is-active");
      row.setAttribute("aria-current", "page");
    }

    row.addEventListener("dragstart", (event) => {
      if (!event.dataTransfer) return;
      const payload: DragPayload = { bucketId: bucket.id, entryId: entry.id };
      event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
      event.dataTransfer.setData("text/plain", entry.path);
      event.dataTransfer.effectAllowed = "copyMove";
      row.classList.add("is-dragging");
    });
    row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
    row.addEventListener("dragover", (event) => this.prepareDrop(event, bucket.id));
    row.addEventListener("drop", (event) => {
      event.stopPropagation();
      this.handleDrop(event, bucket.id, index);
    });
    row.addEventListener("contextmenu", (event) => this.showEntryMenu(event, bucket, entry));

    if (entry.type === "folder") {
      const disclosure = iconButton(
        row,
        entry.expanded ? "chevron-down" : "chevron-right",
        entry.expanded ? localize`收起 ${entry.path}` : localize`展开 ${entry.path}`,
        (event) => {
          event.stopPropagation();
          if (!validFolder) return;
          this.plugin.setUiState(() => {
            entry.expanded = !entry.expanded;
            return true;
          });
        }
      );
      disclosure.classList.add("bucket-disclosure");
      disclosure.disabled = validFolder === null;
      disclosure.setAttribute("aria-expanded", String(entry.expanded === true));
    } else {
      const spacer = createSpan();
      spacer.className = "bucket-disclosure-spacer";
      row.appendChild(spacer);
    }

    const leading = createSpan();
    leading.className = "bucket-entry-icon";
    leading.setAttribute("aria-hidden", "true");
    setIcon(leading, entry.type === "folder" ? "folder" : "file-text");
    row.appendChild(leading);

    const label = createEl("button");
    label.type = "button";
    label.className = "bucket-entry-label";
    label.textContent = entry.label || displayName(entry.path);
    label.title = missing ? localize`${entry.path}（目标当前不存在）` : entry.path;
    label.addEventListener("click", () => {
      if (validFile) {
        void this.app.workspace.getLeaf(false).openFile(validFile);
      } else if (validFolder) {
        this.plugin.setUiState(() => {
          entry.expanded = !entry.expanded;
          return true;
        });
      } else {
        new Notice(localize`找不到目标：${entry.path}`);
      }
    });
    row.appendChild(label);

    if (missing) {
      const status = createSpan();
      status.className = "bucket-missing-label";
      status.textContent = localize("缺失");
      row.appendChild(status);
    }

    const actions = createDiv();
    actions.className = "bucket-row-actions";
    if (validFolder) this.addCreationAction(actions, validFolder.path);
    iconButton(actions, "more-horizontal", localize`${label.textContent || entry.path} 的更多操作`, (event) => {
      event.stopPropagation();
      this.showEntryMenu(event, bucket, entry);
    });
    row.appendChild(actions);
    wrapper.appendChild(row);

    if (validFolder && entry.expanded) {
      const children = createDiv();
      children.className = "bucket-folder-children";
      children.setAttribute("role", "group");
      this.renderFolderChildren(children, entry, validFolder, 1);
      wrapper.appendChild(children);
    }
    return wrapper;
  }

  private renderFolderChildren(
    parent: HTMLElement,
    rootEntry: BucketEntry,
    folder: TFolder,
    depth: number,
    rootAriaLevel = 2
  ): void {
    const order = getFolderSortOrder(this.plugin.data.settings, folder.path);
    const children = folder.children
      .filter((child) => (child instanceof TFolder || isBucketFile(child)) && !isPathExcluded(rootEntry, child.path))
      .map(child => ({ child, key: {
        name: child.name, path: child.path, folder: child instanceof TFolder,
        ctime: child instanceof TFile ? child.stat?.ctime : undefined,
        created: order === "created-desc" && child instanceof TFile && child.extension.toLowerCase() === "md"
          ? this.app.metadataCache.getFileCache(child)?.frontmatter?.created as unknown : undefined
      }}))
      .sort((left, right) => compareFolderChildren(left.key, right.key, order))
      .map(item => item.child);

    for (const child of children) {
      const target = targetFromFile(child);
      if (!target) continue;
      const row = createDiv();
      row.className = "bucket-entry-row bucket-nested-row";
      // Stable identity for optional icon integrations; never match by label.
      row.dataset.bucketPath = child.path;
      row.dataset.bucketKind = child instanceof TFolder ? "folder" : "file";
      row.style.setProperty("--bucket-indent", `${depth * 14}px`);
      row.setAttribute("role", "treeitem");
      row.setAttribute("aria-level", String(depth + rootAriaLevel));
      row.addEventListener("contextmenu", (event) => this.showTargetMenu(event, target));
      if (isBucketFile(child) && this.app.workspace.getActiveFile()?.path === child.path) {
        row.classList.add("is-active");
        row.setAttribute("aria-current", "page");
      }

      if (child instanceof TFolder) {
        const expanded = (rootEntry.expandedPaths || []).includes(child.path);
        const disclosure = iconButton(
          row,
          expanded ? "chevron-down" : "chevron-right",
          expanded ? localize`收起 ${child.path}` : localize`展开 ${child.path}`,
          (event) => {
            event.stopPropagation();
            this.toggleNestedFolder(rootEntry, child.path);
          }
        );
        disclosure.classList.add("bucket-disclosure");
        disclosure.setAttribute("aria-expanded", String(expanded));

        const icon = createSpan();
        icon.className = "bucket-entry-icon";
        icon.setAttribute("aria-hidden", "true");
        setIcon(icon, "folder");
        row.appendChild(icon);

        const label = createEl("button");
        label.type = "button";
        label.className = "bucket-entry-label";
        label.textContent = child.name;
        label.title = child.path;
        label.addEventListener("click", () => this.toggleNestedFolder(rootEntry, child.path));
        row.appendChild(label);
        const actions = createDiv();
        actions.className = "bucket-row-actions";
        this.addCreationAction(actions, child.path);
        iconButton(actions, "more-horizontal", localize`${child.name} 的更多操作`, (event) => {
          event.stopPropagation();
          this.showTargetMenu(event, target);
        });
        row.appendChild(actions);
        parent.appendChild(row);

        if (expanded) this.renderFolderChildren(parent, rootEntry, child, depth + 1, rootAriaLevel);
      } else if (isBucketFile(child)) {
        const spacer = createSpan();
        spacer.className = "bucket-disclosure-spacer";
        row.appendChild(spacer);
        const icon = createSpan();
        icon.className = "bucket-entry-icon";
        icon.setAttribute("aria-hidden", "true");
        setIcon(icon, "file-text");
        row.appendChild(icon);
        const label = createEl("button");
        label.type = "button";
        label.className = "bucket-entry-label";
        label.textContent = displayName(child.path);
        label.title = child.path;
        label.addEventListener("click", () => {
          void this.app.workspace.getLeaf(false).openFile(child);
        });
        row.appendChild(label);
        const actions = createDiv();
        actions.className = "bucket-row-actions";
        iconButton(actions, "more-horizontal", localize`${child.basename} 的更多操作`, (event) => {
          event.stopPropagation();
          this.showTargetMenu(event, target);
        });
        row.appendChild(actions);
        parent.appendChild(row);
      }
    }
  }

  private toggleNestedFolder(entry: BucketEntry, path: string): void {
    this.plugin.setUiState(() => {
      const paths = entry.expandedPaths || [];
      const index = paths.indexOf(path);
      if (index >= 0) paths.splice(index, 1);
      else paths.push(path);
      entry.expandedPaths = paths;
      return true;
    });
  }

  private showSpaceMenu(event: MouseEvent, space: Space): void {
    event.preventDefault();
    const menu = new Menu();
    menu.addItem((item) => {
      item
        .setTitle(localize("重命名 Space…"))
        .setIcon("pencil")
        .onClick(() => this.plugin.promptRenameSpace(space));
    });
    menu.addItem((item) => {
      item
        .setTitle(localize("更换图标…"))
        .setIcon("smile")
        .onClick(() => this.plugin.promptChangeSpaceIcon(space));
    });
    if (this.plugin.data.spaces.length > 1) {
      menu.addSeparator();
      menu.addItem((item) => {
        item
          .setTitle(localize("移除 Space（不删除文件）"))
          .setIcon("trash")
          .onClick(() => this.plugin.removeSpace(space.id));
      });
    }
    menu.showAtMouseEvent(event);
  }

  private addCreationAction(actions: HTMLElement, path: string): void {
    const button = iconButton(actions, "plus", localize`在 ${path} 中新建…`, event => {
      event.stopPropagation();
      const target = this.app.vault.getAbstractFileByPath(path);
      if (!(target instanceof TFolder)) {
        new Notice(localize("这个文件夹已不存在，请重新选择位置。"));
        return;
      }
      const menu = new Menu();
      this.addFolderCreationItems(menu, target);
      const bounds = button.getBoundingClientRect();
      menu.showAtPosition({ x: bounds.left, y: bounds.bottom });
    });
    button.classList.add("bucket-create-menu");
    button.setAttribute("aria-haspopup", "menu");
  }

  private addFolderCreationItems(menu: Menu, target: TFolder): void {
    menu.addItem(item => item.setTitle(localize("在此文件夹中新建笔记")).setIcon("file-plus")
      .onClick(() => { void this.plugin.createNoteInFolder(target.path); }));
    menu.addItem(item => item.setTitle(localize("新建子文件夹…")).setIcon("folder-plus")
      .onClick(() => this.plugin.promptCreateFolder(target.path)));
  }

  private addCreationMenu(menu: Menu, target: TAbstractFile | null): void {
    if (!(target instanceof TFolder)) return;
    this.addFolderCreationItems(menu, target);
    this.plugin.addFolderSortMenu(menu, target);
    menu.addSeparator();
  }

  private showTargetMenu(event: MouseEvent, target: BucketTarget): void {
    event.preventDefault();
    const menu = new Menu();
    const file = this.app.vault.getAbstractFileByPath(target.path);
    this.addCreationMenu(menu, file);
    if (isBucketFile(file)) {
      menu.addItem((item) => {
        item.setTitle(file.extension.toLowerCase() === "md" ? localize("打开笔记") : localize("打开文件")).setIcon("file-text").onClick(() => {
          void this.app.workspace.getLeaf(false).openFile(file);
        });
      });
    }
    menu.addItem((item) => {
      const pinned = this.plugin.isPinned(target);
      item
        .setTitle(pinned ? localize("取消置顶") : localize("置顶"))
        .setIcon(pinned ? "pin-off" : "pin")
        .onClick(() => this.plugin.togglePinned(target));
    });
    menu.addItem((item) => {
      item.setTitle(localize("添加到 Bucket…")).setIcon("layers").onClick(() => {
        this.plugin.chooseBucketForTarget(target);
      });
    });
    menu.showAtMouseEvent(event);
  }

  private showPinnedMenu(event: MouseEvent, entry: BucketEntry): void {
    event.preventDefault();
    const target: BucketTarget = { type: entry.type, path: entry.path, label: entry.label };
    const menu = new Menu();
    const file = this.app.vault.getAbstractFileByPath(entry.path);
    this.addCreationMenu(menu, file);
    if (isBucketFile(file)) {
      menu.addItem((item) => {
        item.setTitle(file.extension.toLowerCase() === "md" ? localize("打开笔记") : localize("打开文件")).setIcon("file-text").onClick(() => {
          void this.app.workspace.getLeaf(false).openFile(file);
        });
      });
    }
    menu.addItem((item) => {
      item.setTitle(localize("添加到 Bucket…")).setIcon("layers").onClick(() => {
        this.plugin.chooseBucketForTarget(target);
      });
    });
    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle(localize("取消置顶"))
        .setIcon("pin-off")
        .onClick(() => this.plugin.unpinTarget(target));
    });
    menu.showAtMouseEvent(event);
  }

  private showBucketMenu(event: MouseEvent, bucket: Bucket): void {
    event.preventDefault();
    const menu = new Menu();
    menu.addItem((item) => {
      item.setTitle(localize("添加笔记或文件夹…")).setIcon("plus").onClick(() => this.plugin.promptAddTarget(bucket.id));
    });
    menu.addItem((item) => {
      item.setTitle(localize("重命名 Bucket…")).setIcon("pencil").onClick(() => this.plugin.promptRenameBucket(bucket));
    });
    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle(localize("移除虚拟 Bucket（不删除文件）"))
        .setIcon("trash")
        .onClick(() => this.plugin.removeBucket(bucket.id));
    });
    menu.showAtMouseEvent(event);
  }

  private showEntryMenu(event: MouseEvent, bucket: Bucket, entry: BucketEntry): void {
    event.preventDefault();
    const menu = new Menu();
    const entryTarget: BucketTarget = { type: entry.type, path: entry.path, label: entry.label };
    const target = this.app.vault.getAbstractFileByPath(entry.path);
    const entryIndex = bucket.entries.findIndex((candidate) => candidate.id === entry.id);
    this.addCreationMenu(menu, target);
    if (isBucketFile(target)) {
      menu.addItem((item) => {
        item.setTitle(target.extension.toLowerCase() === "md" ? localize("打开笔记") : localize("打开文件")).setIcon("file-text").onClick(() => {
          void this.app.workspace.getLeaf(false).openFile(target);
        });
      });
    }
    menu.addItem((item) => {
      const pinned = this.plugin.isPinned(entryTarget);
      item
        .setTitle(pinned ? localize("取消置顶") : localize("置顶"))
        .setIcon(pinned ? "pin-off" : "pin")
        .onClick(() => this.plugin.togglePinned(entryTarget));
    });
    menu.addItem((item) => {
      item.setTitle(localize("复制引用到另一个 Bucket…")).setIcon("copy").onClick(() => {
        const choices = this.plugin.activeSpace.buckets.filter((candidate) => candidate.id !== bucket.id);
        if (choices.length === 0) {
          new Notice(localize("还没有其他 Bucket"));
          return;
        }
        new BucketPickerModal(this.app, choices, localize("选择要复制到的 Bucket…"), (targetBucket) => {
          this.plugin.copyEntry(bucket.id, entry.id, targetBucket.id);
        }).open();
      });
    });
    menu.addItem((item) => {
      item
        .setTitle(localize("在当前 Bucket 中上移"))
        .setIcon("arrow-up")
        .setDisabled(entryIndex <= 0)
        .onClick(() => this.plugin.reorder(bucket.id, entry.id, entryIndex - 1));
    });
    menu.addItem((item) => {
      item
        .setTitle(localize("在当前 Bucket 中下移"))
        .setIcon("arrow-down")
        .setDisabled(entryIndex < 0 || entryIndex >= bucket.entries.length - 1)
        .onClick(() => this.plugin.reorder(bucket.id, entry.id, entryIndex + 2));
    });
    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle(localize("仅移除引用（保留真实文件）"))
        .setIcon("x")
        .onClick(() => this.plugin.removeEntry(bucket.id, entry.id));
    });
    menu.showAtMouseEvent(event);
  }

  private prepareDrop(event: DragEvent, targetBucketId: string): void {
    event.preventDefault();
    if (!event.dataTransfer) return;
    const payload = this.readDragPayload(event.dataTransfer);
    event.dataTransfer.dropEffect = payload && payload.bucketId === targetBucketId ? "move" : "copy";
  }

  private handleDrop(event: DragEvent, targetBucketId: string, targetIndex: number): void {
    event.preventDefault();
    if (!event.dataTransfer) return;
    const payload = this.readDragPayload(event.dataTransfer);
    if (payload) {
      if (payload.bucketId === targetBucketId) {
        this.plugin.reorder(targetBucketId, payload.entryId, targetIndex);
      } else {
        this.plugin.copyEntry(payload.bucketId, payload.entryId, targetBucketId, targetIndex);
      }
      return;
    }

    const path = event.dataTransfer.getData("text/plain").trim();
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    const target = file ? targetFromFile(file) : null;
    if (target) this.plugin.addTarget(targetBucketId, target, targetIndex);
  }

  private readDragPayload(dataTransfer: DataTransfer): DragPayload | null {
    const raw = dataTransfer.getData(DRAG_MIME);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as Partial<DragPayload>;
      if (typeof value.bucketId !== "string" || typeof value.entryId !== "string") return null;
      if (!findBucket(this.plugin.data, value.bucketId)) return null;
      return { bucketId: value.bucketId, entryId: value.entryId };
    } catch {
      return null;
    }
  }
}
