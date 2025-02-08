import YTMusic from "ytmusic-api";
const ytmusic = new YTMusic();

export const getRecommendations = async (videoUrl: string) => {
  console.log(`Starting scrapeRecommendations for URL: ${videoUrl}`);
  const videoId = videoUrl.split('v=')[1];
  console.log(`Extracted video ID: ${videoId}`);
  
  try {
    // Initialize YTMusic if needed (assuming it's required based on your first code)
    await ytmusic.initialize();

    console.log(`Fetching up next details for video ID: ${videoId}`);
    const upNexts = await ytmusic.getUpNexts(videoId);
    console.log(`Fetched up next details:`, upNexts);
    return upNexts;
  } catch (error) {
    console.error("Error fetching up next details:", error);
  }
  return [];
};
