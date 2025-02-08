// Export recommendations and currentRecommendationIndex so they can be used across files.
export let recommendations: { videoId: string, title: string }[] = [];
export let currentRecommendationIndex = 0;

export function resetRecommendations() {
    recommendations = [];
    currentRecommendationIndex = 0;
}

export function addRecommendation(recommendation: { videoId: string, title: string }) {
    recommendations.push(recommendation);
}

export function updateRecommendationIndex(index: number) {
    currentRecommendationIndex = index;
}
