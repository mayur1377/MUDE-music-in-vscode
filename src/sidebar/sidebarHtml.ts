import * as vscode from 'vscode';

export interface MudeSidebarHtmlOptions {
    track: string;
    artist: string;
    status: string;
    imageSrc: string;
    progressPercent: number;
    elapsedSeconds: number;
    elapsedText: string;
    durationText: string;
    durationSeconds: number;
    volumePercent: number;
    isMuted: boolean;
    upcomingRecommendations: { index: number; title: string; artist: string }[];
    currentlyPlayingRecommendationIndex: number;
    trackLoading: boolean;
    recommendationsLoading: boolean;
    /** First-time / nothing played yet: show welcome placeholder instead of stale labels */
    emptyState: boolean;
    cssContent: string;
}

export function getMudeSidebarHtml(options: MudeSidebarHtmlOptions): string {
    const {
        track,
        artist,
        status,
        imageSrc,
        progressPercent,
        elapsedSeconds,
        elapsedText,
        durationText,
        durationSeconds,
        volumePercent,
        isMuted,
        upcomingRecommendations,
        currentlyPlayingRecommendationIndex,
        trackLoading,
        recommendationsLoading,
        emptyState,
        cssContent
    } = options;

    const controls = [
        { command: 'playPrevious', icon: '⏮', title: 'Previous' },
        { command: 'seekBackword', icon: '◁', title: 'Back 10s' },
        { command: 'togglePause', icon: status === 'Playing' ? '⏸' : '▶', title: 'Play/Pause' },
        { command: 'seekForward', icon: '▷', title: 'Forward 10s' },
        { command: 'playNext', icon: '⏭', title: 'Next' },
    ];
    const recommendationsHtml = recommendationsLoading
        ? skeletonRecommendationsRows(6)
        : upcomingRecommendations.length
            ? upcomingRecommendations
                    .map(
                        (rec) => `
        <button type="button" class="rec-item ${rec.index === currentlyPlayingRecommendationIndex ? 'rec-item-active' : ''}" data-index="${rec.index}" title="${escapeHtml(rec.title)}">
            <span class="rec-title">${escapeHtml(rec.title)}</span>
            <span class="rec-artist">${escapeHtml(rec.artist)}</span>
        </button>`
                    )
                    .join('')
            : emptyState
                ? `<div class="rec-empty rec-empty-placeholder">Songs you might like will show up here after you start playing.</div>`
                : `<div class="rec-empty">No recommendations available</div>`;

    const trackInfoBlock = trackLoading
        ? `
        <div class="track-label"><span class="skeleton skeleton-line skeleton-line-title" aria-hidden="true"></span></div>
        <div class="track-meta"><span class="skeleton skeleton-line skeleton-line-meta" aria-hidden="true"></span></div>
        <div class="progress-wrap progress-wrap-skeleton">
            <div class="skeleton skeleton-slider-bar" aria-hidden="true"></div>
            <div class="progress-time progress-time-skeleton">
                <span class="skeleton skeleton-line skeleton-line-time" aria-hidden="true"></span>
                <span class="skeleton skeleton-line skeleton-line-time" aria-hidden="true"></span>
            </div>
        </div>`
        : emptyState
        ? `
        <div class="track-label track-empty-title">Welcome to MUDE</div>
        <div class="track-meta track-empty-hint">Search for a song to start listening. Use the button above or press <kbd class="kbd-hint" aria-label="Slash key">/</kbd> in this panel.</div>
        <div class="progress-wrap progress-wrap-empty">
            <div
                class="slider slider-disabled"
                id="seekSlider"
                role="slider"
                tabindex="-1"
                aria-label="Seek"
                aria-disabled="true"
                aria-valuemin="0"
                aria-valuemax="0"
                aria-valuenow="0"
                data-duration="0"
            >
                <div class="slider-track">
                    <div class="slider-range" style="width: 0%;"></div>
                </div>
                <div class="slider-thumb" style="left: 0%;"></div>
            </div>
            <div class="progress-time">
                <span>0:00</span>
                <span>0:00</span>
            </div>
        </div>`
        : `
        <div class="track-label marquee-wrapper" data-marquee-id="title"><div class="marquee-content">${escapeHtml(track)}</div></div>
        <div class="track-meta marquee-wrapper" data-marquee-id="artist"><div class="marquee-content">${escapeHtml(artist || 'Unknown Artist')}</div></div>
        <div class="progress-wrap">
            <div
                class="slider"
                id="seekSlider"
                role="slider"
                tabindex="0"
                aria-label="Seek"
                aria-valuemin="0"
                aria-valuemax="${Math.max(0, Math.floor(durationSeconds))}"
                aria-valuenow="${Math.max(0, Math.floor(elapsedSeconds))}"
                data-duration="${Math.max(0, Math.floor(durationSeconds))}"
            >
                <div class="slider-track">
                    <div class="slider-range" style="width: ${progressPercent.toFixed(2)}%;"></div>
                </div>
                <div class="slider-thumb" style="left: ${progressPercent.toFixed(2)}%;"></div>
            </div>
            <div class="progress-time">
                <span>${escapeHtml(elapsedText)}</span>
                <span>${escapeHtml(durationText)}</span>
            </div>
        </div>`;

    const thumbnailBlock = trackLoading
        ? `<div class="thumbnail-frame thumbnail-frame-loading" aria-busy="true"><div class="skeleton skeleton-thumb" aria-hidden="true"></div></div>`
        : emptyState
        ? `<div class="thumbnail-frame thumbnail-placeholder-wrap" aria-hidden="true"><img class="thumbnail-placeholder-img" src="${escapeHtml(imageSrc)}" alt="" /></div>`
        : `<div class="thumbnail-frame"><img src="${escapeHtml(imageSrc)}" alt="Album Art" /></div>`;

    const safeVolumePercent = Math.max(0, Math.min(100, Number.isFinite(volumePercent) ? volumePercent : 70));

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${cssContent}</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <button type="button" class="button-search btn btn-icon" id="search" title="Search Music" aria-label="Search Music">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <circle cx="11" cy="11" r="7"></circle>
                    <path d="M20 20l-3.5-3.5"></path>
                </svg>
            </button>
            <div class="volume-popover">
                <button type="button" class="btn btn-icon ${isMuted ? 'speaker-muted' : ''}" id="speakerBtn" title="${isMuted ? 'Unmute' : 'Mute'}" aria-label="Toggle mute">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                        ${isMuted ? `<path d="M23 9l-6 6"></path><path d="M17 9l6 6"></path>` : `<path d="M15 9a5 5 0 010 6"></path><path d="M17.5 6.5a9 9 0 010 11"></path>`}
                    </svg>
                </button>
                <div class="volume-panel" role="group" aria-label="Volume">
                    <div
                        class="slider slider-small"
                        id="volumeSlider"
                        role="slider"
                        tabindex="0"
                        aria-label="Volume"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="${Math.round(safeVolumePercent)}"
                    >
                        <div class="slider-track">
                            <div class="slider-range" style="width: ${safeVolumePercent.toFixed(2)}%;"></div>
                        </div>
                        <div class="slider-thumb" style="left: ${safeVolumePercent.toFixed(2)}%;"></div>
                    </div>
                </div>
            </div>
        </div>
    <div class="track${emptyState ? ' track-empty' : ''}">
        <div class="thumbnail">
            ${thumbnailBlock}
        </div>
        <div class="track-stack">
            <div class="track-info">
                ${trackInfoBlock}
            </div>
            <div class="controls">
                <div class="controls-center">
                    ${controls
                        .map((c) =>
                            `<button type="button" class="control-button btn btn-icon" title="${c.title}" data-command="${c.command}">${c.icon}</button>`
                        )
                        .join('')}
                </div>
            </div>
        </div>
    </div>
    <div class="recommendations">
        <h3>Up Next</h3>
        <div class="rec-list" id="recList" ${recommendationsLoading ? 'aria-busy="true"' : ''}>${recommendationsHtml}</div>
    </div>
</div>
<script>
    const vscode = acquireVsCodeApi();
    let persisted = vscode.getState() || {};

	    const setupMarquee = (wrapper) => {
	        const content = wrapper.querySelector('.marquee-content');
	        if (!content) return;

	        if (content.dataset.original === undefined) {
	            content.dataset.original = content.innerHTML;
	        }
	        const original = content.dataset.original;

	        wrapper.classList.remove('marquee-on');
	        content.classList.remove('marquee-active');
	        content.style.removeProperty('--marquee-distance');
	        content.style.removeProperty('--marquee-duration');
	        content.style.animationDelay = '0s';
	        content.innerHTML = original;
	        content.style.transform = 'translate3d(0, 0, 0)';

	        const availableWidth = wrapper.clientWidth;
	        const contentWidth = content.scrollWidth;
	        if (!availableWidth || contentWidth <= availableWidth + 1) {
	            return;
	        }

	        const marqueeId = wrapper.getAttribute('data-marquee-id') || 'default';
	        const marqueeState = persisted && typeof persisted === 'object' ? persisted.marquee : undefined;
	        const saved = marqueeState && typeof marqueeState === 'object' ? marqueeState[marqueeId] : undefined;
	        const nowMs = Date.now();
	        let startMs = nowMs;
	        if (saved && typeof saved === 'object' && saved) {
	            const savedText = saved.text;
	            const savedStart = saved.startMs;
	            if (typeof savedText === 'string' && savedText === original && typeof savedStart === 'number' && Number.isFinite(savedStart)) {
	                startMs = savedStart;
	            }
	        }
	        if (startMs === nowMs) {
	            const nextState = {
	                ...persisted,
	                marquee: {
	                    ...(marqueeState && typeof marqueeState === 'object' ? marqueeState : {}),
	                    [marqueeId]: { text: original, startMs }
	                }
	            };
	            vscode.setState(nextState);
	            persisted = nextState;
	        }

	        wrapper.classList.add('marquee-on');
	        content.innerHTML =
	            '<span class="marquee-item">' + original + '</span>' +
	            '<span class="marquee-item" aria-hidden="true">' + original + '</span>';

	        const firstItem = content.querySelector('.marquee-item');
	        if (!firstItem) return;

	        const styles = getComputedStyle(content);
	        const gapPx = parseFloat(styles.columnGap || styles.gap || '0') || 0;
	        const distance = firstItem.scrollWidth + gapPx;

	        const speedPxPerSecond = 38;
	        const durationSeconds = Math.max(6, Math.min(40, distance / speedPxPerSecond));

	        content.style.setProperty('--marquee-distance', distance + 'px');
	        content.style.setProperty('--marquee-duration', durationSeconds + 's');
	        content.classList.add('marquee-active');

	        const phaseSeconds = ((Date.now() - startMs) / 1000) % durationSeconds;
	        content.style.animationDelay = (-phaseSeconds).toFixed(3) + 's';
	    };

	    const resizeObserver = new ResizeObserver(entries => {
	        for (const entry of entries) {
	            setupMarquee(entry.target);
	        }
	    });

	    document.querySelectorAll('.marquee-wrapper').forEach(wrapper => {
	        resizeObserver.observe(wrapper);
	        requestAnimationFrame(() => setupMarquee(wrapper));
	    });

    document.addEventListener('keydown', (event) => {
        // Ignore if active element is an input (for future-proofing)
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

        if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault();
            vscode.postMessage({ command: 'togglePause' });
        } else if (event.key === '/') {
            event.preventDefault();
            vscode.postMessage({ command: 'searchMusic' });
        }
    });

    const notifyDragging = (isDragging) => {
        vscode.postMessage({ command: 'setDraggingState', dragging: isDragging });
    };

    const popover = document.querySelector('.volume-popover');
    if (popover) {
        if (popover.matches(':hover')) {
            vscode.postMessage({ command: 'setHoveringVolume', hovering: true });
        }
        popover.addEventListener('mouseenter', () => {
            vscode.postMessage({ command: 'setHoveringVolume', hovering: true });
        });
        popover.addEventListener('mouseleave', () => {
            vscode.postMessage({ command: 'setHoveringVolume', hovering: false });
        });
    }

    document.getElementById('search').addEventListener('click', () => {
        vscode.postMessage({ command: 'searchMusic' });
    });
    document.querySelectorAll('.control-button').forEach((btn) => {
        btn.addEventListener('click', () => {
            vscode.postMessage({ command: btn.getAttribute('data-command') });
        });
    });
    document.querySelectorAll('.rec-item').forEach((item) => {
        item.addEventListener('click', () => {
            const index = Number(item.getAttribute('data-index'));
            if (Number.isFinite(index)) {
                vscode.postMessage({ command: 'playRecommendation', index });
            }
        });
    });
	    const recList = document.getElementById('recList');
	    if (recList) {
	        if (typeof persisted.recListScrollTop === 'number') {
	            recList.scrollTop = persisted.recListScrollTop;
	        }
	        recList.addEventListener('scroll', () => {
	            const nextState = {
	                ...persisted,
	                recListScrollTop: recList.scrollTop,
	            };
	            vscode.setState(nextState);
	            persisted = nextState;
	        });
	    }
    const seekSlider = document.getElementById('seekSlider');
    const totalDuration = ${Number.isFinite(durationSeconds) ? durationSeconds : 0};
    const trackLoadingUi = ${trackLoading ? 'true' : 'false'};
    const emptyStateUi = ${emptyState ? 'true' : 'false'};
    if (!trackLoadingUi && !emptyStateUi && seekSlider && totalDuration > 0) {
        const range = seekSlider.querySelector('.slider-range');
        const thumb = seekSlider.querySelector('.slider-thumb');
        let dragging = false;
        let pendingSeconds = null;

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const percentFromEvent = (event) => {
            const rect = seekSlider.getBoundingClientRect();
            const x = clamp(event.clientX - rect.left, 0, rect.width || 1);
            return clamp((x / (rect.width || 1)) * 100, 0, 100);
        };
            const setPercent = (percent) => {
                if (range) range.style.width = percent + '%';
                if (thumb) thumb.style.left = percent + '%';
                const seconds = (percent / 100) * totalDuration;
                pendingSeconds = seconds;
                seekSlider.setAttribute('aria-valuenow', String(Math.max(0, Math.floor(seconds))));
            };

        const onPointerDown = (event) => {
            dragging = true;
            notifyDragging(true);
            seekSlider.setPointerCapture?.(event.pointerId);
            setPercent(percentFromEvent(event));
        };
        const onPointerMove = (event) => {
            if (!dragging) return;
            setPercent(percentFromEvent(event));
        };
        const onPointerUp = (event) => {
            if (!dragging) return;
            dragging = false;
            notifyDragging(false);
            seekSlider.releasePointerCapture?.(event.pointerId);
            if (typeof pendingSeconds === 'number' && Number.isFinite(pendingSeconds)) {
                vscode.postMessage({ command: 'seekTo', seconds: pendingSeconds });
            }
        };

        seekSlider.addEventListener('pointerdown', onPointerDown);
        seekSlider.addEventListener('pointermove', onPointerMove);
        seekSlider.addEventListener('pointerup', onPointerUp);
        seekSlider.addEventListener('pointercancel', () => { dragging = false; notifyDragging(false); });

        seekSlider.addEventListener('keydown', (event) => {
            const step = event.shiftKey ? 10 : 5;
            let next = Number(seekSlider.getAttribute('aria-valuenow') || '0');
            if (event.key === 'ArrowLeft') next -= step;
            else if (event.key === 'ArrowRight') next += step;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = totalDuration;
            else return;

            event.preventDefault();
            next = clamp(next, 0, totalDuration);
            setPercent((next / totalDuration) * 100);
            vscode.postMessage({ command: 'seekTo', seconds: next });
        });
    }

    const speakerBtn = document.getElementById('speakerBtn');
    if (speakerBtn) {
        speakerBtn.addEventListener('click', () => {
            const isMutedNow = speakerBtn.classList.toggle('speaker-muted');
            speakerBtn.title = isMutedNow ? 'Unmute' : 'Mute';
            speakerBtn.setAttribute('aria-label', isMutedNow ? 'Unmute' : 'Mute');
            
            const svg = speakerBtn.querySelector('svg');
            if (svg) {
                const speakerBody = '<path d="M11 5L6 9H2v6h4l5 4V5z"></path>';
                const mutedPaths = '<path d="M23 9l-6 6"></path><path d="M17 9l6 6"></path>';
                const unmutedPaths = '<path d="M15 9a5 5 0 010 6"></path><path d="M17.5 6.5a9 9 0 010 11"></path>';
                svg.innerHTML = speakerBody + (isMutedNow ? mutedPaths : unmutedPaths);
            }
            
            vscode.postMessage({ command: 'toggleMute' });
        });
    }

    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        const range = volumeSlider.querySelector('.slider-range');
        const thumb = volumeSlider.querySelector('.slider-thumb');
        let dragging = false;
        let pendingPercent = null;
        let lastSentAt = 0;

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const percentFromEvent = (event) => {
            const rect = volumeSlider.getBoundingClientRect();
            const x = clamp(event.clientX - rect.left, 0, rect.width || 1);
            return clamp((x / (rect.width || 1)) * 100, 0, 100);
        };
        const setPercent = (percent) => {
            if (range) range.style.width = percent + '%';
            if (thumb) thumb.style.left = percent + '%';
            pendingPercent = percent;
            volumeSlider.setAttribute('aria-valuenow', String(Math.round(percent)));
        };
        const postVolume = (percent) => {
            const now = Date.now();
            if (now - lastSentAt < 80) return;
            lastSentAt = now;
            vscode.postMessage({ command: 'setVolume', volume: percent });
        };

        const onPointerDown = (event) => {
            dragging = true;
            notifyDragging(true);
            volumeSlider.setPointerCapture?.(event.pointerId);
            const percent = percentFromEvent(event);
            setPercent(percent);
            postVolume(percent);
        };
        const onPointerMove = (event) => {
            if (!dragging) return;
            const percent = percentFromEvent(event);
            setPercent(percent);
            postVolume(percent);
        };
        const onPointerUp = (event) => {
            if (!dragging) return;
            dragging = false;
            notifyDragging(false);
            volumeSlider.releasePointerCapture?.(event.pointerId);
            if (typeof pendingPercent === 'number' && Number.isFinite(pendingPercent)) {
                vscode.postMessage({ command: 'setVolume', volume: pendingPercent });
            }
        };

        volumeSlider.addEventListener('pointerdown', onPointerDown);
        volumeSlider.addEventListener('pointermove', onPointerMove);
        volumeSlider.addEventListener('pointerup', onPointerUp);
        volumeSlider.addEventListener('pointercancel', () => { dragging = false; notifyDragging(false); });

        volumeSlider.addEventListener('keydown', (event) => {
            const step = event.shiftKey ? 10 : 5;
            let next = Number(volumeSlider.getAttribute('aria-valuenow') || '0');
            if (event.key === 'ArrowLeft') next -= step;
            else if (event.key === 'ArrowRight') next += step;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = 100;
            else return;

            event.preventDefault();
            next = clamp(next, 0, 100);
            setPercent(next);
            vscode.postMessage({ command: 'setVolume', volume: next });
        });
    }
</script>
</body>
</html>`;
}

/** Placeholder rows while recommendations are fetched (shadcn-style skeleton). */
function skeletonRecommendationsRows(count: number): string {
    return Array.from({ length: count }, () => `
        <div class="rec-item rec-skeleton" aria-hidden="true">
            <span class="skeleton skeleton-rec-title"></span>
            <span class="skeleton skeleton-rec-artist"></span>
        </div>`).join('');
}

export function stripCodicons(value: string): string {
    return value.replace(/\$\([^)]+\)\s*/g, '').trim();
}

export function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '0:00';
    }
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
