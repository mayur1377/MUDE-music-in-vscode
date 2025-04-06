import * as vscode from 'vscode';
import youtubedl from 'youtube-dl-exec';
import YTMusic from 'ytmusic-api';
const ytmusic = new YTMusic();
import { youtubeLabelButton } from './statusBar';


// why the retry??? well just for backup if the download fails
//  to do : but to fix the issue when window1 is playing , but i playnext in window2 , it is tryign to download same thing , some conflict is coming then
export async function downloadTrack(url: string, path: string): Promise<void> {
    console.log(`Starting download from ${url} to ${path}`);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            await youtubedl(url, {
                output: path,
                format: 'bestaudio/best', // Don't restrict to webm
            });
            console.log('Download completed');
            return;
        } catch (err: any) {
            attempts++;
            console.error(`Download failed (attempt ${attempts} of ${maxAttempts})`);
            console.error(err.stderr || err.stdout || err.message || err);
            if (attempts >= maxAttempts) {
                throw new Error('Download failed after 3 attempts');
            }
        }
    }
}


export async function getSearchResults(query: string): Promise<any> {
    try {
        
        await ytmusic.initialize(); // This should be awaited to ensure initialization is done properly
        const songs = await ytmusic.searchSongs(query);
        const videos = await ytmusic.searchVideos(query);
        const searchResults = [...songs, ...videos];
        console.log('Search results:', searchResults);
        return searchResults;  // Return song search results
    } catch (error) {
        console.error('Error fetching YouTube Music search results:', error);
        return [];
    }
}

export async function getSearchPick(context: vscode.ExtensionContext) {
    const input = await vscode.window.showInputBox({
        prompt: 'Search YouTube Music',
        placeHolder: 'Search YouTube Music',
    });

    if (!input) {
        return;
    }

    context.globalState.update('previousyoutubeLabelButton',  context.globalState.get('youtubeLabelButton'));
    await context.globalState.update('youtubeLabelButton', `$(loading~spin) Searching...`);
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    const results = await getSearchResults(input);
    if (!results.length) {
        vscode.window.showInformationMessage('No results found');
        return;
    }
    await context.globalState.update('youtubeLabelButton', 'What do you want to play?');
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    const filteredResults = results.filter((song: any) => song.type === "SONG" || song.type === "VIDEO");
    const pick = await vscode.window.showQuickPick(
        filteredResults.map((song: any) => {
            const minutes = Math.floor(song.duration / 60);
            const seconds = song.duration % 60;
            const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;  // Format seconds to always show two digits
            return {
                label: `${song.name}`,
                detail: `${song.artist?.name} - ${formattedDuration}`,  // Use the formatted duration
                data: song,
            };
        }),
        {}
    );
    await context.globalState.update('youtubeLabelButton', context.globalState.get('previousyoutubeLabelButton'));
    console.log('Search pick:', pick);
    return pick;
}