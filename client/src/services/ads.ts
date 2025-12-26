// src/services/ads.ts - Ads API client (wrapper for backward compatibility)
// This file maintains backward compatibility while using the centralized API client

import { getAdSlot as getAdSlotApi, recordImpression as recordImpressionApi, recordClick as recordClickApi } from '@/lib/api';
import type { Ad, RecordImpressionRequest, RecordClickRequest } from '@/lib/api/types';

// Re-export types for backward compatibility
export type { Ad };

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

/**
 * Get an ad slot for display
 */
export async function getAdSlot(tags?: string[], guild?: string): Promise<Ad | null> {
  try {
    const result = await getAdSlotApi({ tags, guild });
    return result.ad || null;
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
    const result = await recordImpressionApi(request as RecordImpressionRequest);
    return result.success;
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
    const result = await recordClickApi(request as RecordClickRequest);
    return result.success ? result.redirectUrl : null;
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

