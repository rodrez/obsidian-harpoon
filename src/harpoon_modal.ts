import { App, TFile, Modal } from "obsidian";
import { HookedFiles } from "./main";

export default class HarpoonModal extends Modal {
	hookedFiles: HookedFiles[];
	constructor(app: App, hookedFiles: HookedFiles[]) {
		super(app);
		this.hookedFiles = hookedFiles;
	}

	onOpen() {
		this.titleEl.setText("Harpoon");
		this.modalEl.tabIndex = 0;
		global.window.addEventListener("keydown", (event) => {
			// Close the modal
			if (event.ctrlKey && event.shiftKey && event.key === "D") {
				this.close();
			}
			if (event.ctrlKey && event.key === "h") {
				if (this.hookedFiles.length >= 1) {
					this.onChooseItem(this.hookedFiles[0].path, event);
					this.close();
				}
			}
			if (event.ctrlKey && event.key === "t") {
				if (this.hookedFiles.length >= 2) {
					this.onChooseItem(this.hookedFiles[1].path, event);
					this.close();
				}
			}
			if (event.ctrlKey && event.key === "n") {
				if (this.hookedFiles.length >= 3) {
					this.onChooseItem(this.hookedFiles[2].path, event);
					this.close();
				}
			}
			if (event.ctrlKey && event.key === "s") {
				if (this.hookedFiles.length >= 4) {
					this.onChooseItem(this.hookedFiles[3].path, event);
					this.close();
				}
			}
		});

		if (!this.hookedFiles) {
			this.contentEl.createEl("p", { text: "No hooked files" });
		}
		for (const [idx, hookedFile] of this.hookedFiles.entries()) {
			this.contentEl.createEl("p", {
				text: `${idx + 1}. ${hookedFile.path}`,
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		global.window.removeEventListener("keydown", () => {});
	}

	getItems(): string[] {
		return this.hookedFiles.map((f) => f.path);
	}
	getItemText(item: string): string {
		return item;
	}
	pathToFile(filepath: string) {
		const file = this.app.vault.getAbstractFileByPath(filepath);
		if (file instanceof TFile) return file;
		return null;
	}
	getLeaf() {
		return this.app.workspace.getLeaf();
	}
	getHookedFile(filepath: string) {
		const hookedFile = this.pathToFile(filepath);
		return hookedFile as TFile;
	}
	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		const hookedFile = this.getHookedFile(item);
		this.getLeaf().openFile(hookedFile);
	}
}
