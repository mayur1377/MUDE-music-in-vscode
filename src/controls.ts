import { player } from './player';
import * as vscode from 'vscode';
import { addLastToNextAndPlay, addToNextAndPlay } from './nextsongs';
import { togglePauseButton } from './statusBar';

export function controls(context: vscode.ExtensionContext) {
    let togglePause = vscode.commands.registerCommand(
        'MudePlayer.togglePause',
        async () => {
            try {
                const state = await player.getProperty('pause'); 
                if (state) {
                    await player.resume();
                    console.log('Playing');
                    togglePauseButton.text = '$(debug-pause)';
                    togglePauseButton.tooltip = 'Pause';
                } else {
                    await player.pause();
                    console.log('Paused');
                    togglePauseButton.text = '$(notebook-execute)';
                    togglePauseButton.tooltip = 'Play';
                }
                togglePauseButton.show();
            } catch (error) {
                // No media loaded, can't toggle pause
                vscode.window.showInformationMessage('No media is currently playing');
            }
        }
    );
    

    let seekForward = vscode.commands.registerCommand(
        'MudePlayer.seekForward',
        async () => {
            await player.seek(10);
        }
    );

    let seekBackword = vscode.commands.registerCommand(
        'MudePlayer.seekBackword',
        async () => {
            await player.seek(-10);
        }
    );

    let playNext = vscode.commands.registerCommand('MudePlayer.playNext', async () => {
        addToNextAndPlay(context); // Pass context to the function
    });

    let playPrevious = vscode.commands.registerCommand(
        'MudePlayer.playPrevious',
        async () => {
            addLastToNextAndPlay(context); // Pass context to the function
        }
    );


    context.subscriptions.push(
        seekForward,
        seekBackword,
        togglePause,
        playNext,
        playPrevious,
    );
}