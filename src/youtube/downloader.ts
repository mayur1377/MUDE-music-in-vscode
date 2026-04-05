import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { create } from 'youtube-dl-exec';

function getYtDlpBinaryPath(): string | undefined {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    
    try {
        const youtubeDlExecModulePath = require.resolve('youtube-dl-exec/package.json');
        const youtubeDlExecPath = path.dirname(youtubeDlExecModulePath);
        const binPath = path.join(youtubeDlExecPath, 'bin');
        
        console.log(`[YT-DLP] Platform: ${platform}`);
        console.log(`[YT-DLP] youtube-dl-exec module path: ${youtubeDlExecPath}`);
        console.log(`[YT-DLP] Bin path: ${binPath}`);
        
        if (!fs.existsSync(binPath)) {
            console.error(`[YT-DLP] Bin directory does not exist: ${binPath}`);
            return getYtDlpBinaryPathAlternative();
        }
        
        if (isWindows) {
            const exePath = path.join(binPath, 'yt-dlp.exe');
            const noExtPath = path.join(binPath, 'yt-dlp');
            
            if (fs.existsSync(exePath)) {
                console.log(`[YT-DLP] Found Windows executable: ${exePath}`);
                return exePath;
            }
            
            if (fs.existsSync(noExtPath)) {
                console.log(`[YT-DLP] Found binary without .exe extension: ${noExtPath}`);
                
                try {
                    const stats = fs.statSync(noExtPath);
                    if (stats.isFile()) {
                        if (!fs.existsSync(exePath)) {
                            try {
                                fs.copyFileSync(noExtPath, exePath);
                                if (fs.existsSync(exePath)) {
                                    const copyStats = fs.statSync(exePath);
                                    if (copyStats.size === stats.size) {
                                        return exePath;
                                    }
                                }
                            } catch (copyErr: any) {
                                return undefined;
                            }
                        } else {
                            return exePath;
                        }
                    }
                } catch (statErr: any) {
                    console.error(`[YT-DLP] Error checking file stats: ${statErr.message}`);
                }
            }
            
            return getYtDlpBinaryPathAlternative();
        } else {
            const unixPath = path.join(binPath, 'yt-dlp');
            if (fs.existsSync(unixPath)) {
                console.log(`[YT-DLP] Found Unix binary: ${unixPath}`);
                return unixPath;
            }
            return getYtDlpBinaryPathAlternative();
        }
    } catch (resolveErr: any) {
        console.error(`[YT-DLP] Error resolving youtube-dl-exec module: ${resolveErr.message}`);
        return getYtDlpBinaryPathAlternative();
    }
}

function getYtDlpBinaryPathAlternative(): string | undefined {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    
    try {
        const extensionPath = path.resolve(__dirname, '..', '..');
        const nodeModulesPath = path.join(extensionPath, 'node_modules');
        const youtubeDlExecPath = path.join(nodeModulesPath, 'youtube-dl-exec');
        const binPath = path.join(youtubeDlExecPath, 'bin');
        
        if (!fs.existsSync(binPath)) {
            return undefined;
        }
        
        if (isWindows) {
            const exePath = path.join(binPath, 'yt-dlp.exe');
            const noExtPath = path.join(binPath, 'yt-dlp');
            
            if (fs.existsSync(exePath)) {
                return exePath;
            }
            
            if (fs.existsSync(noExtPath)) {
                try {
                    fs.copyFileSync(noExtPath, exePath);
                    return exePath;
                } catch (err: any) {
                    return undefined;
                }
            }
        } else {
            const unixPath = path.join(binPath, 'yt-dlp');
            if (fs.existsSync(unixPath)) {
                return unixPath;
            }
        }
    } catch (err: any) {}
    
    return undefined;
}

let youtubedl: ReturnType<typeof create> | null = null;

function initializeYoutubeDl(): ReturnType<typeof create> {
    if (youtubedl) {
        return youtubedl;
    }
    
    const binaryPath = getYtDlpBinaryPath();
    
    if (binaryPath) {
        try {
            youtubedl = create(binaryPath);
            return youtubedl;
        } catch (err: any) {
            console.error(`[YT-DLP] Error initializing with custom path: ${err.message}`);
        }
    }
    
    try {
        const defaultYtDl = require('youtube-dl-exec');
        const initialized = typeof defaultYtDl === 'function' ? defaultYtDl : defaultYtDl.default || defaultYtDl;
        youtubedl = initialized as ReturnType<typeof create>;
        return youtubedl;
    } catch (err: any) {
        throw new Error(`Failed to initialize youtube-dl-exec: ${err.message}`);
    }
}

export async function downloadTrack(url: string, downloadPath: string, signal?: AbortSignal): Promise<void> {
    console.log(`[DOWNLOAD] Starting download from URL: ${url}`);
    let attempts = 0;
    const maxAttempts = 3;

    const ytDl = initializeYoutubeDl();

    while (attempts < maxAttempts) {
        if (signal?.aborted) {
            throw new Error('Download cancelled');
        }
        try {
            const subprocess = ytDl.exec(
                url,
                {
                    output: downloadPath,
                    format: 'bestaudio/best',
                },
                { killSignal: 'SIGKILL' }
            );

            const abortHandler = () => {
                try {
                    subprocess.kill('SIGKILL');
                } catch {}
            };

            if (signal) {
                signal.addEventListener('abort', abortHandler, { once: true });
            }

            try {
                await subprocess;
            } finally {
                if (signal) {
                    signal.removeEventListener('abort', abortHandler);
                }
            }

            if (signal?.aborted) {
                throw new Error('Download cancelled');
            }
            console.log(`[DOWNLOAD] ✓ Download completed successfully: ${downloadPath}`);
            return;
        } catch (err: any) {
            if (signal?.aborted) {
                throw err;
            }
            attempts++;
            const errorMessage = err.stderr || err.stdout || err.message || String(err);
            const errorCode = err.code || err.errno;
            
            if (errorCode === 'ENOENT' || err.errno === -4058) {
                if (attempts >= maxAttempts) {
                    const platform = os.platform();
                    if (platform === 'win32') {
                        throw new Error(`Download failed: yt-dlp binary not found or not executable on Windows.`);
                    }
                }
            }
            
            if (attempts >= maxAttempts) {
                throw new Error(`Download failed after ${maxAttempts} attempts: ${errorMessage}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
    }
}
