import { Plugin, TFile, App, PluginManifest } from "obsidian";
import { Direction, KeyCode } from "./enums";

import HarpoonModal from "./harpoon_modal";
import { HarpoonSettings, HookedFile } from "./types";
import { HarpoonUtils } from "./utils";

const DEFAULT_SETTINGS: HarpoonSettings = {
	fileOne: null,
	fileTwo: null,
	fileThree: null,
	fileFour: null,
};

export default class HarpoonPlugin extends Plugin {
	settings: HarpoonSettings;
	CONFIG_FILE_NAME = "harpoon-config.json";
	modal: HarpoonModal;
	utils: HarpoonUtils;
	isLoaded: boolean = false;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.utils = new HarpoonUtils(app);
	}

	onload() {
		this.loadSettings();
		this.loadHarpoonCache();
		this.registerCommands();
		this.registerDomEvents();
		this.isLoaded = true;

		if (this.isLoaded) {
			this.utils.jumpToCursor;
		}
	}

	loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
	}

	registerCommands() {
		this.addCommand({
			id: "harpoon-open",
			name: "Open file list",
			callback: () => {
				this.modal = new HarpoonModal(
					this.app,
					this.utils.hookedFiles,
					(hFiles: HookedFile[]) => this.writeHarpoonCache(hFiles)
				);
				this.modal.open();
			},
		});
		this.addCommand({
			id: "harpoon-add",
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
				id: `harpoon-go-to-${file.id}`,
				name: `${file.name}`,
				callback: () => {
					this.utils.onChooseItem(
						this.utils.hookedFiles[file.id - 1]
					);
					setTimeout(() => {
						this.utils.jumpToCursor();
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
				this.utils.hookedFiles = JSON.parse(content);
			})
			.catch(() => {
				this.writeHarpoonCache();
			});
	}

	// Updates the cache file and the hookedFiles
	writeHarpoonCache(hookedFiles: HookedFile[] | null = null) {
		this.app.vault.adapter.write(
			this.CONFIG_FILE_NAME,
			JSON.stringify(this.utils.hookedFiles)
		);

		if (hookedFiles) {
			this.utils.hookedFiles = hookedFiles;
		}
	}

	async addToHarpoon(file: TFile) {
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
	showInStatusBar(text: string, time: number = 5000) {
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(text);
		setTimeout(() => {
			statusBarItemEl.remove();
		}, time);
	}
}
