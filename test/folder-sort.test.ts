import assert from "node:assert/strict";
import test from "node:test";
import { compareFolderChildren, parseCreatedDate, SortableChild } from "../src/folder-sort";
import { createEmptyData, getFolderSortOrder, normalizeData, setFolderSortOrder, updatePathsAfterRename } from "../src/model";

const note = (name: string, created?: unknown, ctime = 1): SortableChild => ({name, path:`Inbox/${name}`, folder:false, created, ctime});
const sorted = (rows: SortableChild[]) => [...rows].sort((a,b)=>compareFolderChildren(a,b,"created-desc")).map(x=>x.name);

test("有效日期、日期时间和时区；拒绝溢出与模糊值", () => {
  assert.equal(parseCreatedDate("2026-09-16"), new Date(2026,8,16).getTime());
  assert.equal(parseCreatedDate("2026-09-16T08:30:00+08:00"), Date.parse("2026-09-16T00:30:00Z"));
  assert.equal(parseCreatedDate("2024-02-29"), new Date(2024,1,29).getTime());
  for(const value of ["2026-02-29","2026-04-31","2026-13-01","2026-01-00","2026-09-16T24:00","2026-09-16T12:99","2026-09-16T12:30+99:00","yesterday",20260916,null,{},new Date(NaN)]) assert.equal(parseCreatedDate(value),null,String(value));
});

test("created 属性优先、同日文件时间倒序、缺失/无效值回退，mtime 不参与", () => {
  const rows=[note("老文章","2026-09-01",Date.parse("2026-10-01")),note("同日较早","2026-09-15",10),note("同日较晚","2026-09-15",20),note("无属性",undefined,Date.parse("2026-09-14")),note("无效日期","invalid",Date.parse("2026-09-13")),note("最新","2026-09-16",1)];
  assert.deepEqual(sorted(rows),["最新","同日较晚","同日较早","无属性","无效日期","老文章"]);
  assert.deepEqual(rows.map(x=>x.name),["老文章","同日较早","同日较晚","无属性","无效日期","最新"]);
});

test("文件夹固定在前且按名称，PDF 回退创建时间，同值稳定排序", () => {
  const rows=[note("C.md",undefined,30),{...note("B文件夹"),folder:true},{...note("A文件夹"),folder:true},note("B.pdf",undefined,30),note("A.md",undefined,NaN)];
  assert.deepEqual(sorted(rows),["A文件夹","B文件夹","B.pdf","C.md","A.md"]);
  assert(compareFolderChildren(note("A",undefined,1),note("B",undefined,100),"name-asc")<0);
});

test("旧配置不自动排序；精确路径继承，不误匹配相似前缀；可恢复名称或取消覆盖", () => {
  const data=createEmptyData();
  assert.equal(getFolderSortOrder(data.settings,"Inbox"),"name-asc");
  setFolderSortOrder(data.settings,"Inbox","created-desc");
  assert.equal(getFolderSortOrder(data.settings,"Inbox/Web Clip/子文件夹"),"created-desc");
  assert.equal(getFolderSortOrder(data.settings,"Inbox Other"),"name-asc");
  assert.equal(getFolderSortOrder(data.settings,"Work"),"name-asc");
  setFolderSortOrder(data.settings,"Inbox/Web Clip","name-asc");
  assert.equal(getFolderSortOrder(data.settings,"Inbox/Web Clip/子文件夹"),"name-asc");
  assert.equal(setFolderSortOrder(data.settings,"Inbox/Web Clip","name-asc"),false);
  setFolderSortOrder(data.settings,"Inbox/Web Clip","inherit");
  assert.equal(getFolderSortOrder(data.settings,"Inbox/Web Clip"),"created-desc");
  setFolderSortOrder(data.settings,"Inbox","inherit");
  assert.equal(data.settings.folderSortOrders,undefined);
});

test("配置保存重载、非法配置过滤、改文件名不改规则，改目录同步规则", () => {
  const data=normalizeData({settings:{folderSortOrders:{Inbox:"created-desc","Inbox/Sub":"name-asc",Work:"unknown","../private":"created-desc"}}});
  assert.deepEqual(data.settings.folderSortOrders,{Inbox:"created-desc","Inbox/Sub":"name-asc"});
  assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
  assert.equal(updatePathsAfterRename(data,"Inbox/foo.md","Inbox/短标题 — foo.md","file"),0);
  assert.equal(updatePathsAfterRename(data,"Inbox","Capture","folder"),2);
  assert.deepEqual(data.settings.folderSortOrders,{Capture:"created-desc","Capture/Sub":"name-asc"});
  assert.equal(getFolderSortOrder(data.settings,"Inbox"),"name-asc");
});
