/**
 * Analytics API endpoints
 * Wrapper functions for analytics-related API calls
 */

import apiClient from './client';
import type {
  PlatformAnalyticsResponse,
  UserAnalyticsResponse,
  TipFeedResponse,
} from './types';

/**
 * Get platform analytics
 */
export async function getPlatformAnalytics(): Promise<PlatformAnalyticsResponse> {
  const response = await apiClient.get<PlatformAnalyticsResponse['data']>(
    '/api/v1/analytics/platform'
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get platform analytics',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(userId: string): Promise<UserAnalyticsResponse> {
  const response = await apiClient.get<UserAnalyticsResponse['data']>(
    `/api/v1/analytics/user/${userId}`
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get user analytics',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get tip feed
 */
export async function getTipFeed(limit: number = 20): Promise<TipFeedResponse> {
  const response = await apiClient.get<TipFeedResponse['data']>(
    `/api/v1/feed?limit=${limit}`
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get tip feed',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

