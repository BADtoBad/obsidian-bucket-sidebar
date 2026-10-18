import assert from "node:assert/strict";
import test from "node:test";
import { host, copy, flush, messageText } from "./helpers/bucket-host.mjs";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
const failure = () => { throw new Error("Simulated storage failure"); };
const warnings = h => h.notices.filter(n => n.duration === 0);
const retryButton = h => warnings(h).at(-1).message.children.find(n => n.tag === "button");

for (const language of ["en", "zh"]) {
  test(`failed save preserves the whole session and provides a persistent retry (${language})`, async () => {
    const h = await host(language, { save: failure });
    const before = h.stored();
    const session = copy(h.plugin.data);
    assert.equal(await h.plugin.setShowSpaceNames(false), false);
    assert.equal(h.plugin.hasUnsavedChanges, true);
    assert.equal(h.plugin.data.settings.showSpaceNames, false);
    assert.deepEqual(h.stored(), before);
    assert.deepEqual(copy(h.plugin.data.spaces), session.spaces);
    assert.deepEqual(copy(h.plugin.data.settings.folderSortOrders), session.settings.folderSortOrders);
    assert.equal(h.refreshes(), 1, "failed storage must not hide the in-memory edit");
    assert.equal(warnings(h).length, 1);
    assert.match(messageText(warnings(h)[0].message), language === "zh" ? /尚未保存.*关闭库/ : /not saved yet.*closing the vault/);
    assert.equal(retryButton(h).textContent, language === "zh" ? "重试保存" : "Retry saving");
    assert.equal(retryButton(h).type, "button");
    assert.equal(h.errors.length, 1);
  });

  for (const kind of ["toggle", "slider"]) {
    test(`same-value ${kind} change retries after failure and is a no-op once saved (${language})`, async () => {
      const h = await host(language, { save: (_data, attempt) => { if (attempt === 1) failure(); } });
      const change = () => kind === "toggle" ? h.plugin.setShowSpaceNames(false) : h.plugin.setSidebarRowHeight(900);
      assert.equal(await change(), false);
      const retained = copy(h.plugin.data);
      assert.equal(await change(), true);
      assert.deepEqual(h.stored(), retained);
      assert.deepEqual(h.writes[0], h.writes[1]);
      assert.equal(h.plugin.hasUnsavedChanges, false);
      assert.equal(warnings(h)[0].noticeEl.isConnected, false);
      assert.match(messageText(h.notices.at(-1).message), language === "zh" ? /已保存/ : /have been saved/);
      assert.equal(await change(), true);
      assert.equal(await h.plugin.retryUnsavedChanges(), true);
      assert.equal(h.writes.length, 2, "clean no-op must not write again");
    });
  }

  test(`retry button handles repeated failure and recovery without duplicate notices (${language})`, async () => {
    const pending = deferred();
    const h = await host(language, { save: (_data, attempt) => {
      if (attempt === 1) failure();
      if (attempt === 2) return pending.promise;
    } });
    await h.plugin.setShowSpaceNames(false);
    const button = retryButton(h);
    let stopped = 0;
    button.listeners.click({ stopPropagation() { stopped++; } });
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, language === "zh" ? "正在保存…" : "Saving…");
    await flush();
    pending.reject(new Error("Still unavailable"));
    await flush();
    assert.equal(button.disabled, false);
    assert.equal(h.plugin.hasUnsavedChanges, true);
    assert.equal(warnings(h).length, 1);
    button.listeners.click({ stopPropagation() { stopped++; } });
    await flush();
    assert.equal(stopped, 2, "retry must not bubble to dismiss the native notice");
    assert.equal(h.plugin.hasUnsavedChanges, false);
    assert.equal(warnings(h)[0].noticeEl.isConnected, false);
    assert.equal(h.writes.length, 3);
    assert.deepEqual(h.stored(), copy(h.plugin.data));
  });
}

test("concurrent edits use independent snapshots and ordered writes", async () => {
  const first = deferred(), second = deferred();
  const h = await host("en", { save: (_data, attempt) => attempt === 1 ? first.promise : second.promise });
  const a = h.plugin.setShowSpaceNames(false);
  const b = h.plugin.setSidebarRowHeight(39);
  await flush();
  assert.equal(h.writes.length, 1, "second storage write must not start before the first settles");
  assert.equal(h.writes[0].settings.rowHeight, 37, "later edits must not mutate the earlier snapshot");
  assert.equal(h.plugin.hasUnsavedChanges, true);
  first.resolve();
  assert.equal(await a, true);
  await flush();
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[1].settings.rowHeight, 39);
  assert.equal(h.plugin.hasUnsavedChanges, true, "an older success must not mark a pending edit saved");
  second.resolve();
  assert.equal(await b, true);
  assert.equal(h.plugin.hasUnsavedChanges, false);
  assert.deepEqual(h.stored(), copy(h.plugin.data));
});

test("a failed write does not poison a queued newer whole-data save", async () => {
  const first = deferred();
  const h = await host("en", { save: (_data, attempt) => attempt === 1 ? first.promise : undefined });
  const before = copy(h.plugin.data);
  const a = h.plugin.setShowSpaceNames(false);
  const b = h.plugin.setSidebarRowHeight(40);
  await flush();
  first.reject(new Error("First write failed"));
  assert.equal(await a, false);
  assert.equal(await b, true);
  assert.equal(h.plugin.hasUnsavedChanges, false);
  assert.equal(h.stored().settings.rowHeight, 40);
  assert.equal(h.stored().settings.showSpaceNames, false);
  assert.deepEqual(h.stored().spaces, before.spaces);
  assert.deepEqual(h.stored().settings.folderSortOrders, before.settings.folderSortOrders);
  assert.equal(warnings(h)[0].noticeEl.isConnected, false);
});

