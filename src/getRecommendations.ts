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
    return upNexts;
  } catch (error) {
    console.error(`[RECOMMENDATIONS] ✗ Error fetching up next details for video ID ${videoId}:`, error);
  }
  return [];
};
