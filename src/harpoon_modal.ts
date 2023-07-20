import { App, TFile, Modal } from "obsidian";
import { Direction, KeyCode } from "./enums";
import { HookedFile } from "./types";

export default class HarpoonModal extends Modal {
	hookedFiles: HookedFile[];
	hookedFileIdx: number = 0;
	cb: (hFiles: HookedFile[]) => void;
	lastKeyPressTime = 0;
	lastRemoved: HookedFile | null;
	isOpen: boolean = false;

	constructor(
		app: App,
		hookedFiles: HookedFile[],
		cb: (hFiles: HookedFile[]) => void
	) {
		super(app);
		this.hookedFiles = hookedFiles;
		this.cb = cb;
	}

	onOpen() {
		this.isOpen = true;
		this.titleEl.setText("Harpoon");
		this.titleEl.className = "inline-title";
		this.modalEl.tabIndex = 0;

		if (!this.hookedFiles) {
			this.contentEl.createEl("p", {
				text: "No hooked files",
			});
		}

		// Renders the file paths
		this.renderHookedFiles();
	}

	renderHookedFiles() {
		// Clears the contents
		const { contentEl } = this;
		contentEl.empty();

		// Rerender contents
		for (const [idx, hookedFile] of this.hookedFiles.entries()) {
			const hookedEl = this.contentEl.createEl("div", {
				text: `${idx + 1}. ${hookedFile.path}`,
				cls: "hooked-file tree-item-self is-clickable nav-file-title",
			});
			hookedEl.dataset.id = `hooked-file-${idx}`;
			hookedEl.id = `hooked-file-${idx}`;
		}

		this.hookedFileIdx = 0;
		this.highlightHookedFile(0);
	}

	onClose() {
		this.isOpen = false;
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
	getActiveFile() {
		return this.app.workspace.getActiveFile();
	}
	getHookedFile(filepath: string) {
		const hookedFile = this.pathToFile(filepath);
		return hookedFile as TFile;
	}
	onChooseItem(item: string): void {}

	insertFileAt(pos: number) {
		// We want to keep the last removed file, but we
		// don't need duplicate files
		if (this.hookedFiles.indexOf(this.lastRemoved as HookedFile)) return;
		if (this.lastRemoved && this.hookedFiles.length <= 4) {
			this.hookedFiles.splice(pos, 0, this.lastRemoved as HookedFile);
			console.log(this.hookedFiles);
		}
		this.cb(this.hookedFiles);
		this.renderHookedFiles();
	}

	// Delete file at highlightedIdx from harpoon
	removeFromHarpoon(idx: number) {
		console.log("index to delete: ", idx);

		if (idx >= 0 && idx < this.hookedFiles.length) {
			this.lastRemoved = this.hookedFiles.splice(idx, 1)[0];
			this.cb(this.hookedFiles);
			this.renderHookedFiles();
		}
	}

	highlightHookedFile(idx: number) {
		const hookedElements = document.getElementsByClassName("hooked-file");
		for (let i = 0; i < hookedElements.length; i++) {
			const element = hookedElements[i];
			element.classList.remove("is-active");
		}

		const hookedEl = document.getElementById(`hooked-file-${idx}`);
		hookedEl?.classList.add("is-active");
	}

	handleSelection(index: number) {
		// If you are on the file itself just close the modal
		// TODO: Might want to ensure index are good
		const isNotActive =
			this.getActiveFile()?.path !== this.hookedFiles[index].path;

		// If isNotActive then we jump to file
		if (isNotActive) {
			const fileToOpen = this.getHookedFile(this.hookedFiles[index].path);
			this.getLeaf().openFile(fileToOpen);
			this.close();
			return;
		}
		this.close();
		return;
	}

	moveSelection(direction: number) {
		this.hookedFileIdx += direction;
		this.hookedFileIdx = Math.max(0, Math.min(this.hookedFileIdx, 3));
	}

	resetSelection() {
		if (this.hookedFileIdx === 0) {
			this.hookedFileIdx = this.hookedFiles.length - 1;
		} else if (this.hookedFileIdx === this.hookedFiles.length - 1) {
			this.hookedFileIdx = 0;
		}
	}
}
