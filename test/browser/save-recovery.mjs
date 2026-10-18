import BucketSidebarPlugin from "../../src/main.ts";
import { normalizeData } from "../../src/model.ts";
import { state, copy } from "./save-recovery-host.mjs";

window.createFragment = () => document.createDocumentFragment();
window.createSpan = () => document.createElement("span");
window.createEl = tag => document.createElement(tag);
const $ = id => document.getElementById(id);
const seed = normalizeData({ version: 2, activeSpaceId: "work", settings: {
  rowHeight: 37, showSpaceNames: true, folderSortOrders: { Research: "created-desc" }
}, spaces: [{ id: "work", name: "Work", icon: "layers",
  pinnedEntries: [{ id: "start", type: "file", path: "Start.md" }],
  buckets: [{ id: "read", name: "Reading", entries: [{ id: "research", type: "folder", path: "Research" }] }]
}] });
state.stored = copy(seed);
let plugin;
const app = { workspace: { on() {}, onLayoutReady() {}, getLeavesOfType() {
  queueMicrotask(render); return [];
} }, vault: { on() {} }, metadataCache: { on() {} } };
function summary(data) {
  return `Names: ${data.settings.showSpaceNames}; Row: ${data.settings.rowHeight}px; ` +
    `Groups: ${data.spaces[0].buckets.map(b => b.name).join(", ") || "none"}; ` +
    `Pinned: ${data.spaces[0].pinnedEntries.length}; Sort: ${data.settings.folderSortOrders.Research}`;
}
function render() {
  if (!plugin) return;
  $("memory").textContent = summary(plugin.data);
  $("stored").textContent = summary(state.stored);
  $("status").textContent = plugin.hasUnsavedChanges ? "Unsaved changes" : "Saved";
  $("attempts").textContent = String(state.writes);
  $("pending").textContent = String(state.pending.length);
  $("finish").disabled = state.pending.length === 0;
}
state.render = render;
async function mount() {
  plugin = new BucketSidebarPlugin(app);
  await plugin.onload();
  render();
}
$("language").addEventListener("change", event => {
  localStorage.setItem("language", event.target.value);
  document.documentElement.lang = event.target.value;
});
localStorage.setItem("language", "en");
$("fail").addEventListener("change", event => { state.fail = event.target.checked; });
$("hold").addEventListener("change", event => { state.hold = event.target.checked; });
$("finish").addEventListener("click", () => { state.pending.splice(0).forEach(resolve => resolve()); render(); });
$("names").addEventListener("click", async () => { await plugin.setShowSpaceNames(false); render(); });
$("height").addEventListener("click", async () => { await plugin.setSidebarRowHeight(40); render(); });
$("remove").addEventListener("click", () => { plugin.removeBucket("read"); render(); });
$("undo").addEventListener("click", () => { plugin.undo(); render(); });
$("reload").addEventListener("click", async () => {
  plugin.cleanups.forEach(fn => fn());
  $("notices").replaceChildren();
  await mount();
});
$("mode").addEventListener("change", event => { document.body.classList.toggle("dark", event.target.checked); });
await mount();
