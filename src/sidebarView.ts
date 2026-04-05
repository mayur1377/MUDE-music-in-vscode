import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
	togglePauseButton,
	youtubeLabelButton,
} from './statusBar';
import { hasCachedTrackOnDisk } from './playbackContext';
import { getMudeSidebarHtml, escapeHtml, formatTime, stripCodicons } from './sidebar/sidebarHtml';

export class MudeSidebarProvider implements vscode.WebviewViewProvider {
	private view?: vscode.WebviewView;
	private isDraggingState = false;
	private dragTimeout?: NodeJS.Timeout;
	private isHoveringVolume = false;
	private hoverTimeout?: NodeJS.Timeout;
	private cssContent: string = '';

	constructor(private readonly context: vscode.ExtensionContext) {
		try {
			const cssPath = path.join(context.extensionPath, 'media', 'sidebar.css');
			this.cssContent = fs.readFileSync(cssPath, 'utf8');
		} catch (error) {
			console.error('Failed to load sidebar.css', error);
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void {
		this.view = webviewView;
		webviewView.webview.options = { enableScripts: true };

		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case 'setDraggingState':
					if (message.dragging) {
						this.isDraggingState = true;
						if (this.dragTimeout) {
							clearTimeout(this.dragTimeout);
							this.dragTimeout = undefined;
						}
					} else {
						this.dragTimeout = setTimeout(() => {
							this.isDraggingState = false;
							this.update();
							this.dragTimeout = undefined;
						}, 900);
					}
					break;
				case 'setHoveringVolume':
					if (message.hovering) {
						this.isHoveringVolume = true;
						if (this.hoverTimeout) {
							clearTimeout(this.hoverTimeout);
							this.hoverTimeout = undefined;
						}
					} else {
						this.hoverTimeout = setTimeout(() => {
							this.isHoveringVolume = false;
							this.update();
							this.hoverTimeout = undefined;
						}, 900);
					}
					break;
				case 'playPrevious':
					await vscode.commands.executeCommand('MudePlayer.playPrevious');
					break;
				case 'seekBackword':
					await vscode.commands.executeCommand('MudePlayer.seekBackword');
					break;
				case 'togglePause':
					await vscode.commands.executeCommand('MudePlayer.togglePause');
					break;
				case 'seekForward':
					await vscode.commands.executeCommand('MudePlayer.seekForward');
					break;
				case 'playNext':
					await vscode.commands.executeCommand('MudePlayer.playNext');
					break;
				case 'searchMusic':
					await vscode.commands.executeCommand('MudePlayer.searchMusic');
					break;
				case 'setVolume':
					if (typeof message.volume === 'number' && Number.isFinite(message.volume)) {
						await vscode.commands.executeCommand('MudePlayer.setVolume', message.volume);
					}
					break;
				case 'toggleMute':
					await vscode.commands.executeCommand('MudePlayer.toggleMute');
					break;
				case 'seekTo':
					if (typeof message.seconds === 'number' && Number.isFinite(message.seconds)) {
						await vscode.commands.executeCommand('MudePlayer.seekTo', message.seconds);
					}
					break;
				case 'playRecommendation':
					if (typeof message.index === 'number' && Number.isFinite(message.index)) {
						await vscode.commands.executeCommand('MudePlayer.playRecommendationFromSidebar', message.index);
					}
					break;
			}
		});

