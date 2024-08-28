import {
	Plugin,
	TFile,
	App,
	PluginManifest,
	Editor,
	EditorPosition,
} from "obsidian";
import { Direction, KeyCode } from "./enums";
import { HarpoonSettings, HookedFile } from "./types";
import { HarpoonUtils } from "./utils";
import { CACHE_FILE } from "./constants";

import HarpoonModal from "./harpoon_modal";

const DEFAULT_SETTINGS: HarpoonSettings = {
	fileOne: null,
	fileTwo: null,
	fileThree: null,
	fileFour: null,
};

export default class HarpoonPlugin extends Plugin {
	settings: HarpoonSettings;
	modal: HarpoonModal;
	utils: HarpoonUtils;
	isLoaded = false;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.utils = new HarpoonUtils(app);
	}

	onload() {
		this.loadSettings();
		this.loadHarpoonCache();
		this.registerCommands();
		this.registerDomEvents();

		this.registerEvent(
			this.app.workspace.on("file-open", (file) =>
				this.handleFileChange(file),
			),
		);
		this.utils.editorIsLoaded();
	}

	loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
	}

	registerCommands() {
		this.addCommand({
			id: "open",
			name: "Open file list",
			callback: () => {
				this.modal = new HarpoonModal(
					this.app,
					(hFiles: HookedFile[]) => this.writeHarpoonCache(hFiles),
					this.utils,
				);
				this.modal.open();
			},
		});
		this.addCommand({
			id: "add",
			name: "Add file to list",
			callback: () => {
				const file = this.utils.getActiveFile();

				if (file) {
					this.addToHarpoon(file);
					return;
				}
				this.showInStatusBar(`There was no file to add.`);
			},
		});

		const goToFiles = [
			{ id: 1, name: "Go To File 1" },
			{ id: 2, name: "Go To File 2" },
			{ id: 3, name: "Go To File 3" },
			{ id: 4, name: "Go To File 4" },
		];

		for (const file of goToFiles) {
			this.addCommand({
				id: `go-to-${file.id}`,
				name: `${file.name}`,
				callback: () => {
					this.utils.onChooseItem(
						this.utils.hookedFiles[file.id - 1],
					);
					// For some odd reason, possibly my lack knowledge, the
					// editor maybe loaded when the callback is called?. So I
					// have to wait a bit before jumping to the cursor.
					setTimeout(() => {
						this.utils.jumpToCursor();
					}, 100);
				},
			});
		}
	}

	handleFileChange(newFile: TFile | null) {
		const activeLeaf = this.app.workspace.getLeaf();
		if (!activeLeaf) return;

		const oldFilePath = this.app.workspace.getLastOpenFiles()[1]; // Get the previously active file path
		const oldFile = oldFilePath
			? this.app.vault.getAbstractFileByPath(oldFilePath)
			: null;
		const oldEditor =
			activeLeaf.view instanceof Editor ? activeLeaf.view : null;

		if (oldFile instanceof TFile && oldEditor) {
			const oldCursor = oldEditor.getCursor();
			this.updateHookedFileCursor(oldFile, oldCursor);
		}

		if (newFile) {
			this.utils.editorIsLoaded(() => {
				const newLeaf = this.app.workspace.getLeaf();
				if (!newLeaf) return;

				const newEditor =
					newLeaf.view instanceof Editor ? newLeaf.view : null;
				if (newEditor) {
					const savedCursor = this.getSavedCursor(newFile);
					if (savedCursor) {
						newEditor.setCursor(savedCursor);
						this.scrollToCursor(newEditor, savedCursor);
					}
				}
			});
		}
	}

	updateHookedFileCursor(file: TFile, cursor: EditorPosition) {
		const hookedFile = this.utils.hookedFiles.find(
			(f) => f.path === file.path,
		);
		if (hookedFile) {
			hookedFile.cursor = cursor;
			this.writeHarpoonCache();
		}
	}

	getSavedCursor(file: TFile): EditorPosition | null {
		const hookedFile = this.utils.hookedFiles.find(
			(f) => f.path === file.path,
		);
		return hookedFile ? hookedFile.cursor : null;
	}

	scrollToCursor(editor: Editor, cursor: EditorPosition) {
		// Get the current scroll position
		const currentScroll = editor.getScrollInfo();

		// Get the coordinates of the cursor relative to the editor
		const cursorCoords = editor.coordsAtPos(editor.posToOffset(cursor));

		if (cursorCoords) {
			// Check if the cursor is outside the visible area
			if (
				cursorCoords.top < currentScroll.top ||
				cursorCoords.bottom > currentScroll.top + currentScroll.height
			) {
				// Scroll to center the cursor
				editor.scrollTo(
					null,
					cursorCoords.top - currentScroll.height / 2,
				);
			}
		}
	}
	registerDomEvents() {
		this.registerDomEvent(
			document,
			"keydown",
			this.handleKeyDown.bind(this),
		);
	}

	handleKeyDown(evt: KeyboardEvent) {
		const { modal } = this;

		if (!modal || !this.utils.isOpen) return;

		if (evt.ctrlKey && evt.shiftKey && evt.code === KeyCode.D) {
			modal.close();
		} else if (evt.ctrlKey) {
			this.handleCtrlKeyCommands(evt);
		} else {
			this.handleRegularCommands(evt);
		}
	}

	handleCtrlKeyCommands(evt: KeyboardEvent) {
		const { modal } = this;
		switch (evt.code) {
			case KeyCode.H:
				modal.handleSelection(0);
				break;
			case KeyCode.T:
				modal.handleSelection(1);
				break;
			case KeyCode.N:
				modal.handleSelection(2);
				break;
			case KeyCode.S:
				modal.handleSelection(3);
				break;
		}
	}

	handleRegularCommands(evt: KeyboardEvent) {
		const { modal } = this;
		switch (evt.code) {
			case KeyCode.Enter:
				evt.preventDefault();
				modal.handleSelection(modal.hookedFileIdx);
				break;

			case KeyCode.D:
				const currentTime = new Date().getTime();
				if (currentTime - modal.lastKeyPressTime <= 500) {
					modal.removeFromHarpoon(modal.hookedFileIdx);
					break;
				}
				modal.lastKeyPressTime = currentTime;
				break;
			case KeyCode.P:
				if (evt.shiftKey) {
					modal.insertFileAt(modal.hookedFileIdx);
				} else {
					modal.insertFileAt(modal.hookedFileIdx + 1);
				}
				break;
			case KeyCode.ArrowDown:
			case KeyCode.J:
				evt.preventDefault();
				if (modal.hookedFileIdx === this.utils.hookedFiles.length - 1) {
					modal.resetSelection();
					modal.highlightHookedFile(modal.hookedFileIdx);
				} else {
					modal.moveSelection(Direction.Down);
					modal.highlightHookedFile(modal.hookedFileIdx);
				}
				break;
			case KeyCode.ArrowUp:
			case KeyCode.K:
				evt.preventDefault();
				if (modal.hookedFileIdx === 0) {
					modal.resetSelection();
					modal.highlightHookedFile(modal.hookedFileIdx);
				} else {
					modal.moveSelection(Direction.Up);
					modal.highlightHookedFile(modal.hookedFileIdx);
				}
				break;
			default:
				break;
		}
	}

	loadHarpoonCache() {
		console.log("Loading file");
		this.app.vault.adapter
			.read(CACHE_FILE)
			.then((content) => {
				console.log("Loaded file");
				this.utils.hookedFiles = JSON.parse(content);
			})
			.catch(() => {
				console.log("No file found, building...");
				this.writeHarpoonCache();
			});
	}

	// Updates the cache file and the hookedFiles
	writeHarpoonCache(hookedFiles: HookedFile[] | null = null) {
		this.app.vault.adapter.write(
			CACHE_FILE,
			JSON.stringify(this.utils.hookedFiles, null, 2),
		);

		if (hookedFiles) {
			this.utils.hookedFiles = hookedFiles;
		}
	}

	async addToHarpoon(file: TFile) {
		// If the file is already hooked, ignore it
		if (this.utils.hookedFiles.some((f) => f.path === file.path)) {
			return;
		}

		if (this.utils.hookedFiles.length <= 4) {
			this.utils.hookedFiles.push({
				ctime: file.stat.ctime,
				path: file.path,
				title: file.name,
				cursor: this.utils.getCursorPos(),
			});
			this.writeHarpoonCache();
			this.showInStatusBar(`File ${file.name} added to harpoon`);
		}
	}

	// Visual queues
	showInStatusBar(text: string, time = 5000) {
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(text);
		setTimeout(() => {
			statusBarItemEl.remove();
		}, time);
	}
}
