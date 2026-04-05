import * as fs from 'fs';
import * as vscode from 'vscode';

/** True when global state points at a downloaded file that still exists (user has played at least once successfully). */
export function hasCachedTrackOnDisk(context: vscode.ExtensionContext): boolean {
	const p = (context.globalState.get<string>('lastPlayedFilePath') ?? '').trim();
	if (!p) {
		return false;
	}
	try {
		return fs.existsSync(p);
	} catch {
		return false;
	}
}

/** Next/previous are no-ops in the welcome UI: no download on disk and no queue. If there is a queue, allow skipping even before the first download completes. */
export function hasPlaybackOrRecommendationQueue(
	context: vscode.ExtensionContext,
	recommendationCount: number
): boolean {
	return hasCachedTrackOnDisk(context) || recommendationCount > 0;
}
