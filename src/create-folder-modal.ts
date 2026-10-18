import { localize } from './locale/ui';
import { App, Modal } from "obsidian";

/** Stays open on validation/storage errors and prevents duplicate submissions. */
export class CreateFolderModal extends Modal {
  constructor(
    app: App,
    private readonly parentPath: string,
    private readonly createFolder: (name: string) => Promise<string | null>
  ) { super(app); }

  onOpen(): void {
    this.titleEl.textContent = localize("新建文件夹");
    this.modalEl.classList.add("bucket-create-folder-modal");
    const form = document.createElement("form");
    form.className = "bucket-text-form";
    const location = document.createElement("p");
    location.className = "bucket-folder-location";
    location.textContent = localize`创建位置：${this.parentPath}`;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "bucket-text-input";
    input.value = localize("未命名文件夹");
    input.setAttribute("aria-label", localize("文件夹名称"));
    const error = document.createElement("p");
    error.className = "bucket-folder-error";
    error.setAttribute("role", "alert");
    error.hidden = true;
    const clearError = () => {
      error.hidden = true;
      error.textContent = "";
      input.removeAttribute("aria-invalid");
      input.setCustomValidity("");
    };
    input.addEventListener("input", clearError);
    const actions = document.createElement("div");
    actions.className = "bucket-modal-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = localize("取消");
    cancel.addEventListener("click", () => this.close());
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "mod-cta";
    submit.textContent = localize("创建");
    let pending = false;
    // Inline errors own validation feedback; avoid a second browser tooltip.
    form.noValidate = true;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (pending) return;
      pending = true;
      clearError();
      input.disabled = submit.disabled = cancel.disabled = true;
      submit.textContent = localize("创建中…");
      form.setAttribute("aria-busy", "true");
      try {
        const message = await this.createFolder(input.value.trim());
        if (message === null) { this.close(); return; }
        error.textContent = message;
        error.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.setCustomValidity(message);
      } catch (cause) {
        console.error("Bucket Sidebar: folder dialog", cause);
        error.textContent = localize("操作未完成，请检查目标文件夹后重试。");
        error.hidden = false;
      } finally {
        pending = false;
        input.disabled = submit.disabled = cancel.disabled = false;
        submit.textContent = localize("创建");
        form.removeAttribute("aria-busy");
        if (input.isConnected) input.focus();
      }
    });
    actions.append(cancel, submit);
    form.append(location, input, error, actions);
    this.contentEl.replaceChildren(form);
    window.setTimeout(() => { if (input.isConnected) { input.focus(); input.select(); } }, 0);
  }

  onClose(): void { this.contentEl.replaceChildren(); }
}
