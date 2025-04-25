import * as vscode from 'vscode';
import { searchMusic } from './searchMusic';
import { player } from './player';
import { controls } from './controls';
import { statusBar, youtubeLabelButton, stoppedState, playingState } from './statusBar';
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

	// Restore playback if there's a valid file path
	const lastPlayedFilePath = context.globalState.get<string>('lastPlayedFilePath');
	if (lastPlayedFilePath && fs.existsSync(lastPlayedFilePath)) {
		try {
			await player.load(lastPlayedFilePath);
			// Don't automatically play, just show the controls
			await playingState(context);
			// Pause the player immediately after loading
			await player.pause();
		} catch (error) {
			console.error("Error restoring playback:", error);
			await stoppedState(context);
		}
	}
}

export async function deactivate(context: vscode.ExtensionContext) {
	// to do : player should quit when all vscode windows are closed , temp workaround??
	// await context.globalState.update('youtubeLabelButton', "");
	// await stoppedState(context);
	await player.quit();
}
