import { App, PluginSettingTab, Setting } from "obsidian";
import HarpoonPlugin from "./main";

export class HarpoonSettingTab extends PluginSettingTab {
	plugin: HarpoonPlugin;

	constructor(app: App, plugin: HarpoonPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Harpoon Settings" });

		new Setting(containerEl)
			.setName("Select File Hotkey")
			.setDesc("The key to press to select the currently highlighted file in the modal (e.g. Enter, Space)")
			.addText(text => text
				.setPlaceholder("Enter")
				.setValue(this.plugin.settings.selectFileHotkey)
				.onChange(async (value) => {
					this.plugin.settings.selectFileHotkey = value;
					await this.plugin.saveSettings();
				}));
	}
} 