import assert from "node:assert/strict";
import test from "node:test";
import { host, copy, flush } from "./helpers/bucket-host.mjs";
for (const language of ["en", "zh"]) {
  test(`search registration is read-only and localised (${language})`, async () => {
    const h = await host(language);
    const before = copy(h.plugin.data);
    for (let i = 0; i < 3; i++) {
      const definitions = h.tab.getSettingDefinitions();
      assert.equal(definitions.length, 1);
      assert.equal(definitions[0].type, "group");
      assert.equal(definitions[0].items.length, 2);
      for (const row of definitions[0].items) {
        assert.ok(row.name && row.desc);
        assert.equal(typeof row.render, "function");
        assert.equal(row.control, undefined, "must not auto-save a settings-only object");
      }
      assert.equal(definitions[0].name, language === "zh" ? "外观" : "Appearance");
    }
    assert.deepEqual(copy(h.plugin.data), before);
    assert.equal(h.tab.containerEl.rows.length, 0);
    assert.equal(h.writes.length, 0);
  });

  for (const mode of ["legacy", "declarative"]) {
    test(`${mode} controls preserve whole data, bounds, reset and live values (${language})`, async () => {
      const h = await host(language);
      const { tab } = h;
      const baseline = copy(h.plugin.data);
      const render = () => {
        if (mode === "legacy") {
          tab.display();
        } else {
          tab.containerEl.empty();
          for (const row of tab.getSettingDefinitions()[0].items) {
            row.render(new h.Setting(tab.containerEl).setName(row.name).setDesc(row.desc));
          }
        }
        return tab.containerEl.rows.filter(row => !row.heading);
      };
      let rows = render();
      assert.equal(rows.length, 2);
      assert.equal(rows[0].controls.toggle.value, true);
      assert.equal(rows[1].controls.slider.value, 37);
      assert.deepEqual(rows[1].controls.slider.limits, [28, 40, 1]);
      assert.equal(h.writes.length, 0, "render must not save");
      rows[0].controls.toggle.change(false);
      rows[1].controls.slider.change(39);
      await flush();
      assert.equal(h.writes.length, 2);
      const count = tab.containerEl.rows.length;
      rows[1].controls.reset.click();
      await flush();
      assert.equal(rows[1].controls.slider.value, 32);
      assert.equal(tab.containerEl.rows.length, count, "reset must not rebuild or duplicate rows");
      for (const saved of h.writes) {
        assert.deepEqual(saved.spaces, baseline.spaces);
        assert.equal(saved.activeSpaceId, baseline.activeSpaceId);
        assert.equal(saved.version, baseline.version);
        assert.deepEqual(saved.settings.folderSortOrders, baseline.settings.folderSortOrders);
      }
      assert.equal(h.writes.at(-1).settings.showSpaceNames, false);
      assert.equal(h.writes.at(-1).settings.rowHeight, 32);
      assert.equal(h.refreshes(), h.writes.length);
      rows = render();
      assert.equal(rows.length, 2);
      assert.equal(rows[0].controls.toggle.value, false);
      assert.equal(rows[1].controls.slider.value, 32);
      rows[1].controls.slider.change(900);
      await flush();
      assert.equal(h.writes.at(-1).settings.rowHeight, 40);
    });
  }
  test(`legacy and declarative labels are identical (${language})`, async () => {
    const { tab } = await host(language);
    tab.display();
    const rows = tab.containerEl.rows.filter(row => !row.heading);
    const definitions = tab.getSettingDefinitions()[0].items;
    assert.deepEqual(rows.map(r => [r.name, r.desc]), Array.from(definitions, r => [r.name, r.desc]));
  });
}
