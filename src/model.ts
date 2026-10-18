import { localize } from './locale/ui';
export type BucketTargetType = "file" | "folder";

export interface BucketEntry {
  id: string;
  type: BucketTargetType;
  path: string;
  label?: string;
  expanded?: boolean;
  expandedPaths?: string[];
  excludedPaths?: string[];
}

export interface Bucket {
  id: string;
  name: string;
  collapsed?: boolean;
  entries: BucketEntry[];
}

export interface Space {
  id: string;
  name: string;
  icon: string;
  buckets: Bucket[];
  pinnedEntries: BucketEntry[];
}

export type FolderSortOrder = "name-asc" | "created-desc";

export interface BucketSettings {
  rowHeight: number;
  showSpaceNames: boolean;
  folderSortOrders?: Record<string, FolderSortOrder>;
}

export const DEFAULT_ROW_HEIGHT = 32;
export const MIN_ROW_HEIGHT = 28;
export const MAX_ROW_HEIGHT = 40;
export const DEFAULT_SPACE_ID = "space-default";
export const DEFAULT_SPACE_NAME = localize("主空间");
export const DEFAULT_SPACE_ICON = "layers";

export interface BucketData {
  version: 2;
  spaces: Space[];
  activeSpaceId: string;
  settings: BucketSettings;
}

export interface BucketTarget {
  type: BucketTargetType;
  path: string;
  label?: string;
  excludedPaths?: string[];
}

let idCounter = 0;

export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function cleanVaultPath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

export function isSameOrDescendant(path: string, ancestor: string): boolean {
  return path === ancestor || path.startsWith(`${ancestor}/`);
}

export function normalizeDescendantPaths(parentPath: string, paths: string[] | undefined): string[] {
  const parent = cleanVaultPath(parentPath);
  if (!parent || !paths) return [];

  const candidates = Array.from(
    new Set(
      paths
        .map(cleanVaultPath)
        .filter((path) => path !== parent && path.startsWith(`${parent}/`))
    )
  ).sort((left, right) => left.split("/").length - right.split("/").length || left.localeCompare(right));

  return candidates.filter((path, index) =>
    !candidates.slice(0, index).some((ancestor) => isSameOrDescendant(path, ancestor))
  );
}

export function isPathExcluded(entry: BucketEntry, path: string): boolean {
  if (entry.type !== "folder") return false;
  const candidate = cleanVaultPath(path);
  return (entry.excludedPaths || []).some((excluded) => isSameOrDescendant(candidate, excluded));
}

export function createEmptyData(): BucketData {
  const space = createSpace(DEFAULT_SPACE_NAME, DEFAULT_SPACE_ICON, DEFAULT_SPACE_ID);
  return {
    version: 2,
    spaces: [space],
    activeSpaceId: space.id,
    settings: { rowHeight: DEFAULT_ROW_HEIGHT, showSpaceNames: false }
  };
}

export function normalizeRowHeight(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_ROW_HEIGHT;
  return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, Math.round(value)));
}

export function normalizeFolderSortOrders(value: unknown): Record<string, FolderSortOrder> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, FolderSortOrder> = {};
  for (const [raw, order] of Object.entries(value)) {
    const path = cleanVaultPath(raw);
    if (!path || path.split("/").some(part => [".", "..", "__proto__", "constructor", "prototype"].includes(part))) continue;
    if (order === "name-asc" || order === "created-desc") result[path] = order;
  }
  return Object.keys(result).length ? result : undefined;
}

export function getFolderSortOrder(settings: BucketSettings, folderPath: string): FolderSortOrder {
  let path = cleanVaultPath(folderPath);
  while (path) {
    const order = settings.folderSortOrders?.[path];
    if (order === "name-asc" || order === "created-desc") return order;
    path = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  }
  return "name-asc";
}

export function setFolderSortOrder(settings: BucketSettings, rawPath: string, order: FolderSortOrder | "inherit"): boolean {
  const path = cleanVaultPath(rawPath);
  if (!path) return false;
  const rules = { ...settings.folderSortOrders };
  const previous = rules[path];
  if (order === "inherit") delete rules[path];
  else rules[path] = order;
  const normalized = normalizeFolderSortOrders(rules);
  if (previous === normalized?.[path]) return false;
  if (normalized) settings.folderSortOrders = normalized;
  else delete settings.folderSortOrders;
  return true;
}

export function createBucket(name: string): Bucket {
  const cleanedName = name.trim();
  return {
    id: createId("bucket"),
    name: cleanedName || localize("未命名 Bucket"),
    collapsed: false,
    entries: []
  };
}

