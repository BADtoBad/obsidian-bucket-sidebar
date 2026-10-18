import type { FolderSortOrder } from "./model";

export interface SortableChild {
  name: string;
  path: string;
  folder: boolean;
  ctime?: number;
  created?: unknown;
}

// Only accept actual dates/ISO dates, not locale-dependent strings or YAML numbers.
export function parseCreatedDate(value: unknown): number | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zone] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const calendar = new Date(Date.UTC(y, m - 1, d));
  if (y < 1000 || calendar.getUTCFullYear() !== y || calendar.getUTCMonth() !== m - 1 || calendar.getUTCDate() !== d) return null;
  if (Number(hour || 0) > 23 || Number(minute || 0) > 59 || Number(second || 0) > 59) return null;
  if (zone && zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) return null;
  const timestamp = hour === undefined ? new Date(y, m - 1, d).getTime() : Date.parse(value.trim().replace(" ", "T"));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function fileCreated(child: SortableChild): number {
  return typeof child.ctime === "number" && Number.isFinite(child.ctime) && child.ctime > 0 ? child.ctime : 0;
}

export function compareFolderChildren(left: SortableChild, right: SortableChild, order: FolderSortOrder): number {
  if (left.folder !== right.folder) return left.folder ? -1 : 1;
  if (!left.folder && order === "created-desc") {
    const leftTime = parseCreatedDate(left.created) ?? fileCreated(left);
    const rightTime = parseCreatedDate(right.created) ?? fileCreated(right);
    if (leftTime !== rightTime) return rightTime - leftTime;
    const tie = fileCreated(right) - fileCreated(left);
    if (tie) return tie;
  }
  return left.name.localeCompare(right.name) || left.path.localeCompare(right.path);
}
