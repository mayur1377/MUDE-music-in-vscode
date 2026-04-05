import { player } from './player';
import * as vscode from 'vscode';
import { addLastToNextAndPlay, addToNextAndPlay } from './nextsongs';
import { hasCachedTrackOnDisk, hasPlaybackOrRecommendationQueue } from './playbackContext';
import { togglePauseButton } from './statusBar';
import { refreshMudeSidebar } from './sidebarView';
import { processTrack } from './searchYoutube';
import { recommendations, updateRecommendationIndex } from './recommendations';

export function controls(context: vscode.ExtensionContext) {
    let togglePause = vscode.commands.registerCommand(
        'MudePlayer.togglePause',
        async () => {
            if (!hasCachedTrackOnDisk(context)) {
                return;
            }
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
                refreshMudeSidebar();
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
        if (!hasPlaybackOrRecommendationQueue(context, recommendations.length)) {
            return;
        }
        await addToNextAndPlay(context);
    });

    let playPrevious = vscode.commands.registerCommand(
        'MudePlayer.playPrevious',
        async () => {
            if (!hasPlaybackOrRecommendationQueue(context, recommendations.length)) {
                return;
            }
            await addLastToNextAndPlay(context);
        }
    );

    let seekTo = vscode.commands.registerCommand(
        'MudePlayer.seekTo',
        async (targetSeconds: number) => {
            if (typeof targetSeconds !== 'number' || !Number.isFinite(targetSeconds) || targetSeconds < 0) {
                return;
            }
            try {
                const duration = await player.getProperty('duration');
                if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
                    targetSeconds = Math.min(targetSeconds, duration);
                }

                // Prefer absolute positioning when available to avoid transient progress reset.
                if (typeof (player as any).goToPosition === 'function') {
                    await (player as any).goToPosition(targetSeconds);
                } else {
                    const current = await player.getProperty('time-pos');
                    if (typeof current === 'number' && Number.isFinite(current)) {
                        await player.seek(targetSeconds - current);
                    }
                }

                // Immediately update state for a smooth progress bar movement after seek.
                await vscode.commands.executeCommand('extension.refreshState');
                refreshMudeSidebar();
            } catch {
                vscode.window.showInformationMessage('Unable to seek right now');
            }
        }
    );

    let setVolume = vscode.commands.registerCommand(
        'MudePlayer.setVolume',
        async (volumePercent: number) => {
            if (typeof volumePercent !== 'number' || !Number.isFinite(volumePercent)) {
                return;
            }

            const clamped = Math.max(0, Math.min(100, volumePercent));
            try {
                await player.volume(clamped);
                await context.globalState.update('currentVolumePercent', clamped);

                const wasMuted = context.globalState.get<boolean>('isMuted', false);
                if (wasMuted && clamped > 0) {
                    await player.mute(false);
                    await context.globalState.update('isMuted', false);
                }

                refreshMudeSidebar();
            } catch {
                vscode.window.showInformationMessage('Unable to change volume right now');
            }
        }
    );

    let toggleMute = vscode.commands.registerCommand(
        'MudePlayer.toggleMute',
        async () => {
            try {
                const currentMute = await player.getProperty('mute');
                const nextMute = !(typeof currentMute === 'boolean' ? currentMute : false);
                await player.mute(nextMute);
                await context.globalState.update('isMuted', nextMute);
                refreshMudeSidebar();
            } catch {
                try {
                    await player.mute();
                    const updatedMute = await player.getProperty('mute');
                    await context.globalState.update('isMuted', typeof updatedMute === 'boolean' ? updatedMute : false);
                    refreshMudeSidebar();
                } catch {
                    vscode.window.showInformationMessage('Unable to toggle mute right now');
                }
            }
        }
    );

    let playRecommendationFromSidebar = vscode.commands.registerCommand(
        'MudePlayer.playRecommendationFromSidebar',
        async (index: number) => {
            if (typeof index !== 'number' || !Number.isFinite(index) || index < 0) {
                return;
            }

            const stateRecs = context.globalState.get<typeof recommendations>('recommendations', recommendations);
            if (!Array.isArray(stateRecs) || index >= stateRecs.length) {
                vscode.window.showInformationMessage('Recommendation not available');
                return;
            }

            recommendations.splice(0, recommendations.length, ...stateRecs);
            const selected = recommendations[index];
            updateRecommendationIndex(index + 1);
            await context.globalState.update('recommendations', recommendations);
            await context.globalState.update('currentRecommendationIndex', index + 1);
            await context.globalState.update('currentTrackArtist', selected.artistName || '');
            vscode.commands.executeCommand('extension.refreshRecommendations');

            const ytmusicurl = `https://music.youtube.com/watch?v=${selected.videoId}`;
            await processTrack(context, ytmusicurl, selected.title, ytmusicurl);
            refreshMudeSidebar();
        }
    );


    context.subscriptions.push(
        seekForward,
        seekBackword,
        togglePause,
        playNext,
        playPrevious,
        seekTo,
        setVolume,
        toggleMute,
        playRecommendationFromSidebar,
    );
}