		this.update();
	}

	refresh(force = false): void {
		if (force) {
			this.isDraggingState = false;
			this.isHoveringVolume = false;
			if (this.dragTimeout) {
				clearTimeout(this.dragTimeout);
				this.dragTimeout = undefined;
			}
			if (this.hoverTimeout) {
				clearTimeout(this.hoverTimeout);
				this.hoverTimeout = undefined;
			}
		}
		this.update();
	}

	private update(): void {
		if (!this.view || this.isDraggingState || this.isHoveringVolume) {
			return;
		}

		try {
			const trackRaw = youtubeLabelButton?.text ?? this.context.globalState.get<string>('youtubeLabelButton', 'No track selected');
			const trackLabel = stripCodicons(trackRaw) || 'No track selected';
			const trackArtist = this.context.globalState.get<string>('currentTrackArtist', '').trim();
			const tooltipValue = togglePauseButton?.tooltip;
			const tooltipText = typeof tooltipValue === 'string' ? tooltipValue : '';
			const playPauseState = tooltipText.toLowerCase().includes('pause') ? 'Playing' : 'Paused';
			const thumbnailUrl = (this.context.globalState.get<string>('currentTrackThumbnail') ?? '').trim();
			const elapsedSeconds = this.context.globalState.get<number>('currentTrackTimeSeconds', 0);
			const durationSeconds = this.context.globalState.get<number>('currentTrackDurationSeconds', 0);
			const volumePercent = this.context.globalState.get<number>('currentVolumePercent', 70);
			const isMuted = this.context.globalState.get<boolean>('isMuted', false);
			const recommendations = this.context.globalState.get<{ title: string; artistName?: string }[]>('recommendations', []);
			const currentRecommendationIndex = this.context.globalState.get<number>('currentRecommendationIndex', 0);
			const currentlyPlayingRecommendationIndex = Math.max(0, currentRecommendationIndex - 1);
			const upcomingRecommendations = recommendations
				.map((rec, index) => ({
					index,
					title: rec.title,
					artist: rec.artistName || 'Unknown Artist',
				}));
			const progressPercent =
				durationSeconds > 0 ? Math.max(0, Math.min(100, (elapsedSeconds / durationSeconds) * 100)) : 0;
			const elapsedText = formatTime(elapsedSeconds);
			const durationText = formatTime(durationSeconds);
			const trackLoading = this.context.globalState.get<boolean>('sidebarTrackLoading', false);
			const recommendationsLoading = this.context.globalState.get<boolean>('sidebarRecommendationsLoading', false);
			// Welcome placeholder: no finished download on disk (same check as transport commands)
			const emptyState =
				!trackLoading &&
				!recommendationsLoading &&
				recommendations.length === 0 &&
				!hasCachedTrackOnDisk(this.context);

			const iconUri = this.view.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'icon.png')).toString();
			const imageSrc = thumbnailUrl || iconUri || '';

			// Refresh CSS content in dev so no reload required upon editing CSS
			let updatedCssContent = this.cssContent;
			try {
				const cssPath = path.join(this.context.extensionPath, 'media', 'sidebar.css');
				updatedCssContent = fs.readFileSync(cssPath, 'utf8');
			} catch (_) {}

			this.view.webview.html = getMudeSidebarHtml({
				track: trackLabel,
				artist: trackArtist,
				status: playPauseState,
				imageSrc,
				progressPercent,
				elapsedSeconds,
				elapsedText,
				durationText,
				durationSeconds,
				volumePercent,
				isMuted,
				upcomingRecommendations,
				currentlyPlayingRecommendationIndex,
				trackLoading,
				recommendationsLoading,
				emptyState,
				cssContent: updatedCssContent
			});
		} catch (error) {
			console.error('[MUDE] Failed to render sidebar webview', error);
			const message = error instanceof Error ? error.message : String(error);
			this.view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 12px;
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
		}
		pre {
			white-space: pre-wrap;
			word-break: break-word;
		}
	</style>
</head>
<body>
	<h3>MUDE Sidebar failed to load</h3>
	<pre>${escapeHtml(message)}</pre>
</body>
</html>`;
		}
	}
}

let provider: MudeSidebarProvider | undefined;

export function registerMudeSidebar(context: vscode.ExtensionContext): void {
	provider = new MudeSidebarProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('mudePlayerSidebar', provider, {
			webviewOptions: { retainContextWhenHidden: true },
		})
	);
	provider.refresh();
}

export function refreshMudeSidebar(force = false): void {
	provider?.refresh(force);
}
