import * as vscode from 'vscode';
import youtubedl from 'youtube-dl-exec';
import YTMusic from 'ytmusic-api';
const ytmusic = new YTMusic();
import { youtubeLabelButton } from './statusBar';
import { addToSearchHistory, showSearchHistory, clearSearchHistory } from './searchHistory';

// why the retry??? well just for backup if the download fails
//  to do : but to fix the issue when window1 is playing , but i playnext in window2 , it is tryign to download same thing , some conflict is coming then
export async function downloadTrack(url: string, path: string): Promise<void> {
    console.log(`[DOWNLOAD] Starting download from URL: ${url}`);
    console.log(`[DOWNLOAD] Download destination: ${path}`);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            console.log(`[DOWNLOAD] Attempt ${attempts + 1} of ${maxAttempts} - Downloading audio...`);
            await youtubedl(url, {
                output: path,
                format: 'bestaudio/best', // Don't restrict to webm
            });
            console.log(`[DOWNLOAD] ✓ Download completed successfully: ${path}`);
            return;
        } catch (err: any) {
            attempts++;
            console.error(`[DOWNLOAD] ✗ Download failed (attempt ${attempts} of ${maxAttempts})`);
            console.error(`[DOWNLOAD] Error details:`, err.stderr || err.stdout || err.message || err);
            if (attempts >= maxAttempts) {
                console.error(`[DOWNLOAD] ✗ Download failed after ${maxAttempts} attempts. Giving up.`);
                throw new Error('Download failed after 3 attempts');
            }
            console.log(`[DOWNLOAD] Retrying download...`);
        }
    }
}


export async function getSearchResults(query: string): Promise<any> {
    try {
        console.log(`[SEARCH] Searching YouTube Music for: "${query}"`);
        await ytmusic.initialize(); // This should be awaited to ensure initialization is done properly
        console.log(`[SEARCH] YTMusic initialized, fetching search results...`);
        const songs = await ytmusic.searchSongs(query);
        console.log(`[SEARCH] Found ${songs.length} song results`);
        const videos = await ytmusic.searchVideos(query);
        console.log(`[SEARCH] Found ${videos.length} video results`);
        const searchResults = [...songs, ...videos];
        console.log(`[SEARCH] Total search results: ${searchResults.length}`);
        return searchResults;  // Return song search results
    } catch (error) {
        console.error('[SEARCH] Error fetching YouTube Music search results:', error);
        return [];
    }
}

export async function getSearchPick(context: vscode.ExtensionContext) {
    // Show options: New search or History
    const searchOption = await vscode.window.showQuickPick(
        [
            { label: '$(search) New Search', value: 'new' },
            { label: '$(history) Recent Plays', value: 'history' },
            { label: '$(trash) Clear History', value: 'clear' }
        ],
        { placeHolder: 'Search or view recent plays' }
    );

    if (!searchOption) {
        return;
    }

    // Handle different options
    if (searchOption.value === 'history') {
        return await showSearchHistory(context);
    } else if (searchOption.value === 'clear') {
        clearSearchHistory(context);
        return;
    }

    const input = await vscode.window.showInputBox({
        prompt: 'Search YouTube Music',
        placeHolder: 'Search YouTube Music',
    });

    if (!input) {
        console.log('[SEARCH] User cancelled search input');
        return;
    }

    console.log(`[SEARCH] User entered search query: "${input}"`);
    context.globalState.update('previousyoutubeLabelButton',  context.globalState.get('youtubeLabelButton'));
    await context.globalState.update('youtubeLabelButton', `$(loading~spin) Searching...`);
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    const results = await getSearchResults(input);
    if (!results.length) {
        console.log(`[SEARCH] No results found for query: "${input}"`);
        vscode.window.showInformationMessage('No results found');
        return;
    }
    await context.globalState.update('youtubeLabelButton', 'What do you want to play?');
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    const filteredResults = results.filter((song: any) => song.type === "SONG" || song.type === "VIDEO");
    console.log(`[SEARCH] Filtered results (SONG/VIDEO only): ${filteredResults.length}`);
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
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    // If a song was selected, add it to the history
    if (pick) {
        // @ts-expect-error
        console.log(`[SEARCH] User selected: ${pick.label}`);
        addToSearchHistory(context, pick);
    } else {
        console.log('[SEARCH] User cancelled selection');
    }
    return pick;
}