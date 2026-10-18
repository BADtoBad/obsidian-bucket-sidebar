import assert from "node:assert/strict";
import test from "node:test";
import {
  addBucket,
  addEntryToBucket,
  addPinnedEntry,
  addSpace,
  copyEntryBetweenBuckets,
  createEmptyData,
  getActiveSpace,
  isPathExcluded,
  isTargetPinned,
  normalizeData,
  normalizeRowHeight,
  removeEntryFromBucket,
  removePinnedEntry,
  removeSpace,
  renameSpace,
  reorderEntry,
  setActiveSpace,
  setSpaceIcon,
  updatePathsAfterRename
} from "../src/model";

test("PDF 引用保存重载、去重、跨 Bucket 复制不丢路径", () => {
  const data = createEmptyData();
  const first = addBucket(data, "面试"), second = addBucket(data, "参考");
  assert.ok(first && second);
  const target = { type: "file" as const, path: "面试/候选人.PDF" };
  const entry = addEntryToBucket(data, first.id, target);
  assert.ok(entry);
  assert.equal(addEntryToBucket(data, first.id, target), null);
  addPinnedEntry(data, target);
  copyEntryBetweenBuckets(data, first.id, entry.id, second.id);
  const saved = normalizeData(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(saved.spaces, data.spaces);
  assert.equal(getActiveSpace(saved).buckets[1].entries[0].path, target.path);
});

test("PDF 重命名同时更新置顶与普通引用，不影响同名 Markdown", () => {
  const data = createEmptyData();
  const bucket = addBucket(data, "资料");
  assert.ok(bucket);
  addEntryToBucket(data, bucket.id, {type:"file",path:"资料/简历.pdf"});
  addEntryToBucket(data, bucket.id, {type:"file",path:"资料/简历.md"});
  addPinnedEntry(data, {type:"file",path:"资料/简历.pdf"});
  updatePathsAfterRename(data, "资料/简历.pdf", "资料/面试简历.pdf", "file");
  assert.deepEqual(bucket.entries.map(e=>e.path), ["资料/面试简历.pdf", "资料/简历.md"]);
  assert.equal(getActiveSpace(data).pinnedEntries[0].path, "资料/面试简历.pdf");
});

test("旧版数据会补上默认侧栏行高", () => {
  const data = normalizeData({ version: 1, buckets: [] });

  assert.equal(data.version, 2);
  assert.equal(data.spaces.length, 1);
  assert.equal(getActiveSpace(data).name, "主空间");
  assert.equal(data.settings.rowHeight, 32);
  assert.equal(data.settings.showSpaceNames, false);
  assert.deepEqual(getActiveSpace(data).pinnedEntries, []);
});

test("Space 名称开关保存重载后保持选择且不改变编排", () => {
  const data = createEmptyData();
  addBucket(data, "工作项目");
  addPinnedEntry(data, { type: "file", path: "置顶.md" });
  for (const showSpaceNames of [true, false]) {
    data.settings.showSpaceNames = showSpaceNames;
    const reloaded = normalizeData(JSON.parse(JSON.stringify(data)));
    assert.equal(reloaded.settings.showSpaceNames, showSpaceNames);
    assert.deepEqual(reloaded.spaces, data.spaces);
  }
});

test("旧版 Bucket 与置顶引用会完整迁入主空间", () => {
  const data = normalizeData({
    version: 1,
    buckets: [{ id: "bucket-old", name: "旧分组", entries: [] }],
    pinnedEntries: [{ id: "pin-old", type: "file", path: "保留.md" }],
    settings: { rowHeight: 35 }
  });
  const space = getActiveSpace(data);

  assert.equal(space.buckets[0].id, "bucket-old");
  assert.equal(space.pinnedEntries[0].id, "pin-old");
  assert.equal(data.settings.rowHeight, 35);
});

test("多个 Space 各自保存独立的 Bucket 与置顶引用", () => {
  const data = createEmptyData();
  const main = getActiveSpace(data);
  addBucket(data, "主空间分组");
  addPinnedEntry(data, { type: "file", path: "主空间.md" });

  const work = addSpace(data, "工作", "briefcase");
  assert.ok(work);
  addBucket(data, "工作分组");
  addPinnedEntry(data, { type: "file", path: "工作.md" });

  assert.deepEqual(main.buckets.map((bucket) => bucket.name), ["主空间分组"]);
  assert.deepEqual(main.pinnedEntries.map((entry) => entry.path), ["主空间.md"]);
  assert.deepEqual(work.buckets.map((bucket) => bucket.name), ["工作分组"]);
  assert.deepEqual(work.pinnedEntries.map((entry) => entry.path), ["工作.md"]);
});

test("Space 名称唯一且至少保留一个 Space", () => {
  const data = createEmptyData();
  const main = getActiveSpace(data);
  const work = addSpace(data, "工作");
  assert.ok(work);

  assert.equal(addSpace(data, "工作"), null);
  assert.equal(renameSpace(data, main.id, "工作"), false);
  assert.equal(removeSpace(data, work.id), true);
  assert.equal(removeSpace(data, main.id), false);
});

test("Space 可切换、重命名并更换图标", () => {
  const data = createEmptyData();
  const main = getActiveSpace(data);
  const work = addSpace(data, "工作");
  assert.ok(work);

  assert.equal(setActiveSpace(data, main.id), true);
  assert.equal(getActiveSpace(data).id, main.id);
  assert.equal(renameSpace(data, work.id, "项目"), true);
  assert.equal(setSpaceIcon(data, work.id, "rocket"), true);
  assert.equal(work.name, "项目");
  assert.equal(work.icon, "rocket");
});

test("路径重命名会覆盖所有 Space", () => {
  const data = createEmptyData();
  addPinnedEntry(data, { type: "file", path: "旧名.md" });
  const second = addSpace(data, "第二空间");
  assert.ok(second);
  addPinnedEntry(data, { type: "file", path: "旧名.md" });

  assert.equal(updatePathsAfterRename(data, "旧名.md", "新名.md", "file"), 2);
  assert.equal(data.spaces[0].pinnedEntries[0].path, "新名.md");
  assert.equal(data.spaces[1].pinnedEntries[0].path, "新名.md");
});

test("侧栏行高会取整并限制在可用范围内", () => {
  assert.equal(normalizeRowHeight(33.6), 34);
  assert.equal(normalizeRowHeight(10), 28);
  assert.equal(normalizeRowHeight(99), 40);
  assert.equal(normalizeRowHeight("34"), 32);
});

test("同一文件可以同时存在于不同 Bucket", () => {
  const data = createEmptyData();
  const first = addBucket(data, "灵感");
  const second = addBucket(data, "本周");

  assert.ok(addEntryToBucket(data, first.id, { type: "file", path: "资料/共享笔记.md" }));
  assert.ok(addEntryToBucket(data, second.id, { type: "file", path: "资料/共享笔记.md" }));
  assert.equal(first.entries.length, 1);
  assert.equal(second.entries.length, 1);
  assert.notEqual(first.entries[0].id, second.entries[0].id);
});

test("置顶引用全局去重并可单独取消", () => {
  const data = createEmptyData();

  assert.ok(addPinnedEntry(data, { type: "file", path: "资料/常用.md" }));
  assert.equal(addPinnedEntry(data, { type: "file", path: "资料/常用.md" }), null);
  assert.equal(isTargetPinned(data, "file", "资料/常用.md"), true);
  assert.equal(removePinnedEntry(data, "file", "资料/常用.md"), true);
  assert.equal(isTargetPinned(data, "file", "资料/常用.md"), false);
});

test("重命名文件或文件夹会同步更新置顶引用", () => {
  const data = createEmptyData();
  addPinnedEntry(data, { type: "folder", path: "旧项目" });
  addPinnedEntry(data, { type: "file", path: "旧项目/说明.md" });

  assert.equal(updatePathsAfterRename(data, "旧项目", "新项目", "folder"), 2);
  assert.deepEqual(getActiveSpace(data).pinnedEntries.map((entry) => entry.path), ["新项目", "新项目/说明.md"]);
});

test("同一 Bucket 内不会生成重复引用", () => {
  const data = createEmptyData();
  const bucket = addBucket(data, "阅读");

  assert.ok(addEntryToBucket(data, bucket.id, { type: "file", path: "书摘.md" }));
  assert.equal(addEntryToBucket(data, bucket.id, { type: "file", path: "书摘.md" }), null);
  assert.equal(bucket.entries.length, 1);
});

test("跨 Bucket 拖放复制引用并保留来源", () => {
  const data = createEmptyData();
  const source = addBucket(data, "来源");
  const target = addBucket(data, "目标");
  const entry = addEntryToBucket(data, source.id, { type: "folder", path: "项目/甲" });
  assert.ok(entry);

  const copied = copyEntryBetweenBuckets(data, source.id, entry.id, target.id);
  assert.ok(copied);
  assert.equal(source.entries.length, 1);
  assert.equal(target.entries.length, 1);
  assert.notEqual(source.entries[0].id, target.entries[0].id);
});

test("同一 Bucket 内可以重新排序", () => {
  const data = createEmptyData();
  const bucket = addBucket(data, "排序");
  const first = addEntryToBucket(data, bucket.id, { type: "file", path: "一.md" });
  addEntryToBucket(data, bucket.id, { type: "file", path: "二.md" });
  addEntryToBucket(data, bucket.id, { type: "file", path: "三.md" });
  assert.ok(first);

  assert.equal(reorderEntry(data, bucket.id, first.id, 3), true);
  assert.deepEqual(bucket.entries.map((entry) => entry.path), ["二.md", "三.md", "一.md"]);
});

test("文件重命名会更新所有 Bucket 引用", () => {
  const data = createEmptyData();
  const first = addBucket(data, "一");
  const second = addBucket(data, "二");
  addEntryToBucket(data, first.id, { type: "file", path: "旧名.md" });
  addEntryToBucket(data, second.id, { type: "file", path: "旧名.md" });

  assert.equal(updatePathsAfterRename(data, "旧名.md", "新名.md", "file"), 2);
  assert.equal(first.entries[0].path, "新名.md");
  assert.equal(second.entries[0].path, "新名.md");
});

test("文件夹重命名会更新自身、后代引用与展开状态", () => {
  const data = createEmptyData();
  const bucket = addBucket(data, "项目");
  const folder = addEntryToBucket(data, bucket.id, { type: "folder", path: "旧项目" });
  addEntryToBucket(data, bucket.id, { type: "file", path: "旧项目/说明.md" });
  assert.ok(folder);
  folder.expandedPaths = ["旧项目/阶段一"];

  assert.equal(updatePathsAfterRename(data, "旧项目", "新项目", "folder"), 2);
  assert.equal(bucket.entries[0].path, "新项目");
  assert.equal(bucket.entries[1].path, "新项目/说明.md");
  assert.deepEqual(bucket.entries[0].expandedPaths, ["新项目/阶段一"]);
});

test("移除一个引用不会影响其他 Bucket 的同路径引用", () => {
  const data = createEmptyData();
  const first = addBucket(data, "一");
  const second = addBucket(data, "二");
  const entry = addEntryToBucket(data, first.id, { type: "file", path: "共享.md" });
  addEntryToBucket(data, second.id, { type: "file", path: "共享.md" });
  assert.ok(entry);

  assert.equal(removeEntryFromBucket(data, first.id, entry.id), true);
  assert.equal(first.entries.length, 0);
  assert.equal(second.entries.length, 1);
});

test("文件夹引用保存排除项并忽略重复的后代排除", () => {
  const data = createEmptyData();
  const bucket = addBucket(data, "带例外的文件夹");
  const entry = addEntryToBucket(data, bucket.id, {
    type: "folder",
    path: "项目",
    excludedPaths: ["项目/私密", "项目/私密/草稿.md", "项目/忽略.md"]
  });
  assert.ok(entry);

  assert.deepEqual(entry.excludedPaths, ["项目/忽略.md", "项目/私密"]);
  assert.equal(isPathExcluded(entry, "项目/私密/任意.md"), true);
  assert.equal(isPathExcluded(entry, "项目/公开/说明.md"), false);
});

test("复制文件夹引用时保留排除项", () => {
  const data = createEmptyData();
  const source = addBucket(data, "来源");
  const target = addBucket(data, "目标");
  const entry = addEntryToBucket(data, source.id, {
    type: "folder",
    path: "资料",
    excludedPaths: ["资料/暂存"]
  });
  assert.ok(entry);

  const copied = copyEntryBetweenBuckets(data, source.id, entry.id, target.id);
  assert.ok(copied);
  assert.deepEqual(copied.excludedPaths, ["资料/暂存"]);
});

test("重命名文件夹时同步更新排除路径", () => {
  const data = createEmptyData();
  const bucket = addBucket(data, "重命名");
  const entry = addEntryToBucket(data, bucket.id, {
    type: "folder",
    path: "旧项目",
    excludedPaths: ["旧项目/忽略.md"]
  });
  assert.ok(entry);

  updatePathsAfterRename(data, "旧项目", "新项目", "folder");
  assert.deepEqual(entry.excludedPaths, ["新项目/忽略.md"]);
});
