import * as vscode from 'vscode';

interface HistoryItem {
    name: string;
    artist?: { name: string };
    duration: number;
    videoId: string;
    type: string;
    timestamp: number;
}

const MAX_HISTORY_ITEMS = 5;

// Add a song to search history
export function addToSearchHistory(context: vscode.ExtensionContext, pick: any): void {
    if (!pick || !pick.data) {
        console.log('Cannot add to history: invalid pick');
        return;
    }
    
    const song = pick.data;
    
    if (!song.videoId) {
        console.log('Cannot add song to history: missing videoId');
        return; // Don't add invalid songs
    }
    
    const searchHistory: HistoryItem[] = context.globalState.get('youtubeSearchHistory', []);
    const historyItem: HistoryItem = {
        name: song.name,
        artist: song.artist,
        duration: song.duration,
        videoId: song.videoId,
        type: song.type,
        timestamp: Date.now()
    };
    
    // Remove the song if it's already in history to avoid duplicates
    const filteredHistory = searchHistory.filter(item => item.videoId !== song.videoId);
    
    filteredHistory.unshift(historyItem);
    const trimmedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);
    context.globalState.update('youtubeSearchHistory', trimmedHistory);
    context.globalState.update('currentPick', song);
}

// Show search history and allow user to pick from it
export async function showSearchHistory(context: vscode.ExtensionContext) {
    const history: HistoryItem[] = context.globalState.get('youtubeSearchHistory', []);
    
    if (history.length === 0) {
        vscode.window.showInformationMessage('Nothing yet , maybe play some songs?');
        return;
    }
    
    const pick = await vscode.window.showQuickPick(
        history.map((song: HistoryItem) => {
            const minutes = Math.floor(song.duration / 60);
            const seconds = song.duration % 60;
            const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            const date = new Date(song.timestamp);
            const dateStr = date.toLocaleDateString();
            
            return {
                label: `${song.name}`,
                detail: `${song.artist?.name || 'Unknown'} - ${formattedDuration} (Played on ${dateStr})`,
                data: song,
            };
        }),
        { placeHolder: 'Select from your recent plays' }
    );
    
    if (pick && pick.data) {
        // Store as current pick when selected from history
        context.globalState.update('currentPick', pick.data);
    }
    
    return pick;
}

// Clear search history
export function clearSearchHistory(context: vscode.ExtensionContext): void {
    context.globalState.update('youtubeSearchHistory', []);
    vscode.window.showInformationMessage('Search history cleared');
}

// Get the currently stored pick
export function getCurrentPick(context: vscode.ExtensionContext): any {
    return context.globalState.get('currentPick');
}