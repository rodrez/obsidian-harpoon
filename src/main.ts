import { Plugin, TFile, App, PluginManifest } from "obsidian";
import { Direction, KeyCode } from "./enums";
import { HarpoonSettings, HookedFile } from "./types";
import { HarpoonUtils } from "./utils";
import { CACHE_FILE } from "./constants";
import { HarpoonSettingTab } from "./settings";

import HarpoonModal from "./harpoon_modal";

const DEFAULT_SETTINGS: HarpoonSettings = {
	fileOne: null,
	fileTwo: null,
	fileThree: null,
	fileFour: null,
	selectFileHotkey: "Enter",
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

	async onload() {
		await this.loadSettings();
		this.loadHarpoonCache();
		this.registerCommands();
		this.registerDomEvents();
		this.addSettingTab(new HarpoonSettingTab(this.app, this));

		this.utils.editorIsLoaded();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
					this
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

	registerDomEvents() {
		this.registerDomEvent(
			document,
			"keydown",
			(evt: KeyboardEvent) => {
				const { modal } = this;
				if (!modal || !this.utils.isOpen) return;
				
				if (evt.ctrlKey && evt.shiftKey && evt.code === KeyCode.D) {
					modal.close();
				} else if (evt.ctrlKey) {
					modal.handleCtrlKeyCommands(evt);
				} else {
					modal.handleRegularCommands(evt);
				}
			}
		);
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
