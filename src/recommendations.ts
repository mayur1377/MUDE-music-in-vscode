// Export recommendations and currentRecommendationIndex so they can be used across files.
export let recommendations: { videoId: string; title: string; artists: { artistId: string | null; name: string; }; }[] = [];
export let currentRecommendationIndex = 0;

export function updateRecommendationIndex(newIndex: number) {
    currentRecommendationIndex = newIndex;
}

export function resetRecommendations() {
    recommendations = [];
    currentRecommendationIndex = 0;
}

export function addRecommendation(recommendation: { videoId: string; title: string; artists: { artistId: string | null; name: string; }; }) {
    recommendations.push(recommendation);
}
