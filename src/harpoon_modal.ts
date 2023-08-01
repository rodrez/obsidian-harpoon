import { App, Modal } from "obsidian";
import { HookedFile } from "./types";
import { HarpoonUtils } from "./utils";

export default class HarpoonModal extends Modal {
	hookedFiles: HookedFile[];
	hookedFileIdx = 0;
	writeToCache: (hFiles: HookedFile[]) => void;
	lastRemoved: HookedFile | null;
	lastKeyPressTime = 0;
	utils: HarpoonUtils;

	constructor(
		app: App,
		writeToCache: (hFiles: HookedFile[]) => void,
		utils: HarpoonUtils
	) {
		super(app);
		this.hookedFiles = utils.hookedFiles;
		this.writeToCache = writeToCache;
		this.utils = utils;
	}

	// Lifecycle methods
	onOpen() {
		this.utils.isOpen = true;
		this.setupUI();
		this.renderHookedFiles();
	}

	onClose() {
		this.utils.isOpen = false;
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

	// Action handlers
	handleSelection(index: number) {
		const isNotActive =
			this.utils.getActiveFile()?.path !== this.hookedFiles[index].path;
		if (isNotActive) {
			const fileToOpen = this.utils.getHookedFile(
				this.hookedFiles[index].path
			);
			this.utils.getLeaf().openFile(fileToOpen);
			this.utils.jumpToCursor();
			// Wait until isLoaded becomes true
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
