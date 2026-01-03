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

	// Check if MPV is already playing something
	let hasMedia = false;
	try {
		const mediaTitle = await player.getProperty('media-title');
		hasMedia = !!mediaTitle;
	} catch (error) {
		// Property unavailable means no media is loaded, which is fine
		console.log("No media currently loaded in MPV");
		hasMedia = false;
	}
	
	// If no media is playing, try to restore the last played file
	if (!hasMedia) {
		const lastPlayedFilePath = context.globalState.get<string>('lastPlayedFilePath');
		if (lastPlayedFilePath && fs.existsSync(lastPlayedFilePath)) {
			try {
				await player.load(lastPlayedFilePath);
				await playingState(context);
				// When restoring after restart, start paused
				await player.pause();
			} catch (error) {
				console.error("Error restoring playback:", error);
				await stoppedState(context);
			}
		} else {
			// No media and nothing to restore, set to stopped state
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
