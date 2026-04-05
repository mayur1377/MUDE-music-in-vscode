// Export recommendations and currentRecommendationIndex so they can be used across files.
export let recommendations: { videoId: string, title: string, thumbnailUrl?: string, artistName?: string }[] = [];
export let currentRecommendationIndex = 0;

export function resetRecommendations() {
    recommendations.length = 0;  // clear the in-memory array
    currentRecommendationIndex = 0;
}

export function addRecommendation(recommendation: { videoId: string, title: string, thumbnailUrl?: string, artistName?: string }) {
    recommendations.push(recommendation);
}

export function updateRecommendationIndex(index: number) {
    currentRecommendationIndex = index;
}
