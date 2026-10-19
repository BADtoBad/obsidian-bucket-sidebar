import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const code = buildSync({ entryPoints: ['src/target-picker.ts'], bundle: true,
  write: false, platform: 'node', format: 'cjs', target: 'es2018',
  external: ['obsidian'], logLevel: 'silent' }).outputFiles[0].text;

// Execute the actual picker with a minimal DOM/Platform contract. This checks
// focus decisions, not the behaviour of a physical phone software keyboard.
function mount(mobile, language) {
  const elements = [], timers = [], focused = [];
  class Element {
    constructor(tag) {
      this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {};
      this.classList = { add() {}, remove() {} }; this.isConnected = true;
      elements.push(this);
    }
    setAttribute(k, v) { this.attributes[k] = v; }
    removeAttribute(k) { delete this.attributes[k]; }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); return node; }
    replaceChildren(...nodes) {
      for (const child of this.children) child.detach();
      this.children = nodes;
    }
    detach() { this.isConnected = false; this.children.forEach(child => child.detach()); }
    hasChildNodes() { return this.children.length > 0; }
    addEventListener(k, fn) { this.listeners[k] = fn; }
    focus(options) { focused.push({ element: this, options }); }
  }
  class TFolder { constructor() { this.children = []; this.path = ''; } }
  class Modal {
    constructor(app) {
      this.app = app; this.modalEl = new Element('div');
      this.titleEl = new Element('h2'); this.contentEl = new Element('div');
    }
  }
  const context = vm.createContext({ module: { exports: {} },
    window: { localStorage: { getItem: () => language }, setTimeout: fn => timers.push(fn) },
    createDiv: () => new Element('div'), createSpan: () => new Element('span'), createEl: tag => new Element(tag),
    require: () => ({ Modal, Platform: { isMobile: mobile }, TFolder, TFile: class {}, setIcon() {} })
  });
  vm.runInContext(code, context);
  const picker = new context.module.exports.BatchTargetPickerModal({ vault: { getRoot: () => new TFolder() } },
    { name: '<Long name> {0} 研究资料', entries: [] }, () => {});
  picker.onOpen();
  return { picker, search: elements.find(e => e.tag === 'input'), timers, focused };
}

for (const language of ['zh', 'en']) {
  test(`mobile picker initially focuses a non-input heading (${language})`, () => {
    const h = mount(true, language);
    assert.equal(h.timers.length, 0);
    assert.equal(h.focused.length, 1);
    assert.equal(h.focused[0].element, h.picker.titleEl);
    assert.equal(h.focused[0].options.preventScroll, true);
    assert.equal(h.picker.titleEl.children[0].textContent, language === 'zh' ? '添加到 ' : 'Add to ');
    assert.equal(h.picker.titleEl.children[1].textContent, '<Long name> {0} 研究资料');
    h.search.focus();
    assert.equal(h.focused.at(-1).element, h.search, 'search remains focusable on request');
  });
  test(`desktop picker retains deferred search focus (${language})`, () => {
    const h = mount(false, language);
    assert.equal(h.focused.length, 0);
    h.timers.forEach(fn => fn());
    assert.equal(h.focused.at(-1).element, h.search);
  });
}
test('closing the picker before its desktop timer runs cannot steal focus', () => {
  const h = mount(false, 'en');
  h.picker.onClose();
  h.timers.forEach(fn => fn());
  assert.equal(h.focused.length, 0);
});
