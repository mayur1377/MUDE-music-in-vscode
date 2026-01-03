import * as vscode from 'vscode';
import * as fs from 'fs';
import { playingState, stoppedState, youtubeLabelButton } from './statusBar';
import { downloadTrack, getSearchPick } from './youtube';
import { player } from './player';
import { getRecommendations } from './getRecommendations';
import { recommendations, currentRecommendationIndex, resetRecommendations, addRecommendation, updateRecommendationIndex } from './recommendations';
import * as path from 'path';

let currentStopHandler: (() => void) | null = null;

export function getDownloadPath(context: vscode.ExtensionContext): string {
    const filePath = path.join(context.globalStorageUri.fsPath, 'youtube_download.webm');
    console.log(`[DOWNLOAD] Preparing download path: ${filePath}`);
    if (fs.existsSync(filePath)) {
        console.log(`[DOWNLOAD] Previous download file exists, removing: ${filePath}`);
        fs.unlinkSync(filePath);
        console.log(`[DOWNLOAD] Previous download file removed`);
    }
    console.log(`[DOWNLOAD] Download path ready: ${filePath}`);
    return filePath;
}

export async function searchYoutube(context: vscode.ExtensionContext) {
    console.log('[SEARCH] searchYoutube function called');
    const pick = await getSearchPick(context);
    if (!pick) {
        console.log('[SEARCH] No track selected, exiting');
        return;
    }
    
    // @ts-expect-error
    const baseurl = `https://www.youtube.com/watch?v=${pick.data.videoId}`;
    // @ts-expect-error
    const ytmusicurl = `https://music.youtube.com/watch?v=${pick.data.videoId}`;
    // @ts-expect-error
    console.log(`[SEARCH] Selected track: ${pick.data.name} (Video ID: ${pick.data.videoId})`);
    console.log(`[SEARCH] YouTube URL: ${baseurl}`);
    console.log(`[SEARCH] YouTube Music URL: ${ytmusicurl}`);

    // SCRAPE RECOMMENDATIONS IMMEDIATELY
    console.log('[RECOMMENDATIONS] Resetting recommendations...');
    resetRecommendations();
    await context.globalState.update('recommendations', []);
    await context.globalState.update('currentRecommendationIndex', 0);

    console.log('[RECOMMENDATIONS] Fetching recommendations...');
    const newRecommendations = await getRecommendations(ytmusicurl);
    console.log(`[RECOMMENDATIONS] Found ${newRecommendations.length} recommendations`);
    newRecommendations.forEach(addRecommendation); // Store recommendations globally

    // Update global state
    await context.globalState.update('recommendations', recommendations);
    await context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
    vscode.commands.executeCommand('extension.refreshRecommendations');
    console.log('[RECOMMENDATIONS] Recommendations stored and refreshed');

    // Start playing the selected track
    // @ts-expect-error
    await context.globalState.update('youtubeLabelButton', `$(loading~spin) Loading ${pick.data.name}...`);
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    // @ts-expect-error
    console.log(`[PLAYBACK] Starting to process track: ${pick.label}`);
    // @ts-expect-error
    await processTrack(context, baseurl, pick.label, ytmusicurl);
}

export async function processTrack(context: vscode.ExtensionContext, url: string, title: string, ytmusicurl: string) {
    console.log(`[PLAYBACK] processTrack called for: ${title}`);
    console.log(`[PLAYBACK] URL: ${url}`);
    await stoppedState(context); // Ensure stopped state is shown while downloading
    const downloadPath = getDownloadPath(context);

    try {
        console.log(`[PLAYBACK] Updating status bar to show downloading state for: ${title}`);
        await context.globalState.update('youtubeLabelButton', `$(loading~spin) Downloading ${title}...`);
        vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
        console.log(`[PLAYBACK] Starting download for track: ${title}`);
        console.log(`[PLAYBACK] Download URL: ${url}`);
        console.log(`[PLAYBACK] Download path: ${downloadPath}`);
        console.log(`[PLAYBACK] YTMusic URL: ${ytmusicurl}`);
        
        await downloadTrack(url, downloadPath);
        
        console.log(`[PLAYBACK] Download completed, updating status bar for: ${title}`);
        await context.globalState.update('youtubeLabelButton', title);
        // Store the file path in global state
        await context.globalState.update('lastPlayedFilePath', downloadPath);
        console.log(`[PLAYBACK] Stored last played file path: ${downloadPath}`);
        vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
        
        console.log(`[PLAYBACK] Setting player to playing state`);
        await playingState(context);

        console.log(`[PLAYBACK] Loading track into MPV player: ${downloadPath}`);
        await player.load(downloadPath);
        console.log(`[PLAYBACK] Track loaded, starting playback`);
        await player.play();
        console.log(`[PLAYBACK] ✓ Playback started successfully for: ${title}`);

        registerStopHandler(context);
        console.log(`[PLAYBACK] Stop handler registered for automatic next track`);
    } catch (error) {
        console.error(`[PLAYBACK] ✗ Error processing track "${title}":`, error);
        youtubeLabelButton.text = `$(error) Error loading ${title}`;
        await stoppedState(context);
    }
}

function registerStopHandler(context: vscode.ExtensionContext) {
    if (currentStopHandler) {
        player.off('stopped', currentStopHandler);
    }

    currentStopHandler = async () => {
        console.log(`[PLAYBACK] Track stopped, checking for next recommendation`);
        await stoppedState(context);
        await context.globalState.update('youtubeLabelButton', `$(loading~spin) Loading next track...`);
        vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');

        if (currentRecommendationIndex < recommendations.length) {
            const nextRecommendation = recommendations[currentRecommendationIndex];
            console.log(`[PLAYBACK] Next recommendation found: ${nextRecommendation.title} (Index: ${currentRecommendationIndex})`);
            updateRecommendationIndex(currentRecommendationIndex + 1);  // Update index globally

            // Update global state
            await context.globalState.update('recommendations', recommendations);
            await context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
            vscode.commands.executeCommand('extension.refreshRecommendations');

            let ytmusicurl = `https://music.youtube.com/watch?v=${nextRecommendation.videoId}`;
            console.log(`[PLAYBACK] Processing next track: ${nextRecommendation.title}`);
            await processTrack(context, ytmusicurl, nextRecommendation.title, ytmusicurl);
            await playingState(context); // Ensure playing state is shown when the next track starts
        } else {
            console.log(`[PLAYBACK] No more recommendations available`);
            vscode.window.showInformationMessage('Search for more songs to play!');
            stoppedState(context);
            youtubeLabelButton.text = '';
        }
    };
    
    player.on('stopped', currentStopHandler);
}
