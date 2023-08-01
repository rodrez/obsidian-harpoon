import { PluginSettingTab, App, Setting } from "obsidian";
import HarpoonPlugin from "./main";

export default class HarpoonSettingTab extends PluginSettingTab {
	plugin: HarpoonPlugin;

	constructor(app: App, plugin: HarpoonPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Harpoon Settings").setHeading();
	}
}
