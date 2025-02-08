import * as vscode from 'vscode';
import { searchMusic } from './searchMusic';
import { player } from './player';
import { controls } from './controls';
import { statusBar, youtubeLabelButton, stoppedState } from './statusBar';
import * as fs from "fs";

export async function activate(context: vscode.ExtensionContext) {
	if (!fs.existsSync(context.globalStorageUri.fsPath)) {
		fs.mkdirSync(context.globalStorageUri.fsPath);
	}
	try {
		await player.start();
	} catch (error) {
		console.log(error);
		vscode.window.showErrorMessage("Failed to find MPV on your system!", {
			modal: true,
			detail: "Make sure MPV is installed and is on your PATH.",
		});
		return;
	}
	searchMusic(context);
	controls(context);
	statusBar(context);
}

export async function deactivate(context: vscode.ExtensionContext) {
	// to do : player should quit when all vscode windows are closed , temp workaround??
	// await context.globalState.update('youtubeLabelButton', "");
	// await stoppedState(context);
	await player.quit();
}
