import React, { useEffect, useState } from 'react';
import {
  Container,
  Header,
  Cards,
  Box,
  SpaceBetween,
  Badge,
  Spinner,
  Alert,
} from '@cloudscape-design/components';
import { useAuth } from '../context/AuthContext';

interface BookRecommendation {
  bookId: string;
  title: string;
  author: string;
  reason: string;
}

interface RecommendationsResponse {
  recommendations: BookRecommendation[];
  model: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const RecommendationsSection: React.FC = () => {
  const { token } = useAuth();
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [model, setModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/recommendations`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data: RecommendationsResponse = await response.json();
        setRecommendations(data.recommendations);
        setModel(data.model);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Unable to load recommendations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchRecommendations();
    }
  }, [token]);

  // Extract model name for display (e.g., "claude-3-5-sonnet" from full ID)
  const getModelDisplayName = (modelId: string): string => {
    if (modelId.includes('opus')) return 'Claude Opus';
    if (modelId.includes('sonnet')) return 'Claude Sonnet';
    return modelId.split('.').pop() || modelId;
  };

  if (!token) {
    return null; // Don't show recommendations for unauthenticated users
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Personalized picks based on your reading history"
          actions={
            model && (
              <Badge color="blue">
                Powered by {getModelDisplayName(model)}
              </Badge>
            )
          }
        >
          Recommended for You
        </Header>
      }
    >
      {loading ? (
        <Box textAlign="center" padding="xl">
          <Spinner size="large" />
          <Box variant="p" color="text-body-secondary" margin={{ top: 's' }}>
            Generating personalized recommendations...
          </Box>
        </Box>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : (
        <Cards
          items={recommendations}
          cardDefinition={{
            header: (item) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Box fontWeight="bold">{item.title}</Box>
              </SpaceBetween>
            ),
            sections: [
              {
                id: 'author',
                header: 'Author',
                content: (item) => item.author,
              },
              {
                id: 'reason',
                header: 'Why we recommend it',
                content: (item) => (
                  <Box color="text-body-secondary" fontSize="body-s">
                    {item.reason}
                  </Box>
                ),
              },
            ],
          }}
          cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 3 }]}
          empty={
            <Box textAlign="center" color="inherit">
              <b>No recommendations yet</b>
              <Box variant="p" color="inherit">
                Browse our catalog and make a purchase to get personalized recommendations!
              </Box>
            </Box>
          }
        />
      )}
    </Container>
  );
};

export default RecommendationsSection;
