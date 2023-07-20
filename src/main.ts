// TODO: Cover the empty dict so it doesnt show undefined
import { Notice, Plugin, TAbstractFile, TFile } from "obsidian";

import HarpoonModal from "./harpoon_modal";
import HarpoonSettingTab from "./settings";

interface HarpoonSettings {
	fileOne: TFile | null;
	fileTwo: TFile | null;
	fileThree: TFile | null;
	fileFour: TFile | null;
}

const DEFAULT_SETTINGS: HarpoonSettings = {
	fileOne: null,
	fileTwo: null,
	fileThree: null,
	fileFour: null,
};

export interface HookedFiles {
	ctime: number;
	path: string;
	title: string;
}

export default class HarpoonPlugin extends Plugin {
	settings: HarpoonSettings;
	hookedFiles: HookedFiles[] = [];
	CONFIG_FILE_NAME = "harpoon-config.json";

	async onload() {
		await this.loadSettings();
		this.loadHarpoonCache();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Harpoon",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
			}
		);
		// // Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "harpoon-open",
			name: "Harpoon Open File List",
			callback: () => {
				new HarpoonModal(this.app, this.hookedFiles).open();
			},
		});
		this.addCommand({
			id: "harpoon-close",
			name: "Harpoon Close File List",
			callback: () => {
				new HarpoonModal(this.app, this.hookedFiles).open();
			},
		});
		this.addCommand({
			id: "harpoon-add",
			name: "Harpoon Add",
			callback: () => {
				const file = this.getActiveFile();

				if (file) {
					this.addToHarpoon(file);
					new Notice(`File ${file.name} added to harpoon`);
					return;
				}

				new Notice(`There was no file to add.`);
			},
		});

		this.addCommand({
			id: "harpoon-move-to-1",
			name: "Harpoon Go To File 1",
			callback: () => {
				this.onChooseItem(this.hookedFiles[0].path);
			},
		});
		this.addCommand({
			id: "harpoon-move-to-2",
			name: "Harpoon Go To File 2",
			callback: () => {
				this.onChooseItem(this.hookedFiles[1].path);
			},
		});
		this.addCommand({
			id: "harpoon-move-to-3",
			name: "Harpoon Go To File 3",
			callback: () => {
				this.onChooseItem(this.hookedFiles[2].path);
			},
		});
		this.addCommand({
			id: "harpoon-move-to-4",
			name: "Harpoon Go To File 4",
			callback: () => {
				this.onChooseItem(this.hookedFiles[3].path);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HarpoonSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "keydown", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	loadHarpoonCache(): void {
		try {
			this.app.vault.adapter
				.read(this.CONFIG_FILE_NAME)
				.then((content) => {
					this.hookedFiles = JSON.parse(content);
				})
				.catch((error) => {
					console.error("Failed to read from vault:", error);
				});
		} catch {
			this.writeHarpoonCache();
		}
	}
	writeHarpoonCache() {
		this.app.vault.adapter.write(
			this.CONFIG_FILE_NAME,
			JSON.stringify(this.hookedFiles)
		);
	}

	async addToHarpoon(file: TFile) {
		if (this.hookedFiles.length <= 4) {
			this.hookedFiles.push({
				ctime: file.stat.ctime,
				path: file.path,
				title: file.name,
			});
			this.writeHarpoonCache();
		}
	}

	// Open command

	// Helper funcs
	getActiveFile() {
		return this.app.workspace.getActiveFile();
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
	onChooseItem(item: string): void {
		const hookedFile = this.getHookedFile(item);
		this.getLeaf().openFile(hookedFile);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
	}

	async saveSettings() {
		// if (configFile) {
		// 	await this.app.vault.modify(JSON.stringify(this.settings));
		// } else {
		// 	new Notice("Failed to save settings. Config file not found.");
		// }
	}
}
