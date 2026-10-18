import type { BucketEntry, Space } from "./model";

/** Reveal the creation location in every reference within the captured Space. */
export function expandFolderAncestors(space: Space, folderPath: string): void {
  const expand = (entries: BucketEntry[]): void => {
    for (const entry of entries) {
      if (entry.type !== "folder" || !(folderPath === entry.path || folderPath.startsWith(entry.path + "/"))) continue;
      entry.expanded = true;
      const paths = new Set(entry.expandedPaths || []);
      let ancestor = folderPath;
      while (ancestor !== entry.path) {
        paths.add(ancestor);
        ancestor = ancestor.slice(0, ancestor.lastIndexOf("/"));
      }
      entry.expandedPaths = [...paths];
    }
  };

  // Explicit iteration keeps this path inside the declared ES2018 API surface.
  expand(space.pinnedEntries);
  for (const bucket of space.buckets) expand(bucket.entries);
}
