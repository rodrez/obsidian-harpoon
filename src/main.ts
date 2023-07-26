import { Plugin, TFile, Editor, EditorPosition, MarkdownView } from "obsidian";
import { Direction, KeyCode } from "./enums";

import HarpoonModal from "./harpoon_modal";
import { HarpoonSettings, HookedFile } from "./types";

const DEFAULT_SETTINGS: HarpoonSettings = {
	fileOne: null,
	fileTwo: null,
	fileThree: null,
	fileFour: null,
};

export default class HarpoonPlugin extends Plugin {
	settings: HarpoonSettings;
	hookedFiles: HookedFile[] = [];
	CONFIG_FILE_NAME = ".obsidian/harpoon-config.json";
	modal: HarpoonModal;

	async onload() {
		await this.loadSettings();
		this.loadHarpoonCache();
		this.registerCommands();
		this.registerDomEvents();
		this.jumpToCursor();
	}

	registerCommands() {
		this.addCommand({
			id: "harpoon-open",
			name: "Open file list",
			callback: () => {
				this.modal = new HarpoonModal(
					this.app,
					this.hookedFiles,
					(hFiles: HookedFile[]) => this.writeHarpoonCache(hFiles)
				);
				this.modal.open();
			},
		});
		this.addCommand({
			id: "harpoon-add",
			name: "Add file to list",
			callback: () => {
				const file = this.getActiveFile();

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
				id: `harpoon-go-to-${file.id}`,
				name: `${file.name}`,
				callback: () => {
					this.onChooseItem(this.hookedFiles[file.id - 1]);
					setTimeout(() => {
						this.jumpToCursor();
					}, 100);
				},
			});
		}
	}

	registerDomEvents() {
		this.registerDomEvent(
			document,
			"keydown",
			this.handleKeyDown.bind(this)
		);
	}

	handleKeyDown(evt: KeyboardEvent) {
		const { modal } = this;

		if (!modal || !modal.isOpen) return;

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
				if (modal.hookedFileIdx === this.hookedFiles.length - 1) {
					modal.resetSelection();
					modal.highlightHookedFile(modal.hookedFileIdx);
				} else {
					modal.moveSelection(Direction.Down);
					modal.highlightHookedFile(modal.hookedFileIdx);
				}
				break;
			case KeyCode.ArrowUp:
			case KeyCode.K:
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

	loadHarpoonCache(): void {
		this.app.vault.adapter
			.read(this.CONFIG_FILE_NAME)
			.then((content) => {
				this.hookedFiles = JSON.parse(content);
			})
			.catch(() => {
				this.writeHarpoonCache();
			});
	}

	// Updates the cache file and the hookedFiles
	writeHarpoonCache(hookedFiles: HookedFile[] | null = null) {
		this.app.vault.adapter.write(
			this.CONFIG_FILE_NAME,
			JSON.stringify(this.hookedFiles)
		);

		if (hookedFiles) {
			this.hookedFiles = hookedFiles;
		}
	}

	async updateFile(file: TFile) {
		return this.hookedFiles.map((f) => {
			if (f.path === file.path) {
				f.cursor = this.getCursorPos();
			}
		});
	}

	async addToHarpoon(file: TFile) {
		if (this.hookedFiles.length <= 4) {
			this.hookedFiles.push({
				ctime: file.stat.ctime,
				path: file.path,
				title: file.name,
				cursor: this.getCursorPos(),
			});
			this.writeHarpoonCache();
			this.showInStatusBar(`File ${file.name} added to harpoon`);
		}
	}

	// Helper funcs
	getActiveFile() {
		return this.app.workspace.getActiveFile();
	}
	getCursorPos() {
		const editor = this.getEditor();
		return editor && editor?.getCursor();
	}
	getEditor() {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
	}
	setCursorPos(cursor: EditorPosition) {
		const editor = this.getEditor();
		editor?.setCursor(cursor);
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
	onChooseItem(file: HookedFile): void {
		const hookedFile = this.getHookedFile(file.path);
		this.getLeaf().openFile(hookedFile);
		this.updateFile(this.getActiveFile() as TFile);
		this.jumpToCursor();
	}

	// Visual queues
	showInStatusBar(text: string, time: number = 5000) {
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(text);
		setTimeout(() => {
			statusBarItemEl.remove();
		}, time);
	}

	// Need to track the cursor positions of the hookedFiles before file change
	async jumpToCursor() {
		let activeFile: TFile | null = null;
		let attempts = 0;
		const maxAttempts = 10; // Set a reasonable limit to avoid an infinite loop.
		const delayMs = 200;

		while (!activeFile && attempts < maxAttempts) {
			activeFile = this.getActiveFile() as TFile;
			attempts++;
			if (!activeFile) {
				// Wait for 200 ms before the next attempt.
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		if (!activeFile) {
			console.log("Failed to get the active file.");
			return;
		}

		const file = this.hookedFiles.find((f) => f.path === activeFile?.path);

		if (!file) {
			console.log("Active file is not found in the hooked files.");
			return;
		}

		this.setCursorPos(file.cursor as EditorPosition);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
	}

	async saveSettings() {}
}
