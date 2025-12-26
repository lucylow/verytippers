/**
 * Tip API endpoints
 * Wrapper functions for tip-related API calls
 */

import apiClient from './client';
import type {
  SendTipRequest,
  SendTipResponse,
  TipStatusResponse,
  TipRecommendationRequest,
  TipRecommendationResponse,
  MessageSuggestionsRequest,
  MessageSuggestionsResponse,
} from './types';

/**
 * Send a tip
 */
export async function sendTip(request: SendTipRequest): Promise<SendTipResponse> {
  const response = await apiClient.post<SendTipResponse['data']>('/api/v1/tip', {
    senderId: request.senderId,
    recipientId: request.recipientId,
    amount: request.amount,
    token: request.token,
    message: request.message,
    contentId: request.contentId,
    signature: request.signature,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error || response.message || 'Failed to send tip',
      errorCode: response.errorCode,
    };
  }

  return {
    success: true,
    message: response.message,
    data: response.data,
  };
}

/**
 * Get tip status
 */
export async function getTipStatus(tipId: string): Promise<TipStatusResponse> {
  const response = await apiClient.get<TipStatusResponse['data']>(`/api/v1/tip/${tipId}`);

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get tip status',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get tip recommendation
 */
export async function getTipRecommendation(
  request: TipRecommendationRequest
): Promise<TipRecommendationResponse> {
  const response = await apiClient.post<TipRecommendationResponse['data']>(
    '/api/v1/tip/recommendation',
    {
      content: request.content,
      authorId: request.authorId,
      contentType: request.contentType,
      recipientId: request.recipientId,
      senderId: request.senderId,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get tip recommendation',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get message suggestions
 */
export async function getMessageSuggestions(
  request: MessageSuggestionsRequest
): Promise<MessageSuggestionsResponse> {
  const response = await apiClient.post<MessageSuggestionsResponse['data']>(
    '/api/v1/tip/message-suggestions',
    {
      recipientName: request.recipientName,
      contentPreview: request.contentPreview,
      tipAmount: request.tipAmount,
      relationship: request.relationship,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get message suggestions',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

