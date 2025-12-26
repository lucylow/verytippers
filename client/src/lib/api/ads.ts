/**
 * Ads API endpoints
 * Wrapper functions for ads-related API calls
 */

import apiClient from './client';
import type {
  GetAdSlotRequest,
  AdSlotResponse,
  RecordImpressionRequest,
  RecordImpressionResponse,
  RecordClickRequest,
  RecordClickResponse,
  CreateAdRequest,
  CreateAdResponse,
  UpdateAdRequest,
  UpdateAdResponse,
  ListAdsResponse,
} from './types';

/**
 * Get an ad slot for display
 */
export async function getAdSlot(
  request?: GetAdSlotRequest
): Promise<AdSlotResponse> {
  const params = new URLSearchParams();
  if (request?.tags && request.tags.length > 0) {
    request.tags.forEach((tag) => params.append('tags[]', tag));
  }
  if (request?.guild) {
    params.append('guild', request.guild);
  }

  const queryString = params.toString();
  const url = queryString
    ? `/api/ads/slot?${queryString}`
    : '/api/ads/slot';

  const response = await apiClient.get<AdSlotResponse>(url);

  if (!response.success) {
    return {
      ad: null,
      error: response.error || 'Failed to get ad slot',
    };
  }

  // Handle both response formats
  if (response.data && 'ad' in response.data) {
    return response.data as AdSlotResponse;
  }

  return {
    ad: (response.data as any)?.ad || null,
  };
}

/**
 * Record an ad impression
 */
export async function recordImpression(
  request: RecordImpressionRequest
): Promise<RecordImpressionResponse> {
  const response = await apiClient.post<RecordImpressionResponse>(
    '/api/ads/impression',
    {
      adId: request.adId,
      userId: request.userId,
      ipHash: request.ipHash,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to record impression',
    };
  }

  return {
    success: response.data?.success ?? response.data?.ok ?? true,
  };
}

/**
 * Record an ad click and get redirect URL
 */
export async function recordClick(
  request: RecordClickRequest
): Promise<RecordClickResponse> {
  const response = await apiClient.post<RecordClickResponse>(
    '/api/ads/click',
    {
      adId: request.adId,
      userId: request.userId,
      ipHash: request.ipHash,
    }
  );

  if (!response.success) {
    return {
      redirectUrl: '',
      success: false,
      error: response.error || 'Failed to record click',
    };
  }

  return {
    redirectUrl: response.data?.redirectUrl || '',
    success: response.data?.success ?? true,
  };
}

/**
 * Create a new ad (admin only)
 */
export async function createAd(
  request: CreateAdRequest
): Promise<CreateAdResponse> {
  const response = await apiClient.post<CreateAdResponse>(
    '/api/admin/ads',
    {
      advertiser: request.advertiser,
      title: request.title,
      description: request.description,
      imageUrl: request.imageUrl,
      targetTags: request.targetTags,
      targetGuild: request.targetGuild,
      url: request.url,
      budget: request.budget,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to create ad',
    };
  }

  return {
    success: true,
    ad: response.data?.ad,
  };
}

/**
 * Update an existing ad (admin only)
 */
export async function updateAd(
  id: string,
  request: UpdateAdRequest
): Promise<UpdateAdResponse> {
  const response = await apiClient.put<UpdateAdResponse>(
    `/api/admin/ads/${id}`,
    {
      advertiser: request.advertiser,
      title: request.title,
      description: request.description,
      imageUrl: request.imageUrl,
      targetTags: request.targetTags,
      targetGuild: request.targetGuild,
      url: request.url,
      budget: request.budget,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to update ad',
    };
  }

  return {
    success: true,
    ad: response.data?.ad,
  };
}

/**
 * List all ads (admin only)
 */
export async function listAds(): Promise<ListAdsResponse> {
  const response = await apiClient.get<ListAdsResponse>('/api/admin/ads');

  if (!response.success) {
    return {
      success: false,
      ads: [],
      error: response.error || 'Failed to list ads',
    };
  }

  return {
    success: true,
    ads: response.data?.ads || [],
  };
}

