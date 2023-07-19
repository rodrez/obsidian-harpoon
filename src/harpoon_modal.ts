import { App, FuzzySuggestModal, TFile } from "obsidian";

export default class HarpoonModal extends FuzzySuggestModal<string> {
	hookedFiles: TFile[];
	constructor(app: App, hookedFiles: TFile[]) {
		super(app);
		this.hookedFiles = hookedFiles;
	}

	onOpen() {
		this.titleEl.setText("Harpoon");
		if (!this.hookedFiles) {
			this.contentEl.createEl("p", { text: "No hooked files" });
		}
		for (const hookedFile of this.hookedFiles) {
			this.contentEl.createEl("p", { text: hookedFile.path });
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	getItems(): string[] {
		return this.hookedFiles.map((f) => f.path);
	}
	getItemText(item: string): string {
		return item;
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
	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		console.log(evt);

		const hookedFile = this.getHookedFile(item);
		this.getLeaf().openFile(hookedFile);
	}
}
