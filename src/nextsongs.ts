import * as vscode from 'vscode';
import { recommendations, currentRecommendationIndex, updateRecommendationIndex } from './recommendations'; // Import recommendations.ts
import { processTrack } from './searchYoutube'; // Import processTrack from searchYoutube.ts

export async function downloadAndPlayNext(context: vscode.ExtensionContext) {
    console.log(`End of playlist reached. Checking for recommendations.`);
    if (currentRecommendationIndex < recommendations.length) {
        const nextRecommendation = recommendations[currentRecommendationIndex];
        updateRecommendationIndex(currentRecommendationIndex + 1);  // Update index globally

        // Update global state
        await context.globalState.update('recommendations', recommendations);
        await context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
        vscode.commands.executeCommand('extension.refreshRecommendations');

        console.log(`Next recommendation:`, nextRecommendation);
        let ytmusicurl = `https://music.youtube.com/watch?v=${nextRecommendation.videoId}`;
        await processTrack(context, ytmusicurl, nextRecommendation.title, ytmusicurl); // Call your processTrack with the next recommendation
    } else {
        console.log(`No more tracks available in this playlist or recommendations.`);
        vscode.window.showInformationMessage("No more tracks available in this playlist or recommendations.");
    }
}

export function addToNextAndPlay(context: vscode.ExtensionContext) {
    console.log(`End of playlist reached. Checking for recommendations.`);
    if (currentRecommendationIndex < recommendations.length) {
        const nextRecommendation = recommendations[currentRecommendationIndex];
        updateRecommendationIndex(currentRecommendationIndex + 1);  // Update index globally

        // Update global state
        context.globalState.update('recommendations', recommendations);
        context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
        vscode.commands.executeCommand('extension.refreshRecommendations');

        console.log(`Next recommendation:`, nextRecommendation);
        let ytmusicurl = `https://music.youtube.com/watch?v=${nextRecommendation.videoId}`;
        processTrack(context, ytmusicurl, nextRecommendation.title, ytmusicurl); // Call your processTrack with the next recommendation
    } else {
        console.log(`No more tracks next in playlist or recommendations.`);
        vscode.window.showWarningMessage("No more tracks next in playlist or recommendations.");
    }
}

export function addLastToNextAndPlay(context: vscode.ExtensionContext) {
    if (currentRecommendationIndex > 0) {
        const prevRecommendation = recommendations[currentRecommendationIndex - 1];
        updateRecommendationIndex(currentRecommendationIndex - 1);  // Update index globally

        // Update global state
        context.globalState.update('recommendations', recommendations);
        context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
        vscode.commands.executeCommand('extension.refreshRecommendations');

        console.log(`Previous recommendation:`, prevRecommendation);
        let ytmusicurl = `https://music.youtube.com/watch?v=${prevRecommendation.videoId}`;
        processTrack(context, ytmusicurl, prevRecommendation.title, ytmusicurl); // Call your processTrack with the previous recommendation
    } else {
        vscode.window.showWarningMessage("No tracks beyond in playlist or recommendations.");
    }
}


