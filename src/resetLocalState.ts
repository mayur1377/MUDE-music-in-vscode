import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { player } from './player';
import { resetRecommendations, updateRecommendationIndex } from './recommendations';
import { refreshMudeSidebar } from './sidebarView';
import { stoppedState, togglePauseButton, youtubeLabelButton } from './statusBar';

/** Clears cached download, in-memory queue, and global UI state so the welcome placeholder can appear. */
export async function resetLocalPlayerState(context: vscode.ExtensionContext): Promise<void> {
	const webm = path.join(context.globalStorageUri.fsPath, 'youtube_download.webm');
	try {
		if (fs.existsSync(webm)) {
			fs.unlinkSync(webm);
		}
	} catch (e) {
		console.error('[MUDE] Failed to delete cached download', e);
	}

	resetRecommendations();
	updateRecommendationIndex(0);

	/* Remove keys so nothing stale is left (VS Code drops the key when value is undefined). */
	await context.globalState.update('lastPlayedFilePath', undefined);
	await context.globalState.update('youtubeLabelButton', undefined);
	await context.globalState.update('currentTrackArtist', undefined);
	await context.globalState.update('currentTrackThumbnail', undefined);
	await context.globalState.update('previousyoutubeLabelButton', undefined);
	await context.globalState.update('currentPick', undefined);
	await context.globalState.update('sidebarLoadingTrackTitle', undefined);
	await context.globalState.update('sidebarLoadingTrackArtist', undefined);
	await context.globalState.update('currentTrackTimeSeconds', 0);
	await context.globalState.update('currentTrackDurationSeconds', 0);
	await context.globalState.update('recommendations', []);
	await context.globalState.update('currentRecommendationIndex', 0);
	await context.globalState.update('sidebarTrackLoading', false);
	await context.globalState.update('sidebarRecommendationsLoading', false);
	await context.globalState.update('isPlaying', false);
	await context.globalState.update('youtubeSearchHistory', []);

	try {
		await player.stop();
	} catch (e) {
		console.warn('[MUDE] player.stop failed', e);
	}

	youtubeLabelButton.text = '';
	if (togglePauseButton) {
		togglePauseButton.text = '$(debug-start)';
		togglePauseButton.tooltip = 'Play';
	}
	await stoppedState(context);
	await vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
	await vscode.commands.executeCommand('extension.refreshRecommendations');
	await vscode.commands.executeCommand('extension.refreshState');
	/* Force redraw even if user was hovering volume / dragging seek (otherwise old art can stick). */
	refreshMudeSidebar(true);
	void vscode.window.showInformationMessage('MUDE local player state was cleared.');
}

export function registerResetLocalPlayerState(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('MudePlayer.resetLocalPlayerState', async () => {
			await resetLocalPlayerState(context);
		})
	);
}
