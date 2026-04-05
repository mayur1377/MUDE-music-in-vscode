import YTMusic from "ytmusic-api";
const ytmusic = new YTMusic();

export const getRecommendations = async (videoUrl: string) => {
  console.log(`[RECOMMENDATIONS] Getting recommendations for URL: ${videoUrl}`);
  const videoId = videoUrl.split('v=')[1];
  console.log(`[RECOMMENDATIONS] Extracted video ID: ${videoId}`);
  
  try {
    // Initialize YTMusic if needed (assuming it's required based on your first code)
    console.log(`[RECOMMENDATIONS] Initializing YTMusic API...`);
    await ytmusic.initialize();
    console.log(`[RECOMMENDATIONS] YTMusic initialized successfully`);

    console.log(`[RECOMMENDATIONS] Fetching up next recommendations for video ID: ${videoId}`);
    const upNexts = await ytmusic.getUpNexts(videoId);
    console.log(`[RECOMMENDATIONS] ✓ Fetched ${upNexts.length} recommendations`);
    
    // Transform recommendations to include thumbnail URLs
    const transformedRecommendations = upNexts.map((rec: any) => {
      const videoId = rec.videoId;
      const artistName = getArtistName(rec);
      const result = {
        videoId,
        title: rec.name || rec.title,
        artistName,
        // Prefer deterministic high-quality thumbnail from video id.
        thumbnailUrl: getBestThumbnailUrl(videoId, rec.thumbnails?.[0]?.url || '')
      };
      console.log(`[RECOMMENDATIONS] Transformed: "${result.title}" by "${result.artistName}"`);
      return result;
    });
    
    console.log(`[RECOMMENDATIONS] Transformed ${transformedRecommendations.length} recommendations with thumbnails`);
    return transformedRecommendations;
  } catch (error) {
    console.error(`[RECOMMENDATIONS] ✗ Error fetching up next details for video ID ${videoId}:`, error);
  }
  return [];
};

function getBestThumbnailUrl(videoId: string, fallbackUrl: string): string {
  if (videoId && videoId.trim()) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  return normalizeThumbnailQuality(fallbackUrl);
}

function normalizeThumbnailQuality(url: string): string {
  if (!url) {
    return '';
  }
  // Upgrade common YTMusic thumbnail sizing segment to a larger one.
  return url.replace(/=w\d+-h\d+(-[a-z0-9-]+)?/i, '=w544-h544');
}

function getArtistName(rec: any): string {
  console.log(`[ARTIST] Processing recommendation:`, JSON.stringify(rec, null, 2));
  
  const directCandidates = [
    rec?.artist?.name,
    rec?.artistName,
    rec?.artists,
    rec?.byline,
    rec?.owner,
    rec?.artists?.[0]?.name,
    rec?.authors?.[0]?.name,
  ];
  
  console.log(`[ARTIST] Direct candidates:`, directCandidates);
  
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      console.log(`[ARTIST] Found artist name: "${candidate.trim()}"`);
      return candidate.trim();
    }
  }

  // Some YTMusic items expose "Artist • Album" in subtitle/runs.
  const subtitle = typeof rec?.subtitle === 'string' ? rec.subtitle : '';
  if (subtitle.trim()) {
    const fromSubtitle = subtitle.split('•')[0]?.trim();
    if (fromSubtitle) {
      console.log(`[ARTIST] Found artist from subtitle: "${fromSubtitle}"`);
      return fromSubtitle;
    }
  }

  if (Array.isArray(rec?.subtitle?.runs) && rec.subtitle.runs.length > 0) {
    const text = rec.subtitle.runs
      .map((r: any) => (typeof r?.text === 'string' ? r.text.trim() : ''))
      .filter(Boolean)
      .join(' ');
    if (text) {
      const fromRuns = text.split('•')[0]?.trim();
      if (fromRuns) {
        console.log(`[ARTIST] Found artist from runs: "${fromRuns}"`);
        return fromRuns;
      }
    }
  }

  console.log(`[ARTIST] No artist name found, returning empty string`);
  return '';
}