test("a later failure remains dirty even after an older successful save", async () => {
  const h = await host("en", { save: (_data, attempt) => { if (attempt === 2) failure(); } });
  const a = h.plugin.setShowSpaceNames(false);
  const b = h.plugin.setSidebarRowHeight(40);
  assert.equal(await a, true);
  assert.equal(await b, false);
  assert.equal(h.plugin.hasUnsavedChanges, true);
  assert.equal(h.stored().settings.rowHeight, 37);
  assert.equal(h.plugin.data.settings.rowHeight, 40);
  assert.equal(await h.plugin.retryUnsavedChanges(), true);
  assert.equal(h.stored().settings.rowHeight, 40);
});

test("repeated retry requests join pending work without multiplying writes", async () => {
  const pending = deferred();
  const h = await host("en", { save: (_data, attempt) => {
    if (attempt === 1) failure();
    return pending.promise;
  } });
  await h.plugin.setShowSpaceNames(false);
  const a = h.plugin.retryUnsavedChanges();
  const b = h.plugin.retryUnsavedChanges();
  const c = h.plugin.setShowSpaceNames(false);
  assert.equal(a, b);
  await flush();
  assert.equal(h.writes.length, 2);
  pending.resolve();
  assert.deepEqual(await Promise.all([a, b, c]), [true, true, true]);
  assert.equal(h.writes.length, 2);
});

test("a dismissed warning is recreated on the next failed save", async () => {
  const h = await host("en", { save: failure });
  await h.plugin.setShowSpaceNames(false);
  warnings(h)[0].hide();
  assert.equal(await h.plugin.retryUnsavedChanges(), false);
  assert.equal(warnings(h).length, 2);
  assert.equal(warnings(h)[1].noticeEl.isConnected, true);
  await flush();
  assert.equal(h.writes.length, 2, "no background retry loop");
});

test("retry saves the latest undo state, not the earlier failed snapshot", async () => {
  let available = false;
  const h = await host("en", { save: () => { if (!available) failure(); } });
  const before = copy(h.plugin.data);
  h.plugin.removeBucket("read");
  await flush();
  assert.equal(h.plugin.data.spaces[0].buckets.length, 0);
  assert.equal(h.plugin.canUndo(), true);
  await h.plugin.setSidebarRowHeight(40);
  h.plugin.undo();
  await flush();
  assert.deepEqual(copy(h.plugin.data.spaces), before.spaces);
  assert.equal(h.plugin.data.settings.rowHeight, 40, "undo must preserve current display settings");
  assert.equal(h.plugin.canUndo(), false);
  available = true;
  assert.equal(await h.plugin.retryUnsavedChanges(), true);
  assert.deepEqual(h.stored(), copy(h.plugin.data));
  assert.deepEqual(h.stored().spaces, before.spaces);
  assert.equal(h.writes[0].spaces[0].buckets.length, 0, "the old failed snapshot remains independent");
});

test("view refresh failure is distinct from disk failure and does not block future writes", async () => {
  const h = await host("en", { refresh: () => { throw new Error("View unavailable"); } });
  assert.equal(await h.plugin.setShowSpaceNames(false), true);
  assert.equal(await h.plugin.setSidebarRowHeight(40), true);
  assert.equal(h.plugin.hasUnsavedChanges, false);
  assert.equal(warnings(h).length, 0);
  assert.equal(h.errors.length, 2);
  assert.deepEqual(h.stored(), copy(h.plugin.data));
});

test("disable cleans up a warning and refuses new retries", async () => {
  const h = await host("en", { save: failure });
  await h.plugin.setShowSpaceNames(false);
  h.unload();
  assert.equal(warnings(h)[0].noticeEl.isConnected, false);
  assert.equal(await h.plugin.retryUnsavedChanges(), false);
  assert.equal(h.writes.length, 1);
  assert.equal(h.plugin.hasUnsavedChanges, true, "cleanup must not pretend unsaved edits were saved");
});

test("disable does not start queued writes or update UI after an in-flight write finishes", async () => {
  const pending = deferred();
  const h = await host("en", { save: () => pending.promise });
  const a = h.plugin.setShowSpaceNames(false);
  const b = h.plugin.setSidebarRowHeight(40);
  await flush();
  h.unload();
  pending.resolve();
  assert.equal(await a, true, "already-started host writes cannot be cancelled here");
  assert.equal(await b, false);
  assert.equal(h.writes.length, 1);
  assert.equal(h.refreshes(), 0);
  assert.equal(h.notices.length, 0);
  assert.equal(h.plugin.hasUnsavedChanges, true);
});

test("startup and clean retries perform no writes", async () => {
  const h = await host("en");
  assert.equal(h.plugin.hasUnsavedChanges, false);
  assert.equal(await h.plugin.retryUnsavedChanges(), true);
  assert.equal(await h.plugin.setShowSpaceNames(true), true);
  assert.equal(await h.plugin.setSidebarRowHeight(37), true);
  assert.equal(h.writes.length, 0);
  assert.equal(h.notices.length, 0);
});
