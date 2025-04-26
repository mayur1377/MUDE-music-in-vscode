import { Client } from 'lrclib-api';
import * as vscode from 'vscode';
import { player } from './player';

const client = new Client();
let currentLyrics: { text: string; startTime: number }[] = [];
let currentLyricIndex = 0;

export async function fetchLyrics(trackName: string, artistName: string) {
    console.log(`Fetching lyrics for: ${trackName} by ${artistName}`);
    try {
        const query = {
            track_name: trackName,
            artist_name: artistName
        };

        // First try to get synced lyrics
        const syncedLyrics = await client.getSynced(query);
        console.log('Synced lyrics found:', syncedLyrics?.length ?? 0 > 0);
        
        if (syncedLyrics && syncedLyrics.length > 0) {
            currentLyrics = syncedLyrics.map(lyric => ({
                text: lyric.text,
                startTime: lyric.startTime ?? 0
            }));
            currentLyricIndex = 0;
            console.log('Current lyrics:', currentLyrics);
            console.log('Successfully loaded synced lyrics');
            return true;
        }
        console.log('No lyrics found');
        return false;
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return false;
    }
}

export function getCurrentLyric(currentTime: number): string {
    if (currentLyrics.length === 0) {
        return '';
    }

    // Convert current time to seconds (since our timestamps are in seconds)
    const currentTimeSeconds = currentTime;

    // Find the appropriate lyric for the current time
    let nextLyricIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
        if (currentLyrics[i].startTime > currentTimeSeconds) {
            nextLyricIndex = i;
            break;
        }
    }

    // If we're before the first lyric
    if (nextLyricIndex === 0) {
        return '';
    }

    // If we're after the last lyric, return the last one
    if (nextLyricIndex === -1) {
        return currentLyrics[currentLyrics.length - 1].text;
    }

    // Return the current lyric (the one before the next one)
    return currentLyrics[nextLyricIndex - 1].text;
}
