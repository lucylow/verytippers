/**
 * Badge API endpoints
 * Wrapper functions for badge-related API calls
 */

import apiClient from './client';
import type {
  UserBadgesResponse,
  CheckBadgesResponse,
} from './types';

/**
 * Get user badges
 */
export async function getUserBadges(userId: string): Promise<UserBadgesResponse> {
  const response = await apiClient.get<UserBadgesResponse['data']>(
    `/api/v1/badges/user/${userId}`
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get user badges',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Check and award badges for a user
 */
export async function checkBadges(userId: string): Promise<CheckBadgesResponse> {
  const response = await apiClient.post<CheckBadgesResponse['data']>(
    '/api/v1/badges/check',
    { userId }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to check badges',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get user badge statistics
 */
export async function getUserBadgeStats(userId: string): Promise<UserBadgesResponse> {
  const response = await apiClient.get<UserBadgesResponse['data']>(
    `/api/v1/badges/user/${userId}/stats`
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get badge stats',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

