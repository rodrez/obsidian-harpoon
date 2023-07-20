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
		// .setDesc("It's a secret")
		// new Setting(containerEl).setName("First File").addText((text) =>
		// 	text
		// 		.setPlaceholder("File Path 1")
		// 		.setValue(this.plugin.settings.fileOne)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.fileOne = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
		// new Setting(containerEl).setName("Second File").addText((text) =>
		// 	text
		// 		.setPlaceholder("File Path 2")
		// 		.setValue(this.plugin.settings.fileTwo)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.fileTwo = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
		// new Setting(containerEl).setName("Third File").addText((text) =>
		// 	text
		// 		.setPlaceholder("File Path 3")
		// 		.setValue(this.plugin.settings.fileThree)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.fileThree = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
		// new Setting(containerEl).setName("Fourth File").addText((text) =>
		// 	text
		// 		.setPlaceholder("File Path 4")
		// 		.setValue(this.plugin.settings.fileFour)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.fileFour = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
	}
}
