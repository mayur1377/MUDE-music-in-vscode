import * as vscode from 'vscode';
import { create } from 'youtube-dl-exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import YTMusic from 'ytmusic-api';
const ytmusic = new YTMusic();
import { youtubeLabelButton } from './statusBar';
import { addToSearchHistory, showSearchHistory, clearSearchHistory } from './searchHistory';

/**
 * Gets the correct yt-dlp binary path for the current platform.
 * Handles Windows-specific issues where the binary might not have .exe extension.
 * Uses require.resolve to find the youtube-dl-exec module location reliably.
 * @returns The path to the yt-dlp binary, or undefined if not found
 */
function getYtDlpBinaryPath(): string | undefined {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    
    try {
        // Use require.resolve to find the youtube-dl-exec module location
        // This works reliably in both development and production (installed extension)
        const youtubeDlExecModulePath = require.resolve('youtube-dl-exec/package.json');
        const youtubeDlExecPath = path.dirname(youtubeDlExecModulePath);
        const binPath = path.join(youtubeDlExecPath, 'bin');
        
        console.log(`[YT-DLP] Platform: ${platform}`);
        console.log(`[YT-DLP] youtube-dl-exec module path: ${youtubeDlExecPath}`);
        console.log(`[YT-DLP] Bin path: ${binPath}`);
        
        if (!fs.existsSync(binPath)) {
            console.error(`[YT-DLP] Bin directory does not exist: ${binPath}`);
            // Try alternative path resolution
            return getYtDlpBinaryPathAlternative();
        }
        
        // On Windows, try .exe first, then fallback to no extension
        if (isWindows) {
            const exePath = path.join(binPath, 'yt-dlp.exe');
            const noExtPath = path.join(binPath, 'yt-dlp');
            
            // Check if .exe exists
            if (fs.existsSync(exePath)) {
                console.log(`[YT-DLP] Found Windows executable: ${exePath}`);
                return exePath;
            }
            
            // Check if binary without .exe exists (the problematic case)
            if (fs.existsSync(noExtPath)) {
                console.log(`[YT-DLP] Found binary without .exe extension: ${noExtPath}`);
                console.log(`[YT-DLP] This is the Windows issue - binary exists but lacks .exe extension`);
                
                try {
                    const stats = fs.statSync(noExtPath);
                    if (stats.isFile()) {
                        console.log(`[YT-DLP] Binary file found, size: ${stats.size} bytes`);
                        
                        // Try to create a copy with .exe extension
                        // This is the fix for the Windows issue
                        if (!fs.existsSync(exePath)) {
                            try {
                                // Use copyFileSync to create the .exe copy
                                // This ensures Windows can execute it properly
                                fs.copyFileSync(noExtPath, exePath);
                                
                                // Verify the copy was created successfully
                                if (fs.existsSync(exePath)) {
                                    const copyStats = fs.statSync(exePath);
                                    if (copyStats.size === stats.size) {
                                        console.log(`[YT-DLP] ✓ Created .exe copy: ${exePath}`);
                                        console.log(`[YT-DLP] Copy verified (size: ${copyStats.size} bytes)`);
                                        console.log(`[YT-DLP] This should resolve the Windows execution issue`);
                                        return exePath;
                                    } else {
                                        console.warn(`[YT-DLP] Copy size mismatch - original: ${stats.size}, copy: ${copyStats.size}`);
                                    }
                                }
                            } catch (copyErr: any) {
                                console.warn(`[YT-DLP] Could not create .exe copy: ${copyErr.message}`);
                                console.warn(`[YT-DLP] This may be a permissions issue. Trying alternative approach...`);

                                // Do NOT return exePath here: the copy operation just failed, so exePath
                                // is very likely to not exist and would cause persistent ENOENT errors
                                // once youtube-dl-exec is cached. Returning undefined triggers fallback
                                // initialization so we don't cache a broken path.
                                console.log(`[YT-DLP] Falling back to default initialization (not caching non-existent .exe path)`);
                                return undefined;
                            }
                        } else {
                            // .exe already exists, use it
                            console.log(`[YT-DLP] .exe file already exists: ${exePath}`);
                            return exePath;
                        }
                    }
                } catch (statErr: any) {
                    console.error(`[YT-DLP] Error checking file stats: ${statErr.message}`);
                }
            }
            
            console.error(`[YT-DLP] No yt-dlp binary found in: ${binPath}`);
            return getYtDlpBinaryPathAlternative();
        } else {
            // On Unix-like systems, binary should be named 'yt-dlp'
            const unixPath = path.join(binPath, 'yt-dlp');
            if (fs.existsSync(unixPath)) {
                console.log(`[YT-DLP] Found Unix binary: ${unixPath}`);
                return unixPath;
            }
            
            console.error(`[YT-DLP] No yt-dlp binary found in: ${binPath}`);
            return getYtDlpBinaryPathAlternative();
        }
    } catch (resolveErr: any) {
        console.error(`[YT-DLP] Error resolving youtube-dl-exec module: ${resolveErr.message}`);
        return getYtDlpBinaryPathAlternative();
    }
}

/**
 * Alternative method to find the binary path using __dirname fallback.
 * Used when require.resolve fails.
 */
