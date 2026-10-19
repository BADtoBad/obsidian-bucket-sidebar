import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync('styles.css', 'utf8');
const mobile = css.slice(css.indexOf('/* Mobile touch pass.'));
test('mobile overrides cannot match the desktop body', () => {
  const rules = [...mobile.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  assert.ok(rules.length > 10);
  for (const [ , selectors, declarations] of rules) {
    if (selectors.trim() === '.bucket-sidebar-root button.bucket-space-menu') {
      assert.match(declarations, /display: none/); // hidden touch-only menu
      continue;
    }
    for (const selector of selectors.split(/,\s*\n/)) assert.match(selector.trim(), /^body\.is-mobile /);
  }
  assert.doesNotMatch(mobile, /touch-action|preventDefault|--bucket-row-height\s*:/);
});
test('touch users can reach row and Space menus without hover or long-press', () => {
  assert.match(mobile, /bucket-row-actions\s*\{\s*opacity: 1;\s*pointer-events: auto/);
  assert.match(mobile, /button\.bucket-space-menu\s*\{\s*display: inline-flex/);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /this\.showSpaceMenu\(event, this\.plugin\.activeSpace\)/);
  assert.match(main, /spaceMenu\.setAttribute\("aria-haspopup", "menu"\)/);
});
test('picker can shrink and wrap without changing its saved-data model', () => {
  assert.match(mobile, /\.bucket-target-picker\s*\{\s*min-height: 0/);
  assert.match(mobile, /min-height: 44px/);
  assert.match(mobile, /flex-wrap: wrap/);
  assert.equal(JSON.parse(readFileSync('manifest.json', 'utf8')).isDesktopOnly, false);
});
test('mobile picker has a small visible ring inside its full touch target', () => {
  assert.match(mobile, /bucket-target-toggle::before\s*\{[^}]*width: 22px;[^}]*height: 22px;[^}]*pointer-events: none/s);
  assert.match(mobile, /bucket-target-title-name\s*\{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap/s);
  assert.match(css, /--bucket-row-height: 28px/);
  assert.match(css, /\.bucket-sidebar-root :is\(\.bucket-header, \.bucket-entry-row\)\s*\{\s*min-height: var\(--bucket-row-height\)/);
});
