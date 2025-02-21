import { App, Modal } from "obsidian";
import { HookedFile } from "./types";
import { HarpoonUtils } from "./utils";
import HarpoonPlugin from "./main";
import { Direction, KeyCode } from "./enums";

export default class HarpoonModal extends Modal {
	hookedFiles: HookedFile[];
	hookedFileIdx = 0;
	writeToCache: (hFiles: HookedFile[]) => void;
	lastRemoved: HookedFile | null;
	lastKeyPressTime = 0;
	utils: HarpoonUtils;
	plugin: HarpoonPlugin;

	constructor(
		app: App,
		writeToCache: (hFiles: HookedFile[]) => void,
		utils: HarpoonUtils,
		plugin: HarpoonPlugin
	) {
		super(app);
		this.hookedFiles = utils.hookedFiles;
		this.writeToCache = writeToCache;
		this.utils = utils;
		this.plugin = plugin;
	}

	// Lifecycle methods
	onOpen() {
		this.utils.isOpen = true;
		this.setupUI();
		this.renderHookedFiles();
		
		// Add keydown event listener when modal opens
		this.modalEl.addEventListener("keydown", this.handleKeyDown.bind(this));
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
				cls: "hooked-file tree-item-self is-clickable nav-file-title",
			});

			// Create container for file path
			hookedEl.createEl("span", {
				text: `${idx + 1}. ${hookedFile.path}`,
				cls: "hooked-file-path"
			});

			// Create delete button
			const deleteBtn = hookedEl.createEl("span", {
				text: "×",
				cls: "hooked-file-delete"
			});

			deleteBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.removeFromHarpoon(idx);
			});

			hookedEl.dataset.id = `hooked-file-${idx}`;
			hookedEl.id = `hooked-file-${idx}`;
		});

		this.modalEl.addEventListener("keydown", (e) => {
			if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				this.removeFromHarpoon(this.hookedFileIdx);
			}
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

	handleKeyDown(evt: KeyboardEvent) {
		if (evt.ctrlKey && evt.shiftKey && evt.code === KeyCode.D) {
			this.close();
		} else if (evt.ctrlKey) {
			this.handleCtrlKeyCommands(evt);
		} else {
			this.handleRegularCommands(evt);
		}
	}

	handleCtrlKeyCommands(evt: KeyboardEvent) {
		switch (evt.code) {
			case KeyCode.H:
				this.handleSelection(0);
				break;
			case KeyCode.T:
				this.handleSelection(1);
				break;
			case KeyCode.N:
				this.handleSelection(2);
				break;
			case KeyCode.S:
				this.handleSelection(3);
				break;
		}
	}

	handleRegularCommands(evt: KeyboardEvent) {
		if (evt.key === this.plugin.settings.selectFileHotkey) {
			evt.preventDefault();
			this.handleSelection(this.hookedFileIdx);
			return;
		}

		let currentTime: number;

		switch (evt.code) {
			case KeyCode.D:
				currentTime = new Date().getTime();
				if (currentTime - this.lastKeyPressTime <= 500) {
					this.removeFromHarpoon(this.hookedFileIdx);
					break;
				}
				this.lastKeyPressTime = currentTime;
				break;
			case KeyCode.P:
				if (evt.shiftKey) {
					this.insertFileAt(this.hookedFileIdx);
				} else {
					this.insertFileAt(this.hookedFileIdx + 1);
				}
				break;
			case KeyCode.ArrowDown:
			case KeyCode.J:
				evt.preventDefault();
				if (this.hookedFileIdx === this.hookedFiles.length - 1) {
					this.resetSelection();
					this.highlightHookedFile(this.hookedFileIdx);
				} else {
					this.moveSelection(Direction.Down);
					this.highlightHookedFile(this.hookedFileIdx);
				}
				break;
			case KeyCode.ArrowUp:
			case KeyCode.K:
				evt.preventDefault();
				if (this.hookedFileIdx === 0) {
					this.resetSelection();
					this.highlightHookedFile(this.hookedFileIdx);
				} else {
					this.moveSelection(Direction.Up);
					this.highlightHookedFile(this.hookedFileIdx);
				}
				break;
			default:
				break;
		}
	}
}

