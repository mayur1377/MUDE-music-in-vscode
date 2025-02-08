import * as vscode from 'vscode';
import { searchYoutube } from './searchYoutube';

export function searchMusic(context: vscode.ExtensionContext) {
    let searchMusic = vscode.commands.registerCommand('MudePlayer.searchMusic', async () => {
        await searchYoutube(context);
    });

    context.subscriptions.push(searchMusic);
}
