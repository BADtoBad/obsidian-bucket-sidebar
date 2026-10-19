// Minimal DOM host for manual regression checks. This is NOT Obsidian,
// does not access a Vault and never writes a note or plugin data file.
export const copy = value => JSON.parse(JSON.stringify(value));
export const Platform = { isMobile: false };
export const state = { stored: null, fail: true, hold: false, writes: 0, pending: [], render: () => {} };

export class Plugin {
  constructor(app) { this.app = app; this.cleanups = []; }
  async loadData() { return copy(state.stored); }
  async saveData(data) {
    state.writes++;
    if (state.hold) {
      await new Promise(resolve => { state.pending.push(resolve); state.render(); });
    }
    if (state.fail) throw new Error("Intentional fixture storage failure");
    state.stored = copy(data);
  }
  register(fn) { this.cleanups.push(fn); }
  addSettingTab() {}
  registerView() {}
  addRibbonIcon() {}
  addCommand() {}
  registerEvent() {}
}
export class PluginSettingTab {
  constructor(app, plugin) { this.app = app; this.plugin = plugin; }
}
export class Notice {
  constructor(message, duration) {
    this.noticeEl = document.createElement("div");
    this.noticeEl.className = "fixture-notice";
    this.noticeEl.setAttribute("role", "status");
    this.noticeEl.dataset.persistent = String(duration === 0);
    this.noticeEl.append(message);
    this.noticeEl.addEventListener("click", () => this.hide());
    document.querySelector("#notices").append(this.noticeEl);
  }
  hide() { this.noticeEl.remove(); }
}
export class ItemView {}
export class Modal {}
export class FuzzySuggestModal {}
export class TFile {}
export class TFolder {}
export class Setting {}
export class Menu {}
export const setIcon = () => {};
