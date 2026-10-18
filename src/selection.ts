import { cleanVaultPath, isSameOrDescendant } from "./model";

export interface SelectionMarkers {
  selected: Set<string>;
  excluded: Set<string>;
}

function depth(path: string): number {
  return path.split("/").length;
}

function strictAncestor(candidate: string, path: string): boolean {
  return candidate !== path && isSameOrDescendant(path, candidate);
}

function clearAtOrBelow(markers: Set<string>, path: string): void {
  for (const candidate of Array.from(markers)) {
    if (isSameOrDescendant(candidate, path)) markers.delete(candidate);
  }
}

function nearestMarker(path: string, markers: SelectionMarkers): "selected" | "excluded" | null {
  let nearestPath = "";
  let nearestKind: "selected" | "excluded" | null = null;

  for (const candidate of markers.selected) {
    if (isSameOrDescendant(path, candidate) && candidate.length > nearestPath.length) {
      nearestPath = candidate;
      nearestKind = "selected";
    }
  }
  for (const candidate of markers.excluded) {
    if (isSameOrDescendant(path, candidate) && candidate.length > nearestPath.length) {
      nearestPath = candidate;
      nearestKind = "excluded";
    }
  }
  return nearestKind;
}

export function createSelectionMarkers(): SelectionMarkers {
  return { selected: new Set<string>(), excluded: new Set<string>() };
}

export function isMarkerSelected(rawPath: string, markers: SelectionMarkers): boolean {
  const path = cleanVaultPath(rawPath);
  return path ? nearestMarker(path, markers) === "selected" : false;
}

export function toggleMarkerSelection(rawPath: string, markers: SelectionMarkers): void {
  const path = cleanVaultPath(rawPath);
  if (!path) return;
  const wasSelected = isMarkerSelected(path, markers);

  clearAtOrBelow(markers.selected, path);
  clearAtOrBelow(markers.excluded, path);

  if (wasSelected) {
    const inheritedFromParent = Array.from(markers.selected).some((candidate) => strictAncestor(candidate, path)) &&
      nearestMarker(path, markers) === "selected";
    if (inheritedFromParent) markers.excluded.add(path);
    return;
  }

  if (!isMarkerSelected(path, markers)) markers.selected.add(path);
}

export function isMarkerPartial(rawPath: string, markers: SelectionMarkers): boolean {
  const path = cleanVaultPath(rawPath);
  if (!path) return false;
  if (!isMarkerSelected(path, markers)) return false;
  return Array.from(markers.excluded).some((candidate) => strictAncestor(path, candidate));
}

export function selectedPlanRoots(markers: SelectionMarkers): string[] {
  const selected = Array.from(markers.selected).sort(
    (left, right) => depth(left) - depth(right) || left.localeCompare(right)
  );
  const roots: string[] = [];

  for (const path of selected) {
    const coveringRoot = roots.find((root) => strictAncestor(root, path));
    if (!coveringRoot) {
      roots.push(path);
      continue;
    }

    const crossesExclusion = Array.from(markers.excluded).some(
      (excluded) => strictAncestor(coveringRoot, excluded) && isSameOrDescendant(path, excluded)
    );
    if (crossesExclusion) roots.push(path);
  }
  return roots;
}

export function exclusionsForRoot(root: string, markers: SelectionMarkers): string[] {
  return Array.from(markers.excluded)
    .filter((path) => strictAncestor(root, path))
    .sort((left, right) => depth(left) - depth(right) || left.localeCompare(right))
    .filter((path, index, paths) =>
      !paths.slice(0, index).some((ancestor) => isSameOrDescendant(path, ancestor))
    );
}
