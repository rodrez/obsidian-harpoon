import {
	Plugin,
	TFile,
	App,
	PluginManifest,
	Editor,
	EditorPosition,
	MarkdownView,
} from "obsidian";
import { Direction, KeyCode } from "./enums";
import { HarpoonSettings, HookedFile } from "./types";
import { HarpoonUtils } from "./utils";
import { CACHE_FILE } from "./constants";

import HarpoonModal from "./harpoon_modal";

// Default settings for the plugin
const DEFAULT_SETTINGS: HarpoonSettings = {
	fileOne: null,
	fileTwo: null,
	fileThree: null,
	fileFour: null,
};

// Main plugin class
export default class HarpoonPlugin extends Plugin {
	settings: HarpoonSettings;
	modal: HarpoonModal;
	utils: HarpoonUtils;
	isLoaded = false;

	// Constructor initializes the plugin with the app and manifest
	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.utils = new HarpoonUtils(app);
	}

	// Called when the plugin is loaded
	onload() {
		this.loadSettings();
		this.loadHarpoonCache();
		this.registerCommands();
		this.registerDomEvents();

		// Register event listener for file open
		this.registerEvent(
			this.app.workspace.on("file-open", (file) =>
				this.handleFileChange(file),
			),
		);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf?.view instanceof MarkdownView) {
					const file = leaf?.view.file;
					this.showInStatusBar("Wooo");
					if (file) {
						this.handleFileChange(file);
					}
				}
			}),
		);
		this.utils.editorIsLoaded();
	}

	// Load plugin settings
	loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
	}

	// Register plugin commands
	registerCommands() {
		// Command to open file list
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

		// Command to add current file to list
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

		// Commands to go to specific files in the list
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
					setTimeout(() => {
						this.utils.jumpToCursor();
					}, 100);
				},
			});
		}
	}

	// Handle file change event
	handleFileChange(newFile: TFile | null) {
		const activeLeaf = this.app.workspace.getLeaf();
		if (!activeLeaf) return;

		const oldFilePath = this.app.workspace.getLastOpenFiles()[1]; // Get the previously active file path
		const oldFile = oldFilePath
			? this.app.vault.getAbstractFileByPath(oldFilePath)
			: null;
		const oldEditor =
			activeLeaf.view instanceof Editor ? activeLeaf.view : null;

		// Save cursor position of the old file
		if (oldFile instanceof TFile && oldEditor) {
			const oldCursor = oldEditor.getCursor();
			this.updateHookedFileCursor(oldFile, oldCursor);
		}

		// Restore cursor position for the new file
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
						this.app.workspace.activeEditor?.editor?.scrollTo(
							savedCursor.ch,
							savedCursor.line,
						);
					}
				}
			});
		}
	}

	// Update cursor position for a hooked file
	updateHookedFileCursor(file: TFile, cursor: EditorPosition) {
		const hookedFile = this.utils.hookedFiles.find(
			(f) => f.path === file.path,
		);
		if (hookedFile) {
			hookedFile.cursor = cursor;
			this.writeHarpoonCache();
		}
	}

	// Get saved cursor position for a file
	getSavedCursor(file: TFile): EditorPosition | null | undefined {
		const hookedFile = this.utils.hookedFiles.find(
			(f) => f.path === file.path,
		);
		return hookedFile ? hookedFile.cursor : null;
	}

	// Register DOM events
	registerDomEvents() {
		this.registerDomEvent(
			document,
			"keydown",
			this.handleKeyDown.bind(this),
		);
	}

	// Handle keydown events
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

	// Handle Ctrl key combinations
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

	// Handle regular key commands
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

	// Load harpoon cache from file
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

	// Write harpoon cache to file
	writeHarpoonCache(hookedFiles: HookedFile[] | null = null) {
		this.app.vault.adapter.write(
			CACHE_FILE,
			JSON.stringify(this.utils.hookedFiles, null, 2),
		);

		if (hookedFiles) {
			this.utils.hookedFiles = hookedFiles;
		}
	}

	// Add a file to harpoon
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

	// Show message in status bar
	showInStatusBar(text: string, time = 5000) {
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(text);
		setTimeout(() => {
			statusBarItemEl.remove();
		}, time);
	}
}
