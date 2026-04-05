import * as fs from "fs";
import * as vscode from 'vscode';
import { controls } from './controls';
import { player } from './player';
import { searchMusic } from './searchMusic';
import { registerMudeSidebar } from './sidebarView';
import { registerResetLocalPlayerState } from './resetLocalState';
import { playingState, statusBar, stoppedState } from './statusBar';

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

	// Restore persisted volume/mute state for the sidebar slider.
	const savedVolume = Math.max(0, Math.min(100, context.globalState.get<number>('currentVolumePercent', 70)));
	const savedMuted = context.globalState.get<boolean>('isMuted', false);
	await context.globalState.update('currentVolumePercent', savedVolume);
	await context.globalState.update('isMuted', savedMuted);
	try {
		await player.volume(savedVolume);
		await player.mute(savedMuted);
	} catch (error) {
		console.log('Failed to restore volume/mute state', error);
	}

	searchMusic(context);
	controls(context);
	statusBar(context);
	registerMudeSidebar(context);
	registerResetLocalPlayerState(context);

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
		if (lastPlayedFilePath && !fs.existsSync(lastPlayedFilePath)) {
			// Stale path (e.g. user removed cache) — clear so sidebar/status stay consistent
			await context.globalState.update('lastPlayedFilePath', undefined);
			await context.globalState.update('youtubeLabelButton', '');
			await context.globalState.update('currentTrackArtist', '');
			await context.globalState.update('currentTrackThumbnail', '');
			await context.globalState.update('currentTrackTimeSeconds', 0);
			await context.globalState.update('currentTrackDurationSeconds', 0);
			await context.globalState.update('recommendations', []);
			await context.globalState.update('currentRecommendationIndex', 0);
			await vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
			await vscode.commands.executeCommand('extension.refreshRecommendations');
		} else if (lastPlayedFilePath && fs.existsSync(lastPlayedFilePath)) {
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
