/**
 * Rewards API endpoints
 * Wrapper functions for rewards-related API calls
 */

import apiClient from './client';
import type {
  IssueRewardRequest,
  IssueRewardResponse,
  EvaluateRewardRequest,
  EvaluateRewardResponse,
  RewardInfoResponse,
  RewardTableResponse,
} from './types';

/**
 * Issue a reward by requesting signed payload from backend
 */
export async function issueReward(
  request: IssueRewardRequest
): Promise<IssueRewardResponse> {
  const response = await apiClient.post<IssueRewardResponse['data']>(
    '/api/rewards/issue',
    {
      user: request.user,
      actionType: request.actionType,
      context: request.context,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to issue reward',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Evaluate if an action is eligible for reward (without issuing)
 */
export async function evaluateReward(
  request: EvaluateRewardRequest
): Promise<EvaluateRewardResponse> {
  const params = new URLSearchParams();
  params.append('actionType', request.actionType);
  if (request.tipAmount !== undefined) {
    params.append('tipAmount', request.tipAmount.toString());
  }
  if (request.contentQualityScore !== undefined) {
    params.append('contentQualityScore', request.contentQualityScore.toString());
  }
  if (request.streakDays !== undefined) {
    params.append('streakDays', request.streakDays.toString());
  }
  if (request.referralVerified !== undefined) {
    params.append('referralVerified', request.referralVerified.toString());
  }

  const response = await apiClient.get<EvaluateRewardResponse['data']>(
    `/api/rewards/evaluate?${params.toString()}`
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to evaluate reward',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get reward contract information
 */
export async function getRewardInfo(): Promise<RewardInfoResponse> {
  const response = await apiClient.get<RewardInfoResponse['data']>(
    '/api/rewards/info'
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get reward info',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get reward table (action types and amounts)
 */
export async function getRewardTable(): Promise<RewardTableResponse> {
  const response = await apiClient.get<RewardTableResponse['data']>(
    '/api/rewards/table'
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get reward table',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

