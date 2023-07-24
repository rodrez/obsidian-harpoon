import { App, TFile, Modal, MarkdownView, EditorPosition } from "obsidian";
import { HookedFile } from "./types";

export default class HarpoonModal extends Modal {
	hookedFiles: HookedFile[];
	hookedFileIdx: number = 0;
	writeToCache: (hFiles: HookedFile[]) => void;
	lastRemoved: HookedFile | null;
	isOpen: boolean = false;
	lastKeyPressTime: number = 0;

	constructor(
		app: App,
		hookedFiles: HookedFile[],
		writeToCache: (hFiles: HookedFile[]) => void
	) {
		super(app);
		this.hookedFiles = hookedFiles;
		this.writeToCache = writeToCache;
	}

	// Lifecycle methods
	onOpen() {
		this.isOpen = true;
		this.setupUI();
		this.renderHookedFiles();
	}

	onClose() {
		this.isOpen = false;
		this.contentEl.empty();
	}

	// UI helper methods
	setupUI() {
		this.titleEl.setText("Harpoon");
		this.titleEl.className = "inline-title";
		this.modalEl.tabIndex = 0;
	}

	renderHookedFiles() {
		this.contentEl.empty();

		if (!this.hookedFiles.length) {
			this.contentEl.createEl("p", { text: "No hooked files" });
			return;
		}

		this.hookedFiles.forEach((hookedFile, idx) => {
			const hookedEl = this.contentEl.createEl("div", {
				text: `${idx + 1}. ${hookedFile.path}`,
				cls: "hooked-file tree-item-self is-clickable nav-file-title",
			});
			hookedEl.dataset.id = `hooked-file-${idx}`;
			hookedEl.id = `hooked-file-${idx}`;
		});

		this.hookedFileIdx = 0;
		this.highlightHookedFile(0);
	}

	highlightHookedFile(idx: number) {
		const hookedElements = document.getElementsByClassName("hooked-file");
		Array.from(hookedElements).forEach((element: HTMLElement) => {
			element.classList.remove("is-active");
		});

		const hookedEl = document.getElementById(`hooked-file-${idx}`);
		hookedEl?.classList.add("is-active");
	}

	// Utility methods
	getLeaf() {
		return this.app.workspace.getLeaf();
	}

	getActiveFile() {
		return this.app.workspace.getActiveFile();
	}

	pathToFile(filepath: string): TFile | null {
		const file = this.app.vault.getAbstractFileByPath(filepath);
		return file instanceof TFile ? file : null;
	}

	getHookedFile(filepath: string): TFile {
		return this.pathToFile(filepath) as TFile;
	}

	getEditor() {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
	}

	setCursorPos(cursor: EditorPosition) {
		const editor = this.getEditor();
		editor?.setCursor(cursor);
	}

	// Action handlers
	handleSelection(index: number) {
		const isNotActive =
			this.getActiveFile()?.path !== this.hookedFiles[index].path;
		if (isNotActive) {
			const fileToOpen = this.getHookedFile(this.hookedFiles[index].path);
			this.setCursorPos(this.hookedFiles[index].cursor as EditorPosition);
			this.getLeaf().openFile(fileToOpen);
			this.close();
			return;
		}
		this.close();
	}

	removeFromHarpoon(idx: number) {
		if (idx >= 0 && idx < this.hookedFiles.length) {
			this.lastRemoved = this.hookedFiles.splice(idx, 1)[0];
			this.writeToCache(this.hookedFiles);
			this.renderHookedFiles();
		}
	}

	insertFileAt(pos: number) {
		if (
			this.lastRemoved &&
			!this.hookedFiles.includes(this.lastRemoved) &&
			this.hookedFiles.length <= 4
		) {
			this.hookedFiles.splice(pos, 0, this.lastRemoved);
			this.writeToCache(this.hookedFiles);
			this.renderHookedFiles();
		}
	}

	moveSelection(direction: number) {
		this.hookedFileIdx = Math.max(
			0,
			Math.min(this.hookedFileIdx + direction, 3)
		);
	}

	resetSelection() {
		this.hookedFileIdx =
			this.hookedFileIdx === 0 ? this.hookedFiles.length - 1 : 0;
	}
}
