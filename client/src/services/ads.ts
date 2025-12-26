// src/services/ads.ts - Ads API client

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Ad {
  id: string;
  advertiser: string;
  title: string;
  description?: string;
  imageUrl?: string;
  targetTags: string[];
  targetGuild?: string;
  impressions: number;
  clicks: number;
}

export interface AdSlotResponse {
  ad: Ad | null;
}

export interface ImpressionRequest {
  adId: string;
  userId?: string;
  ipHash?: string;
}

export interface ClickRequest {
  adId: string;
  userId?: string;
  ipHash?: string;
}

export interface ClickResponse {
  redirectUrl: string;
  success: boolean;
}

/**
 * Get an ad slot for display
 */
export async function getAdSlot(tags?: string[], guild?: string): Promise<Ad | null> {
  try {
    const params = new URLSearchParams();
    if (tags && tags.length > 0) {
      tags.forEach(tag => params.append('tags[]', tag));
    }
    if (guild) {
      params.append('guild', guild);
    }

    const response = await fetch(`${API_BASE_URL}/api/ads/slot?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch ad slot');
    }

    const data: AdSlotResponse = await response.json();
    return data.ad;
  } catch (error) {
    console.error('Error fetching ad slot:', error);
    return null;
  }
}

/**
 * Record an ad impression
 */
export async function recordImpression(request: ImpressionRequest): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ads/impression`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to record impression');
    }

    const data = await response.json();
    return data.success || data.ok || false;
  } catch (error) {
    console.error('Error recording impression:', error);
    return false;
  }
}

/**
 * Record an ad click and get redirect URL
 */
export async function recordClick(request: ClickRequest): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ads/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to record click');
    }

    const data: ClickResponse = await response.json();
    return data.redirectUrl || null;
  } catch (error) {
    console.error('Error recording click:', error);
    return null;
  }
}

/**
 * Get current user ID (if available)
 * This is a placeholder - replace with your actual auth system
 */
export function getCurrentUserId(): string | null {
  // TODO: Replace with actual auth system
  // For now, return null (anonymous impressions/clicks)
  return null;
}

