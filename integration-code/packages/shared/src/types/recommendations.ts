// Recommendation Types

export interface BookRecommendation {
  bookId: string;
  title: string;
  author: string;
  reason: string; // AI-generated explanation for why this book is recommended
}

export interface RecommendationsRequest {
  userId: string;
}

export interface RecommendationsResponse {
  recommendations: BookRecommendation[];
  model: string; // Which model generated these (for demo purposes)
}
