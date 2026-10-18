import { readFile } from "node:fs/promises";

const css = await readFile("styles.css", "utf8");
const mainSource = await readFile("src/main.ts", "utf8");
const settingsSource = await readFile("src/settings.ts", "utf8");
const modelSource = await readFile("src/model.ts", "utf8");
const pickerSource = await readFile("src/target-picker.ts", "utf8");
const failures = [];

function findBlock(selectorPattern, label) {
  const match = css.match(new RegExp(`${selectorPattern}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) {
    failures.push(`找不到 ${label} 的 CSS 规则`);
    return "";
  }
  return match[1];
}

const accessibleLabel = findBlock("\\.bucket-accessible-label", "读屏标签");
for (const declaration of ["position: absolute", "width: 0", "height: 0", "overflow: hidden"]) {
  if (!accessibleLabel.includes(declaration)) failures.push(`读屏标签缺少隐藏声明：${declaration}`);
}
if (/clip-path\s*:|display\s*:\s*none|visibility\s*:\s*hidden/.test(accessibleLabel)) {
  failures.push("读屏标签应使用旧环境兼容的隐藏方式，且保留可访问名称");
}
if (!mainSource.includes('list.setAttribute("aria-labelledby", treeLabel.id)')) {
  failures.push("文件树必须保留其读屏标签关联");
}

const labelBlock = findBlock(
  "\\.bucket-sidebar-root button\\.bucket-name,\\s*\\.bucket-sidebar-root button\\.bucket-entry-label",
  "名称按钮"
);

for (const declaration of [
  "display: block",
  "background-color: transparent",
  "box-shadow: none",
  "text-align: left"
]) {
  if (!labelBlock.includes(declaration)) failures.push(`名称按钮缺少主题隔离声明：${declaration}`);
}

const emptyStateBlock = findBlock("\\.bucket-empty-state", "空状态");
if (!emptyStateBlock.includes("background: transparent")) {
  failures.push("空状态不应使用装饰性卡片底色");
}
if (!emptyStateBlock.includes("border: 0")) {
  failures.push("空状态不应使用装饰性卡片边框");
}

const activeBlock = findBlock("\\.bucket-entry-row\\.is-active", "活动行");
if (!activeBlock.includes("--nav-item-background-active")) {
  failures.push("活动行应使用 Obsidian 的语义选中态变量");
}

if (css.includes(".bucket-toolbar-title") || mainSource.includes('title.textContent = "Buckets"')) {
  failures.push("不应在侧栏内容区重复显示 BUCKETS 标题");
}
if (!mainSource.includes('this.addAction("plus"')) {
  failures.push("高频操作应放入 Obsidian 原生视图操作区");
}
if (!mainSource.includes("extends PluginSettingTab") || !settingsSource.includes(".addSlider(")) {
  failures.push("侧栏行高应通过 Obsidian 原生插件设置页调节");
}
if (!settingsSource.includes('name: localize("显示 Space 名称")') || !settingsSource.includes(".addToggle(")) {
  failures.push("Space 名称显示方式必须可在插件设置中切换");
}
if (!mainSource.includes("getSettingDefinitions()") || !mainSource.includes("display(): void") ||
    mainSource.split("bucketSettingRows(this.bucketPlugin)").length !== 3 ||
    settingsSource.includes("saveData(") || /^\s*control\s*:/m.test(settingsSource)) {
  failures.push("新旧设置页必须共享控件并使用原有完整数据保存方法");
}
if (!mainSource.includes('style.setProperty("--bucket-row-height"')) {
  failures.push("侧栏行高设置未应用到 Bucket 视图");
}
if (!mainSource.includes("pinnedEntries.length > 0") || !mainSource.includes("renderPinnedSection")) {
  failures.push("置顶区必须仅在存在置顶引用时渲染");
}
if (!mainSource.includes('renderSectionHeading(localize("分组"))') || !mainSource.includes("hasPinnedEntries")) {
  failures.push("存在置顶区时，Bucket 列表必须显示同级的分组标题");
}
if (!mainSource.includes('.setTitle(pinned ? localize("取消置顶") : localize("置顶"))')) {
  failures.push("文件与文件夹右键菜单缺少置顶状态操作");
}
if (!mainSource.includes('setAttribute("role", "radiogroup")') ||
    !mainSource.includes('setAttribute("aria-checked"')) {
  failures.push("Space 胶囊缺少互斥选择与可访问状态");
}
if (!mainSource.includes('className = "bucket-space-add"') ||
    !mainSource.includes('setAttribute("aria-label", localize("新建 Project / Area"))')) {
  failures.push("Space 胶囊末端必须有明确、可访问的新建 Project / Area 入口");
}
if (!mainSource.includes("promptChangeSpaceIcon") || !mainSource.includes("promptRenameSpace")) {
  failures.push("Space 必须允许修改图标和名称");
}
if (!modelSource.includes("showSpaceNames: false")) {
  failures.push("Space 切换器默认应只显示图标");
}

const spaceSwitcherBlock = findBlock("\\.bucket-space-switcher", "Space 胶囊切换器");
if (!spaceSwitcherBlock.includes("border-radius: 999px") || !spaceSwitcherBlock.includes("overflow: hidden")) {
  failures.push("Space 切换器应保持胶囊外形并固定末端新建入口");
}
if (!spaceSwitcherBlock.includes("width: max-content") || !spaceSwitcherBlock.includes("flex: 0 1 auto") || !spaceSwitcherBlock.includes("padding: 3px")) {
  failures.push("Space 胶囊应随内容伸缩并完整包住末端加号");
}
if (!findBlock("\\.bucket-space-switcher-wrap", "胶囊对齐").includes("justify-content: center")) failures.push("胶囊整体应居中");
const groupsHeading = findBlock("\\.bucket-groups-heading", "置顶分隔");
if (!groupsHeading.includes("border-top: 1px solid") || !groupsHeading.includes("--bucket-pinned-gap")) {
  failures.push("置顶与分组需要分隔线和留白");
}
const groupGap = findBlock("\\.bucket-section \\+ \\.bucket-section", "普通分组留白");
if (!groupGap.includes("--bucket-group-gap")) failures.push("普通分组间需要独立留白");

const spaceTabsBlock = findBlock("\\.bucket-space-tabs", "Space 切换项容器");
if (!spaceTabsBlock.includes("overflow-x: auto")) {
  failures.push("Space 选项过多时应独立横向滚动，不应将新建按钮滚出视野");
}

const spaceAddBlock = findBlock(
  "\\.bucket-sidebar-root button\\.bucket-space-add",
  "Project / Area 新建按钮"
);
if (!spaceAddBlock.includes("flex: 0 0 auto") || !spaceAddBlock.includes("background: transparent")) {
  failures.push("Project / Area 新建按钮应始终可见且使用透明语义底色");
}

const pinnedHeadingBlock = findBlock("\\.bucket-section-heading", "置顶区域标题");
if (!pinnedHeadingBlock.includes("text-align: left") || !pinnedHeadingBlock.includes("--font-ui-smaller")) {
  failures.push("置顶区域标题应靠左并弱于普通列表文字");
}

const pickerLabelBlock = findBlock(
  "\\.bucket-target-picker-modal button\\.bucket-target-label",
  "批量选择器名称"
);
if (!pickerLabelBlock.includes("text-align: left") || !pickerLabelBlock.includes("background: transparent")) {
  failures.push("批量选择器名称必须左对齐且不带装饰性底色");
}

const pickerToggleBlock = findBlock(
  "\\.bucket-target-picker-modal button\\.bucket-target-toggle",
  "批量选择圆形按钮"
);
if (!pickerToggleBlock.includes("border-radius: 50%")) {
  failures.push("批量选择控件应使用圆形加号/勾选状态");
}
if (!pickerSource.includes('setAttribute("aria-checked"') || !pickerSource.includes('setAttribute("role", "checkbox"')) {
  failures.push("批量选择控件缺少可访问的混合选择状态");
}
if (pickerSource.includes('className = "bucket-target-disclosure clickable-icon"')) {
  failures.push("文件树折叠箭头不应触发重复完整路径的 hover tooltip");
}
if (!pickerSource.includes('disclosure.setAttribute("aria-label"')) {
  failures.push("移除折叠箭头 tooltip 时必须保留展开/收起的可访问名称");
}

const themeBoundaryStart = css.indexOf("Theme compatibility boundary");
const focusBoundaryStart = css.indexOf(".bucket-sidebar-root button:focus-visible");
const themeBoundary = themeBoundaryStart >= 0 && focusBoundaryStart > themeBoundaryStart
  ? css.slice(themeBoundaryStart, focusBoundaryStart)
  : "";
for (const declaration of [
  "border: 0 !important",
  "background-color: transparent !important",
  "background-image: none !important",
  "box-shadow: none !important",
  "margin-inline-start: 2px !important",
  "border-radius: 50% !important"
]) {
  if (!themeBoundary.includes(declaration)) {
    failures.push(`主题隔离边界缺少声明：${declaration}`);
  }
}
for (const controlClass of [
  "button.bucket-space-tab",
  "button.bucket-name",
  "button.bucket-entry-label",
  "button.bucket-entry-empty",
  "button.bucket-target-label",
  "button.bucket-target-toggle"
]) {
  if (!themeBoundary.includes(controlClass)) {
    failures.push(`主题隔离边界未覆盖：${controlClass}`);
  }
}
if (css.includes("border-inline-start: 1px solid var(--background-modifier-border)") ||
    css.includes("border-left: 1px solid var(--background-modifier-border)")) {
  failures.push("Project / Area 新建按钮不应使用贯穿胶囊的竖向分隔线");
}

if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css)) {
  failures.push("样式中包含硬编码颜色，可能破坏主题和明暗模式");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("UI contract checks passed (left alignment, theme isolation, semantic states).");
}
