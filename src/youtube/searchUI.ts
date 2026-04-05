import * as vscode from 'vscode';
import YTMusic from 'ytmusic-api';
import { addToSearchHistory, clearSearchHistory, showSearchHistory } from '../searchHistory';
const ytmusic = new YTMusic();

export async function getSearchResults(query: string): Promise<any> {
    try {
        console.log(`[SEARCH] Searching YouTube Music for: "${query}"`);
        await ytmusic.initialize(); 
        console.log(`[SEARCH] YTMusic initialized, fetching search results...`);
        const songs = await ytmusic.searchSongs(query);
        console.log(`[SEARCH] Found ${songs.length} song results`);
        const videos = await ytmusic.searchVideos(query);
        console.log(`[SEARCH] Found ${videos.length} video results`);
        const searchResults = [...songs, ...videos];
        console.log(`[SEARCH] Total search results: ${searchResults.length}`);
        return searchResults;  
    } catch (error) {
        console.error('[SEARCH] Error fetching YouTube Music search results:', error);
        return [];
    }
}

export async function getSearchPick(context: vscode.ExtensionContext) {
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
            const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;  
            return {
                label: `${song.name}`,
                detail: `${song.artist?.name} - ${formattedDuration}`,  
                data: song,
            };
        }),
        {}
    );

    await context.globalState.update('youtubeLabelButton', context.globalState.get('previousyoutubeLabelButton'));
    vscode.commands.executeCommand('extension.refreshYoutubeLabelButton');
    if (pick) {
        // @ts-expect-error
        console.log(`[SEARCH] User selected: ${pick.label}`);
        addToSearchHistory(context, pick);
    } else {
        console.log('[SEARCH] User cancelled selection');
    }
    return pick;
}