export function createSpace(name: string, icon = DEFAULT_SPACE_ICON, id?: string): Space {
  const cleanedName = name.trim();
  const cleanedIcon = icon.trim();
  return {
    id: id || createId("space"),
    name: cleanedName || localize("未命名 Space"),
    icon: cleanedIcon || DEFAULT_SPACE_ICON,
    buckets: [],
    pinnedEntries: []
  };
}

export function cloneData(data: BucketData): BucketData {
  return JSON.parse(JSON.stringify(data)) as BucketData;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeEntry(value: unknown): BucketEntry | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.type !== "file" && record.type !== "folder") return null;
  if (typeof record.path !== "string") return null;

  const path = cleanVaultPath(record.path);
  if (!path) return null;

  const expandedPaths = Array.isArray(record.expandedPaths)
    ? record.expandedPaths
        .filter((item): item is string => typeof item === "string")
        .map(cleanVaultPath)
        .filter(Boolean)
    : [];
  const rawExcludedPaths = Array.isArray(record.excludedPaths)
    ? record.excludedPaths.filter((item): item is string => typeof item === "string")
    : [];

  return {
    id: typeof record.id === "string" && record.id ? record.id : createId("entry"),
    type: record.type,
    path,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : undefined,
    expanded: record.expanded === true,
    expandedPaths,
    excludedPaths: record.type === "folder" ? normalizeDescendantPaths(path, rawExcludedPaths) : []
  };
}

function normalizeBucket(value: unknown): Bucket | null {
  const record = asRecord(value);
  if (!record) return null;
  const entries = Array.isArray(record.entries)
    ? record.entries.map(normalizeEntry).filter((entry): entry is BucketEntry => entry !== null)
    : [];

  return {
    id: typeof record.id === "string" && record.id ? record.id : createId("bucket"),
    name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : localize("未命名 Bucket"),
    collapsed: record.collapsed === true,
    entries
  };
}

function normalizePinnedEntries(value: unknown): BucketEntry[] {
  return Array.isArray(value)
    ? value
        .map(normalizeEntry)
        .filter((entry): entry is BucketEntry => entry !== null)
        .filter((entry, index, entries) =>
          entries.findIndex((candidate) => candidate.type === entry.type && candidate.path === entry.path) === index
        )
    : [];
}

function normalizeSpace(value: unknown): Space | null {
  const record = asRecord(value);
  if (!record) return null;
  const buckets = Array.isArray(record.buckets)
    ? record.buckets.map(normalizeBucket).filter((bucket): bucket is Bucket => bucket !== null)
    : [];
  return {
    id: typeof record.id === "string" && record.id ? record.id : createId("space"),
    name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : localize("未命名 Space"),
    icon: typeof record.icon === "string" && record.icon.trim() ? record.icon.trim() : DEFAULT_SPACE_ICON,
    buckets,
    pinnedEntries: normalizePinnedEntries(record.pinnedEntries)
  };
}

export function normalizeData(value: unknown): BucketData {
  const record = asRecord(value);
  let spaces = record && Array.isArray(record.spaces)
    ? record.spaces.map(normalizeSpace).filter((space): space is Space => space !== null)
    : [];

  if (spaces.length === 0) {
    const legacySpace = createSpace(DEFAULT_SPACE_NAME, DEFAULT_SPACE_ICON, DEFAULT_SPACE_ID);
    legacySpace.buckets = record && Array.isArray(record.buckets)
      ? record.buckets.map(normalizeBucket).filter((bucket): bucket is Bucket => bucket !== null)
      : [];
    legacySpace.pinnedEntries = normalizePinnedEntries(record?.pinnedEntries);
    spaces = [legacySpace];
  }

  const requestedActiveSpaceId = record && typeof record.activeSpaceId === "string"
    ? record.activeSpaceId
    : "";
  const activeSpaceId = spaces.some((space) => space.id === requestedActiveSpaceId)
    ? requestedActiveSpaceId
    : spaces[0].id;
  const rawSettings = record ? asRecord(record.settings) : null;
  return {
    version: 2,
    spaces,
    activeSpaceId,
    settings: {
      rowHeight: normalizeRowHeight(rawSettings?.rowHeight),
      showSpaceNames: rawSettings?.showSpaceNames === true,
      ...(normalizeFolderSortOrders(rawSettings?.folderSortOrders)
        ? { folderSortOrders: normalizeFolderSortOrders(rawSettings?.folderSortOrders) } : {})
    }
  };
}

export function findSpace(data: BucketData, spaceId: string): Space | undefined {
  return data.spaces.find((space) => space.id === spaceId);
}

