import * as vscode from 'vscode';
import { recommendations, currentRecommendationIndex, updateRecommendationIndex } from './recommendations'; // Import recommendations.ts
import { processTrack } from './searchYoutube'; // Import processTrack from searchYoutube.ts

export async function downloadAndPlayNext(context: vscode.ExtensionContext) {
    console.log(`[NEXT] Play next command triggered. Current index: ${currentRecommendationIndex}, Total recommendations: ${recommendations.length}`);
    if (currentRecommendationIndex < recommendations.length) {
        const nextRecommendation = recommendations[currentRecommendationIndex];
        console.log(`[NEXT] Playing next recommendation: ${nextRecommendation.title} (Video ID: ${nextRecommendation.videoId})`);
        updateRecommendationIndex(currentRecommendationIndex + 1);  // Update index globally

        // Update global state
        await context.globalState.update('recommendations', recommendations);
        await context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
        vscode.commands.executeCommand('extension.refreshRecommendations');
        console.log(`[NEXT] Updated recommendation index to: ${currentRecommendationIndex}`);

        let ytmusicurl = `https://music.youtube.com/watch?v=${nextRecommendation.videoId}`;
        console.log(`[NEXT] Starting download and playback for: ${nextRecommendation.title}`);
        await processTrack(context, ytmusicurl, nextRecommendation.title, ytmusicurl); // Call your processTrack with the next recommendation
    } else {
        console.log(`[NEXT] No more tracks available. Current index: ${currentRecommendationIndex}, Total: ${recommendations.length}`);
        vscode.window.showInformationMessage("No more tracks available in this playlist or recommendations.");
    }
}

export function addToNextAndPlay(context: vscode.ExtensionContext) {
    console.log(`[NEXT] Play next button clicked. Current index: ${currentRecommendationIndex}, Total recommendations: ${recommendations.length}`);
    if (currentRecommendationIndex < recommendations.length) {
        const nextRecommendation = recommendations[currentRecommendationIndex];
        console.log(`[NEXT] Playing next recommendation: ${nextRecommendation.title} (Video ID: ${nextRecommendation.videoId})`);
        updateRecommendationIndex(currentRecommendationIndex + 1);  // Update index globally

        // Update global state
        context.globalState.update('recommendations', recommendations);
        context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
        vscode.commands.executeCommand('extension.refreshRecommendations');
        console.log(`[NEXT] Updated recommendation index to: ${currentRecommendationIndex}`);

        let ytmusicurl = `https://music.youtube.com/watch?v=${nextRecommendation.videoId}`;
        console.log(`[NEXT] Starting download and playback for: ${nextRecommendation.title}`);
        processTrack(context, ytmusicurl, nextRecommendation.title, ytmusicurl); // Call your processTrack with the next recommendation
    } else {
        console.log(`[NEXT] No more tracks available. Current index: ${currentRecommendationIndex}, Total: ${recommendations.length}`);
        vscode.window.showWarningMessage("No more tracks next in playlist or recommendations.");
    }
}

export function addLastToNextAndPlay(context: vscode.ExtensionContext) {
    console.log(`[PREVIOUS] Play previous button clicked. Current index: ${currentRecommendationIndex}`);
    if (currentRecommendationIndex > 0) {
        const prevRecommendation = recommendations[currentRecommendationIndex - 1];
        console.log(`[PREVIOUS] Playing previous recommendation: ${prevRecommendation.title} (Video ID: ${prevRecommendation.videoId})`);
        updateRecommendationIndex(currentRecommendationIndex - 1);  // Update index globally

        // Update global state
        context.globalState.update('recommendations', recommendations);
        context.globalState.update('currentRecommendationIndex', currentRecommendationIndex);
        vscode.commands.executeCommand('extension.refreshRecommendations');
        console.log(`[PREVIOUS] Updated recommendation index to: ${currentRecommendationIndex}`);

        let ytmusicurl = `https://music.youtube.com/watch?v=${prevRecommendation.videoId}`;
        console.log(`[PREVIOUS] Starting download and playback for: ${prevRecommendation.title}`);
        processTrack(context, ytmusicurl, prevRecommendation.title, ytmusicurl); // Call your processTrack with the previous recommendation
    } else {
        console.log(`[PREVIOUS] No previous tracks available. Current index: ${currentRecommendationIndex}`);
        vscode.window.showWarningMessage("No tracks beyond in playlist or recommendations.");
    }
}