function getYtDlpBinaryPathAlternative(): string | undefined {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    
    try {
        // Fallback: use __dirname (works in compiled output)
        // In VS Code extensions, __dirname points to out/ directory
        const extensionPath = path.resolve(__dirname, '..');
        const nodeModulesPath = path.join(extensionPath, 'node_modules');
        const youtubeDlExecPath = path.join(nodeModulesPath, 'youtube-dl-exec');
        const binPath = path.join(youtubeDlExecPath, 'bin');
        
        console.log(`[YT-DLP] Trying alternative path: ${binPath}`);
        
        if (!fs.existsSync(binPath)) {
            console.error(`[YT-DLP] Alternative bin directory does not exist: ${binPath}`);
            return undefined;
        }
        
        if (isWindows) {
            const exePath = path.join(binPath, 'yt-dlp.exe');
            const noExtPath = path.join(binPath, 'yt-dlp');
            
            if (fs.existsSync(exePath)) {
                return exePath;
            }
            
            if (fs.existsSync(noExtPath)) {
                // Try to create .exe copy
                try {
                    fs.copyFileSync(noExtPath, exePath);
                    console.log(`[YT-DLP] ✓ Created .exe copy via alternative method: ${exePath}`);
                    return exePath;
                } catch (err: any) {
                    console.warn(`[YT-DLP] Could not create .exe copy: ${err.message}`);
                    // Do NOT return exePath here: if the copy failed, exePath likely does not exist.
                    // Returning undefined triggers fallback initialization and avoids caching a broken path.
                    return undefined;
                }
            }
        } else {
            const unixPath = path.join(binPath, 'yt-dlp');
            if (fs.existsSync(unixPath)) {
                return unixPath;
            }
        }
    } catch (err: any) {
        console.error(`[YT-DLP] Error in alternative path resolution: ${err.message}`);
    }
    
    return undefined;
}

/**
 * Initializes the youtube-dl-exec instance with the correct binary path.
 * This handles platform-specific issues, especially on Windows.
 */
let youtubedl: ReturnType<typeof create> | null = null;

function initializeYoutubeDl(): ReturnType<typeof create> {
    if (youtubedl) {
        return youtubedl;
    }
    
    const binaryPath = getYtDlpBinaryPath();
    
    if (binaryPath) {
        console.log(`[YT-DLP] Initializing with binary path: ${binaryPath}`);
        try {
            youtubedl = create(binaryPath);
            console.log(`[YT-DLP] Successfully initialized youtube-dl-exec`);
            return youtubedl;
        } catch (err: any) {
            console.error(`[YT-DLP] Error initializing with custom path: ${err.message}`);
            console.log(`[YT-DLP] Falling back to default initialization`);
        }
    } else {
        console.warn(`[YT-DLP] Binary path not found, using default initialization`);
    }
    
    // Fallback to default initialization
    try {
        const defaultYtDl = require('youtube-dl-exec');
        const initialized = typeof defaultYtDl === 'function' ? defaultYtDl : defaultYtDl.default || defaultYtDl;
        youtubedl = initialized as ReturnType<typeof create>;
        console.log(`[YT-DLP] Using default youtube-dl-exec initialization`);
        return youtubedl;
    } catch (err: any) {
        console.error(`[YT-DLP] Failed to initialize youtube-dl-exec: ${err.message}`);
        throw new Error(`Failed to initialize youtube-dl-exec: ${err.message}`);
    }
}

// why the retry??? well just for backup if the download fails
//  to do : but to fix the issue when window1 is playing , but i playnext in window2 , it is tryign to download same thing , some conflict is coming then
export async function downloadTrack(url: string, downloadPath: string): Promise<void> {
    console.log(`[DOWNLOAD] Starting download from URL: ${url}`);
    console.log(`[DOWNLOAD] Download destination: ${downloadPath}`);
    let attempts = 0;
    const maxAttempts = 3;

    // Ensure youtube-dl-exec is initialized
    const ytDl = initializeYoutubeDl();

    while (attempts < maxAttempts) {
        try {
            console.log(`[DOWNLOAD] Attempt ${attempts + 1} of ${maxAttempts} - Downloading audio...`);
            await ytDl(url, {
                output: downloadPath,
                format: 'bestaudio/best', // Don't restrict to webm
            });
            console.log(`[DOWNLOAD] ✓ Download completed successfully: ${downloadPath}`);
            return;
        } catch (err: any) {
            attempts++;
            const errorMessage = err.stderr || err.stdout || err.message || String(err);
            const errorCode = err.code || err.errno;
            
            console.error(`[DOWNLOAD] ✗ Download failed (attempt ${attempts} of ${maxAttempts})`);
            console.error(`[DOWNLOAD] Error code: ${errorCode}`);
            console.error(`[DOWNLOAD] Error details:`, errorMessage);
            
            // Check for Windows-specific ENOENT errors
            if (errorCode === 'ENOENT' || err.errno === -4058) {
                console.error(`[DOWNLOAD] ENOENT error detected - binary not found or not executable`);
                console.error(`[DOWNLOAD] This is likely a Windows binary path issue`);
                
                // On last attempt, provide helpful error message
                if (attempts >= maxAttempts) {
                    const platform = os.platform();
                    if (platform === 'win32') {
                        const helpfulMessage = `Download failed: yt-dlp binary not found or not executable on Windows. ` +
                            `Please ensure youtube-dl-exec package is properly installed. ` +
                            `The binary should be at: node_modules/youtube-dl-exec/bin/yt-dlp.exe`;
                        console.error(`[DOWNLOAD] ${helpfulMessage}`);
                        throw new Error(helpfulMessage);
                    }
                }
            }
            
            if (attempts >= maxAttempts) {
                console.error(`[DOWNLOAD] ✗ Download failed after ${maxAttempts} attempts. Giving up.`);
                throw new Error(`Download failed after ${maxAttempts} attempts: ${errorMessage}`);
            }
            console.log(`[DOWNLOAD] Retrying download...`);
            
            // Add a small delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
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