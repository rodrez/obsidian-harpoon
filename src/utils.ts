import { App, EditorPosition, MarkdownView, TFile } from "obsidian";
import { MAX_ATTEMPTS, DELAY_MS } from "./constants";
import { HookedFile } from "./types";

export class HarpoonUtils {
	isOpen = false;
	hookedFiles: HookedFile[] = [];
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	onOpen() {
		this.isOpen = true;
	}

	onClose() {
		this.isOpen = false;
	}

	getLeaf() {
		return this.app.workspace.getLeaf();
	}
	getActiveFile() {
		return this.app.workspace.getActiveFile();
	}
	getEditor() {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
	}
	getHookedFile(filepath: string) {
		const hookedFile = this.pathToFile(filepath);
		return hookedFile as TFile;
	}
	getCursorPos() {
		const editor = this.getEditor();
		return editor && editor?.getCursor();
	}
	setCursorPos(cursor: EditorPosition) {
		const editor = this.getEditor();
		editor?.setCursor(cursor);
	}
	onChooseItem(file: HookedFile): void {
		const hookedFile = this.getHookedFile(file.path);
		this.getLeaf().openFile(hookedFile);
		this.updateFile(this.getActiveFile() as TFile);
		this.jumpToCursor();
	}
	pathToFile(filepath: string) {
		const file = this.app.vault.getAbstractFileByPath(filepath);
		if (file instanceof TFile) return file;
		return null;
	}

	// Cursor handling
	jumpToCursor() {
		let activeFile: TFile | null = null;
		let attempts = 0;

		while (!activeFile && attempts < MAX_ATTEMPTS) {
			activeFile = this.getActiveFile() as TFile;
			attempts++;
			if (!activeFile) {
				this.wait(DELAY_MS);
			}
		}

		if (!activeFile) {
			console.log("Failed to get the active file.");
			return;
		}

		const file = this.hookedFiles.find(
			(f: HookedFile) => f.path === activeFile?.path
		);

		if (!file) {
			console.log("Active file is not found in the hooked files.");
			return;
		}

		this.setCursorPos(file.cursor as EditorPosition);
	}

	async updateFile(file: TFile) {
		return this.hookedFiles.map((f: HookedFile) => {
			if (f.path === file.path) {
				f.cursor = this.getCursorPos();
			}
		});
	}

	async wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
