import assert from "node:assert/strict";
import vm from "node:vm";
import { buildSync } from "esbuild";

// Production plugin with a minimal host contract, not an Obsidian UI/device test.
const code = buildSync({ entryPoints: ["src/main.ts"], bundle: true,
  write: false, platform: "node", format: "cjs", target: "es2018",
  external: ["obsidian"], logLevel: "silent" }).outputFiles[0].text;
export const copy = value => JSON.parse(JSON.stringify(value));
export const initial = {
  version: 2, activeSpaceId: "work", settings: {
    rowHeight: 37, showSpaceNames: true, folderSortOrders: { Research: "created-desc" }
  },
  spaces: [{ id: "work", name: "Work", icon: "layers",
    pinnedEntries: [{ id: "pin", type: "file", path: "Start.md" }],
    buckets: [{ id: "read", name: "Reading", entries: [
      { id: "folder", type: "folder", path: "Research", expandedPaths: ["Research/2026"] }
    ] }]
  }]
};

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.textContent = ""; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(type, callback) { this.listeners[type] = callback; }
}
export const messageText = message => typeof message === "string" ? message :
  message.textContent + message.children.map(messageText).join(" ");
export const flush = () => new Promise(resolve => setImmediate(resolve));

export async function host(language, options = {}) {
  class Empty {}
  class Control {
    setValue(value) { this.value = value; return this; }
    setLimits(...limits) { this.limits = limits; return this; }
    setDynamicTooltip() { this.tooltip = true; return this; }
    setIcon(icon) { this.icon = icon; return this; }
    setTooltip(label) { this.label = label; return this; }
    onChange(fn) { this.change = fn; return this; }
    onClick(fn) { this.click = fn; return this; }
  }
  class Setting {
    constructor(container) { this.controls = {}; container.rows.push(this); }
    setName(name) { this.name = name; return this; }
    setDesc(desc) { this.desc = desc; return this; }
    setHeading() { this.heading = true; return this; }
    addToggle(fn) { fn(this.controls.toggle = new Control()); return this; }
    addSlider(fn) { fn(this.controls.slider = new Control()); return this; }
    addExtraButton(fn) { fn(this.controls.reset = new Control()); return this; }
  }
  class PluginSettingTab {
    constructor(app, plugin) {
      this.app = app; this.plugin = plugin;
      this.containerEl = { rows: [], empty() { this.rows = []; } };
    }
  }
  const writes = [], notices = [], errors = [], cleanups = [];
  let refreshes = 0, stored = copy(options.initial || initial);
  class Plugin {
    constructor(app) { this.app = app; }
    loadData() { return Promise.resolve(copy(stored)); }
    async saveData(data) {
      writes.push(copy(data));
      await options.save?.(data, writes.length);
      stored = copy(data);
    }
    addSettingTab(tab) { this.tab = tab; }
    register(callback) { cleanups.push(callback); }
    registerView() {}
    addRibbonIcon() {}
    addCommand() {}
    registerEvent() {}
  }
  class Notice {
    constructor(message, duration) {
      this.message = message; this.duration = duration;
      this.noticeEl = { isConnected: true }; notices.push(this);
    }
    hide() { this.noticeEl.isConnected = false; }
  }
  const obsidian = { Plugin, PluginSettingTab, Setting, Notice, ItemView: Empty,
    Modal: Empty, FuzzySuggestModal: Empty, TFile: Empty, TFolder: Empty };
  const context = vm.createContext({ module: { exports: {} }, console: { error: (...args) => errors.push(args) },
    window: { localStorage: { getItem: () => language } },
    createFragment: () => new Element("fragment"),
    createSpan: () => new Element("span"), createEl: tag => new Element(tag),
    require: name => { assert.equal(name, "obsidian"); return obsidian; }
  });
  vm.runInContext(code, context);
  const on = () => {};
  const plugin = new context.module.exports.default({
    workspace: { on, onLayoutReady() {}, getLeavesOfType() {
      refreshes++; options.refresh?.(); return [];
    } }, vault: { on }, metadataCache: { on }
  });
  await plugin.onload();
  return { plugin, tab: plugin.tab, Setting, writes, notices, errors,
    refreshes: () => refreshes, stored: () => copy(stored), unload: () => cleanups.forEach(fn => fn()) };
}
