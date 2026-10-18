import assert from "node:assert/strict";
import test from "node:test";
import {
  createSelectionMarkers,
  exclusionsForRoot,
  isMarkerPartial,
  isMarkerSelected,
  selectedPlanRoots,
  toggleMarkerSelection
} from "../src/selection";

test("选择父文件夹会让所有后代继承选中", () => {
  const markers = createSelectionMarkers();
  toggleMarkerSelection("项目", markers);

  assert.equal(isMarkerSelected("项目", markers), true);
  assert.equal(isMarkerSelected("项目/资料/说明.md", markers), true);
  assert.deepEqual(selectedPlanRoots(markers), ["项目"]);
});

test("单独选择下级不会反向补选或半选上级", () => {
  const markers = createSelectionMarkers();
  toggleMarkerSelection("项目/资料/说明.md", markers);

  assert.equal(isMarkerSelected("项目", markers), false);
  assert.equal(isMarkerPartial("项目", markers), false);
  assert.equal(isMarkerSelected("项目/资料", markers), false);
  assert.equal(isMarkerPartial("项目/资料", markers), false);
  assert.equal(isMarkerSelected("项目/资料/说明.md", markers), true);
  assert.deepEqual(selectedPlanRoots(markers), ["项目/资料/说明.md"]);
});

test("可以从已选父文件夹中排除一个子树", () => {
  const markers = createSelectionMarkers();
  toggleMarkerSelection("项目", markers);
  toggleMarkerSelection("项目/草稿", markers);

  assert.equal(isMarkerSelected("项目/草稿", markers), false);
  assert.equal(isMarkerSelected("项目/草稿/临时.md", markers), false);
  assert.equal(isMarkerSelected("项目/正式/说明.md", markers), true);
  assert.equal(isMarkerPartial("项目", markers), true);
  assert.deepEqual(exclusionsForRoot("项目", markers), ["项目/草稿"]);
});

test("被排除的子树中可以单独重新加入更深层目标", () => {
  const markers = createSelectionMarkers();
  toggleMarkerSelection("项目", markers);
  toggleMarkerSelection("项目/草稿", markers);
  toggleMarkerSelection("项目/草稿/保留.md", markers);

  assert.equal(isMarkerSelected("项目/草稿/其他.md", markers), false);
  assert.equal(isMarkerSelected("项目/草稿/保留.md", markers), true);
  assert.deepEqual(selectedPlanRoots(markers), ["项目", "项目/草稿/保留.md"]);
});

test("再次选择被排除项会恢复父级继承而不产生冗余引用", () => {
  const markers = createSelectionMarkers();
  toggleMarkerSelection("项目", markers);
  toggleMarkerSelection("项目/草稿", markers);
  toggleMarkerSelection("项目/草稿", markers);

  assert.equal(isMarkerSelected("项目/草稿", markers), true);
  assert.deepEqual(selectedPlanRoots(markers), ["项目"]);
  assert.deepEqual(exclusionsForRoot("项目", markers), []);
});
