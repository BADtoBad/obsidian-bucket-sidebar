import assert from "node:assert/strict";
import test from "node:test";
import { expandFolderAncestors } from "../src/folder-expansion";
import type { BucketEntry, Space } from "../src/model";

const folder = (path: string): BucketEntry => ({ id: path, type: "folder", path, expanded: false });
const space = (pinnedEntries: BucketEntry[], groups: BucketEntry[][] = []): Space => ({
  id: "work", name: "Work", icon: "briefcase", pinnedEntries,
  buckets: groups.map((entries, i) => ({ id: `group-${i}`, name: `Group ${i}`, collapsed: false, entries }))
});

test("creation reveals pinned references and every Bucket reference", () => {
  const refs = [folder("Work"), folder("Work"), folder("Work/Project")];
  const data = space([refs[0]], [[refs[1]], [], [refs[2]]]);
  expandFolderAncestors(data, "Work/Project/Notes");
  assert.ok(refs.every(entry => entry.expanded));
  assert.deepEqual(refs[0].expandedPaths, ["Work/Project/Notes", "Work/Project"]);
  assert.deepEqual(refs[1].expandedPaths, refs[0].expandedPaths);
  assert.deepEqual(refs[2].expandedPaths, ["Work/Project/Notes"]);
});

test("direct parent expands without adding the root as a nested path", () => {
  const ref = folder("Work");
  expandFolderAncestors(space([ref]), "Work");
  assert.equal(ref.expanded, true);
  assert.deepEqual(ref.expandedPaths, []);
});

test("existing expansions, exclusions, and ordering survive repeated calls", () => {
  const ref = { ...folder("Work"), expandedPaths: ["Work/Other", "Work/Project"], excludedPaths: ["Work/Private"] };
  const data = space([ref]);
  expandFolderAncestors(data, "Work/Project/Notes");
  expandFolderAncestors(data, "Work/Project/Notes");
  assert.deepEqual(ref.expandedPaths, ["Work/Other", "Work/Project", "Work/Project/Notes"]);
  assert.deepEqual(ref.excludedPaths, ["Work/Private"]);
});

test("files, descendants, sibling prefixes, and unrelated folders stay unchanged", () => {
  const refs: BucketEntry[] = [folder("Work/Project/Notes/Child"), folder("Work/Pro"), folder("Personal"),
    { id: "file", type: "file", path: "Work/Project" }];
  const data = space(refs);
  const before = JSON.stringify(data);
  expandFolderAncestors(data, "Work/Project/Notes");
  assert.equal(JSON.stringify(data), before);
});

test("only the captured Space changes, including non-ASCII folder names", () => {
  const current = space([folder("工作")]);
  const other = space([folder("工作")]);
  const before = JSON.stringify(other);
  expandFolderAncestors(current, "工作/项目/素材");
  assert.deepEqual(current.pinnedEntries[0].expandedPaths, ["工作/项目/素材", "工作/项目"]);
  assert.equal(JSON.stringify(other), before);
});

test("empty spaces have no references to expand", () => {
  const data = space([], [[], []]);
  const before = JSON.stringify(data);
  expandFolderAncestors(data, "Work");
  assert.equal(JSON.stringify(data), before);
});
