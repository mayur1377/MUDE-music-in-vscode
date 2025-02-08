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
    if (fs.existsSync(filePath)) {
        console.log("Removing previous download...");
        fs.unlinkSync(filePath);
    }
    console.log("Download path:", filePath);
    return filePath;
}

export async function searchYoutube(context: vscode.ExtensionContext) {
    const pick = await getSearchPick(context);
    if (!pick) {
        return;
    }
    
    console.log("Search pick:", pick);
    // @ts-expect-error
    const baseurl = `https://www.youtube.com/watch?v=${pick.data.videoId}`;
    // @ts-expect-error
    const ytmusicurl = `https://music.youtube.com/watch?v=${pick.data.videoId}`;

    // SCRAPE RECOMMENDATIONS IMMEDIATELY
    resetRecommendations(); // Clear old recommendations
    const newRecommendations = await getRecommendations(ytmusicurl);
    newRecommendations.forEach(addRecommendation); // Store recommendations globally

    // Update global state
    await context.globalState.update('recommendations', recommendations);
    await context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
    vscode.commands.executeCommand('extension.refreshRecommendations');

    // Start playing the selected track
    // @ts-expect-error
    await context.globalState.update('youtubeLabelButton', `$(loading~spin) Loading ${pick.data.name}...`);
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    // @ts-expect-error
    await processTrack(context, baseurl, pick.label, ytmusicurl);
}

export async function processTrack(context: vscode.ExtensionContext, url: string, title: string, ytmusicurl: string) {
    await stoppedState(context); // Ensure stopped state is shown while downloading
    const downloadPath = getDownloadPath(context);

    try {
        await context.globalState.update('youtubeLabelButton', `$(loading~spin) Downloading ${title}...`);
        vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
        console.log(`Downloading track: ${title}`);
        console.log(`Download url: ${url}`);
        console.log(`Download path: ${downloadPath}`);
        console.log(`YTMusic url: ${ytmusicurl}`);
        await downloadTrack(url, downloadPath);
        await context.globalState.update('youtubeLabelButton', title);
        vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
        await playingState(context);

        await player.load(downloadPath);
        await player.play();

        registerStopHandler(context);
    } catch (error) {
        console.error("Error processing track:", error);
        youtubeLabelButton.text = `$(error) Error loading ${title}`;
        await stoppedState(context);
    }
}

function registerStopHandler(context: vscode.ExtensionContext) {
    if (currentStopHandler) {
        player.off('stopped', currentStopHandler);
    }

    currentStopHandler = async () => {
        await stoppedState(context);
        await context.globalState.update('youtubeLabelButton', `$(loading~spin) Loading next track...`);
        vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');

        if (currentRecommendationIndex < recommendations.length) {
            const nextRecommendation = recommendations[currentRecommendationIndex];
            updateRecommendationIndex(currentRecommendationIndex + 1);  // Update index globally

            // Update global state
            await context.globalState.update('recommendations', recommendations);
            await context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
            vscode.commands.executeCommand('extension.refreshRecommendations');

            console.log(`Next recommendation:`, nextRecommendation);
            let ytmusicurl = `https://music.youtube.com/watch?v=${nextRecommendation.videoId}`;

            await processTrack(context, ytmusicurl, nextRecommendation.title, ytmusicurl);
            await playingState(context); // Ensure playing state is shown when the next track starts
        } else {
            vscode.window.showInformationMessage('Search for more songs to play!');
            stoppedState(context);
            youtubeLabelButton.text = '';
        }
    };
    
    player.on('stopped', currentStopHandler);
}
