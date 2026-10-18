import { localize } from './locale/ui';
/** One visible child folder, never a nested path or an Obsidian hidden folder. */
export function validateFolderName(value: string): string | null {
  const name = value.trim();
  if (!name) return localize("请输入文件夹名称。");
  if (name.startsWith(".")) return localize("文件夹名称不能以点开头。");
  if (/[\\/:*?"<>|\u0000-\u001f\u007f]/.test(name)) {
    return localize("请输入单个文件夹名称，不能包含斜杠、冒号或其他无效字符。");
  }
  if (name.endsWith(".")) return localize("文件夹名称不能以点结尾。");
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
    return localize("此名称是系统保留名称，请换一个名称。");
  }
  return null;
}