export function getActiveSpace(data: BucketData): Space {
  const active = findSpace(data, data.activeSpaceId);
  if (active) return active;
  const fallback = data.spaces[0] || createSpace(DEFAULT_SPACE_NAME, DEFAULT_SPACE_ICON, DEFAULT_SPACE_ID);
  if (data.spaces.length === 0) data.spaces.push(fallback);
  data.activeSpaceId = fallback.id;
  return fallback;
}

export function setActiveSpace(data: BucketData, spaceId: string): boolean {
  if (data.activeSpaceId === spaceId || !findSpace(data, spaceId)) return false;
  data.activeSpaceId = spaceId;
  return true;
}

export function addSpace(data: BucketData, name: string, icon = DEFAULT_SPACE_ICON): Space | null {
  const cleanedName = name.trim();
  if (!cleanedName || data.spaces.some((space) => space.name === cleanedName)) return null;
  const space = createSpace(cleanedName, icon);
  data.spaces.push(space);
  data.activeSpaceId = space.id;
  return space;
}

export function renameSpace(data: BucketData, spaceId: string, name: string): boolean {
  const space = findSpace(data, spaceId);
  const cleanedName = name.trim();
  if (!space || !cleanedName || space.name === cleanedName) return false;
  if (data.spaces.some((candidate) => candidate.id !== spaceId && candidate.name === cleanedName)) return false;
  space.name = cleanedName;
  return true;
}

export function setSpaceIcon(data: BucketData, spaceId: string, icon: string): boolean {
  const space = findSpace(data, spaceId);
  const cleanedIcon = icon.trim();
  if (!space || !cleanedIcon || space.icon === cleanedIcon) return false;
  space.icon = cleanedIcon;
  return true;
}

export function removeSpace(data: BucketData, spaceId: string): boolean {
  if (data.spaces.length <= 1) return false;
  const index = data.spaces.findIndex((space) => space.id === spaceId);
  if (index < 0) return false;
  data.spaces.splice(index, 1);
  if (data.activeSpaceId === spaceId) {
    data.activeSpaceId = data.spaces[Math.min(index, data.spaces.length - 1)].id;
  }
  return true;
}

function findSpaceForBucket(data: BucketData, bucketId: string): Space | undefined {
  return data.spaces.find((space) => space.buckets.some((bucket) => bucket.id === bucketId));
}

export function findBucket(data: BucketData, bucketId: string): Bucket | undefined {
  const space = findSpaceForBucket(data, bucketId);
  return space ? space.buckets.find((bucket) => bucket.id === bucketId) : undefined;
}

export function addBucket(data: BucketData, name: string): Bucket {
  const bucket = createBucket(name);
  getActiveSpace(data).buckets.push(bucket);
  return bucket;
}

export function renameBucket(data: BucketData, bucketId: string, name: string): boolean {
  const bucket = findBucket(data, bucketId);
  const cleanedName = name.trim();
  if (!bucket || !cleanedName || bucket.name === cleanedName) return false;
  bucket.name = cleanedName;
  return true;
}

export function removeBucket(data: BucketData, bucketId: string): boolean {
  const space = findSpaceForBucket(data, bucketId);
  if (!space) return false;
  const index = space.buckets.findIndex((bucket) => bucket.id === bucketId);
  if (index < 0) return false;
  space.buckets.splice(index, 1);
  return true;
}

export function isTargetPinned(data: BucketData, type: BucketTargetType, rawPath: string): boolean {
  const path = cleanVaultPath(rawPath);
  return Boolean(path) && getActiveSpace(data).pinnedEntries.some(
    (entry) => entry.type === type && entry.path === path
  );
}

export function addPinnedEntry(data: BucketData, target: BucketTarget): BucketEntry | null {
  const path = cleanVaultPath(target.path);
  if (!path || isTargetPinned(data, target.type, path)) return null;

  const entry: BucketEntry = {
    id: createId("pin"),
    type: target.type,
    path,
    label: target.label && target.label.trim() ? target.label.trim() : undefined,
    expanded: false,
    expandedPaths: [],
    excludedPaths: []
  };
  getActiveSpace(data).pinnedEntries.push(entry);
  return entry;
}

export function removePinnedEntry(data: BucketData, type: BucketTargetType, rawPath: string): boolean {
  const path = cleanVaultPath(rawPath);
  const pinnedEntries = getActiveSpace(data).pinnedEntries;
  const index = pinnedEntries.findIndex((entry) => entry.type === type && entry.path === path);
  if (index < 0) return false;
  pinnedEntries.splice(index, 1);
  return true;
}

