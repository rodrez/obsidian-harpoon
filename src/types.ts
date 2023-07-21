import { EditorPosition, TFile } from "obsidian";

export type HarpoonSettings = {
	fileOne: TFile | null;
	fileTwo: TFile | null;
	fileThree: TFile | null;
	fileFour: TFile | null;
};

export type HookedFile = {
	ctime: number;
	path: string;
	title: string;
	cursor: EditorPosition | undefined;
	selection: any;
};
