import type { Setting } from "obsidian";
import { Platform } from "obsidian";
import type { BucketData } from "./model";
import { DEFAULT_ROW_HEIGHT, MAX_ROW_HEIGHT, MIN_ROW_HEIGHT } from "./model";
import { localize } from "./locale/ui";

export interface BucketSettingsHost {
  data: Pick<BucketData, "settings">;
  setShowSpaceNames(value: boolean): Promise<boolean>;
  setSidebarRowHeight(value: number): Promise<boolean>;
}

// Use only the old SDK's controls. The returned shape also implements the
// 1.13+ render-definition contract without importing new host runtime APIs.
export function bucketSettingRows(plugin: BucketSettingsHost) {
  return [
    {
      name: localize("显示 Space 名称"),
      desc: localize("默认只显示图标。Space 数量较少时，可同时显示图标和名称。"),
      render(setting: Pick<Setting, "addToggle" | "addSlider" | "addExtraButton">): void {
        setting.addToggle((toggle) => toggle
          .setValue(plugin.data.settings.showSpaceNames)
          .onChange((value) => {
            void plugin.setShowSpaceNames(value);
          }));
      }
    },
    {
      name: Platform.isMobile ? localize("桌面行高") : localize("侧栏行高"),
      desc: Platform.isMobile
        ? localize("仅调整桌面侧栏；移动端保持至少 44px 的点击区，因此这里的调整不会改变手机行高。")
        : localize`调整 Bucket、文件夹和笔记的每行高度。范围 ${MIN_ROW_HEIGHT}–${MAX_ROW_HEIGHT}px，默认 ${DEFAULT_ROW_HEIGHT}px。`,
      render(setting: Pick<Setting, "addToggle" | "addSlider" | "addExtraButton">): void {
        setting.addSlider((slider) => {
          slider
            .setLimits(MIN_ROW_HEIGHT, MAX_ROW_HEIGHT, 1)
            .setValue(plugin.data.settings.rowHeight)
            .setDynamicTooltip()
            .onChange((value) => {
              void plugin.setSidebarRowHeight(value);
            });
          setting.addExtraButton((button) => button
            .setIcon("reset")
            .setTooltip(localize("恢复默认行高"))
            .onClick(() => {
              // Update just this control: display() is the legacy path and
              // must not rebuild a modern settings-search result or steal focus.
              void plugin.setSidebarRowHeight(DEFAULT_ROW_HEIGHT).then(() => {
                slider.setValue(plugin.data.settings.rowHeight);
              });
            }));
        });
      }
    }
  ];
}
