// TODOS: Will change the hookedfilse format to ctime, path, title.
// Thus, I need to figure out how to get the file based on that data
import { Notice, Plugin, TFile } from "obsidian";

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

interface HookedFiles {
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
				let file = this.getActiveFile();

				if (file) {
					this.addToHarpoon(file);
					new Notice(`File ${file.name} added to harpoon`);
					return;
				}

				new Notice(`There was no file to add.`);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HarpoonSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}
	async configFileExists(): Promise<TFile | null> {
		let file = this.app.vault.getAbstractFileByPath(this.CONFIG_FILE_NAME);
		if (!file) {
			try {
				file = await this.app.vault.create(
					this.CONFIG_FILE_NAME,
					JSON.stringify(this.hookedFiles)
				);
				new Notice(`Config file created`);
			} catch (error) {
				// new Notice(`Failed to create config: ${error.message}`);
				// File already exists
				return null;
			}
		}
		return file as TFile;
	}

	async addToHarpoon(file: TFile) {
		// const configFile = await this.configFileExists();
		const configFile = this.app.vault.getAbstractFileByPath(
			this.CONFIG_FILE_NAME
		);
		// this.CONFIG_FILE_NAME

		console.log("cfile", configFile);

		if (this.hookedFiles.length <= 4) {
			this.hookedFiles.push({
				ctime: file.stat.ctime,
				path: file.path,
				title: file.name,
			});
		}

		if (configFile) {
			console.log("YES", configFile);
			this.app.vault.modify(
				configFile as TFile,
				JSON.stringify(this.hookedFiles)
			);
		}
	}

	async loadHarpoonCache() {}

	// Open command
	openSelectedHook() {
		const hookedFile = this.getHookedFile();
		if (!hookedFile) {
			new Notice("There are no hooked files");
			return;
		}
		this.getLeaf().openFile(hookedFile);
	}

	// Helper funcs
	getLeaf() {
		return this.app.workspace.getLeaf();
	}
	getActiveFile() {
		return this.app.workspace.getActiveFile();
	}

	pathToFile(filepath: string) {
		const file = this.app.vault.getAbstractFileByPath(filepath);
		if (file instanceof TFile) return file;
		return null;
	}

	getHookedFile() {
		const hookedFiles = this.hookedFiles;
		for (const file of hookedFiles) {
			const hookedFile = this.pathToFile(file.path);
			if (hookedFile) return hookedFile;
		}
		return null;
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
	}

	async saveSettings() {
		const configFile = await this.configFileExists();
		if (configFile) {
			await this.app.vault.modify(
				configFile,
				JSON.stringify(this.settings)
			);
		} else {
			new Notice("Failed to save settings. Config file not found.");
		}
	}
}