export function addEntryToBucket(
  data: BucketData,
  bucketId: string,
  target: BucketTarget,
  index?: number
): BucketEntry | null {
  const bucket = findBucket(data, bucketId);
  const path = cleanVaultPath(target.path);
  if (!bucket || !path) return null;

  const duplicate = bucket.entries.some((entry) => entry.type === target.type && entry.path === path);
  if (duplicate) return null;

  const entry: BucketEntry = {
    id: createId("entry"),
    type: target.type,
    path,
    label: target.label && target.label.trim() ? target.label.trim() : undefined,
    expanded: false,
    expandedPaths: [],
    excludedPaths: target.type === "folder" ? normalizeDescendantPaths(path, target.excludedPaths) : []
  };

  const insertionIndex = typeof index === "number"
    ? Math.max(0, Math.min(index, bucket.entries.length))
    : bucket.entries.length;
  bucket.entries.splice(insertionIndex, 0, entry);
  return entry;
}

export function removeEntryFromBucket(data: BucketData, bucketId: string, entryId: string): boolean {
  const bucket = findBucket(data, bucketId);
  if (!bucket) return false;
  const index = bucket.entries.findIndex((entry) => entry.id === entryId);
  if (index < 0) return false;
  bucket.entries.splice(index, 1);
  return true;
}

export function reorderEntry(
  data: BucketData,
  bucketId: string,
  entryId: string,
  targetIndex: number
): boolean {
  const bucket = findBucket(data, bucketId);
  if (!bucket) return false;
  const currentIndex = bucket.entries.findIndex((entry) => entry.id === entryId);
  if (currentIndex < 0) return false;

  const boundedTarget = Math.max(0, Math.min(targetIndex, bucket.entries.length));
  const adjustedTarget = currentIndex < boundedTarget ? boundedTarget - 1 : boundedTarget;
  if (currentIndex === adjustedTarget) return false;

  const removed = bucket.entries.splice(currentIndex, 1)[0];
  bucket.entries.splice(adjustedTarget, 0, removed);
  return true;
}

export function copyEntryBetweenBuckets(
  data: BucketData,
  sourceBucketId: string,
  entryId: string,
  targetBucketId: string,
  targetIndex?: number
): BucketEntry | null {
  const source = findBucket(data, sourceBucketId);
  const entry = source ? source.entries.find((candidate) => candidate.id === entryId) : undefined;
  if (!entry) return null;

  return addEntryToBucket(
    data,
    targetBucketId,
    { type: entry.type, path: entry.path, label: entry.label, excludedPaths: entry.excludedPaths },
    targetIndex
  );
}

function replacePath(path: string, oldPath: string, newPath: string, includeDescendants: boolean): string {
  if (path === oldPath) return newPath;
  if (includeDescendants && path.startsWith(`${oldPath}/`)) {
    return `${newPath}${path.slice(oldPath.length)}`;
  }
  return path;
}

export function updatePathsAfterRename(
  data: BucketData,
  oldRawPath: string,
  newRawPath: string,
  renamedType: BucketTargetType
): number {
  const oldPath = cleanVaultPath(oldRawPath);
  const newPath = cleanVaultPath(newRawPath);
  if (!oldPath || !newPath || oldPath === newPath) return 0;

  let changed = 0;
  const includeDescendants = renamedType === "folder";

  if (includeDescendants && data.settings.folderSortOrders) {
    const rules = { ...data.settings.folderSortOrders };
    for (const [path, order] of Object.entries(data.settings.folderSortOrders)) {
      const nextPath = replacePath(path, oldPath, newPath, true);
      if (nextPath === path) continue;
      delete rules[path];
      if (!Object.prototype.hasOwnProperty.call(rules, nextPath)) rules[nextPath] = order;
      changed += 1;
    }
    data.settings.folderSortOrders = rules;
  }

  const entryCollections: BucketEntry[][] = [];
  for (const space of data.spaces) {
    entryCollections.push(space.pinnedEntries);
    for (const bucket of space.buckets) entryCollections.push(bucket.entries);
  }

  for (const entries of entryCollections) {
    for (const entry of entries) {
      const nextPath = replacePath(entry.path, oldPath, newPath, includeDescendants);
      if (nextPath !== entry.path) {
        entry.path = nextPath;
        changed += 1;
      }

      if (entry.expandedPaths) {
        entry.expandedPaths = entry.expandedPaths.map((path) =>
          replacePath(path, oldPath, newPath, includeDescendants)
        );
      }

      if (entry.excludedPaths) {
        entry.excludedPaths = entry.excludedPaths.map((path) =>
          replacePath(path, oldPath, newPath, includeDescendants)
        );
      }
    }
  }

  return changed;
}
