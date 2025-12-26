/**
 * Moderation and Voice API endpoints
 * Wrapper functions for moderation and voice-related API calls
 */

import apiClient from './client';
import type {
  ModerationCheckRequest,
  ModerationCheckResponse,
  VoiceParseRequest,
  VoiceParseResponse,
  IntelligentTipSuggestionRequest,
  IntelligentTipSuggestionResponse,
} from './types';

/**
 * Check message moderation
 */
export async function checkModeration(
  request: ModerationCheckRequest
): Promise<ModerationCheckResponse> {
  const response = await apiClient.post<ModerationCheckResponse>(
    '/api/v1/moderation/check',
    {
      message: request.message,
      senderId: request.senderId,
      recipientId: request.recipientId,
      context: request.context,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to check moderation',
    };
  }

  // Handle response format
  if (response.data && 'result' in response.data) {
    return {
      success: true,
      result: response.data.result,
    };
  }

  return {
    success: true,
    result: response.data as ModerationCheckResponse['result'],
  };
}

/**
 * Parse voice command transcript
 */
export async function parseVoiceCommand(
  request: VoiceParseRequest
): Promise<VoiceParseResponse> {
  const response = await apiClient.post<VoiceParseResponse['data']>(
    '/api/voice/parse',
    {
      transcript: request.transcript,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to parse voice command',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get intelligent tip suggestion with chat context (GPT-powered)
 */
export async function getIntelligentTipSuggestion(
  request: IntelligentTipSuggestionRequest
): Promise<IntelligentTipSuggestionResponse> {
  const response = await apiClient.post<IntelligentTipSuggestionResponse['data']>(
    '/api/v1/tip/intelligent-suggestion',
    {
      chatContext: request.chatContext,
      recipientId: request.recipientId,
      senderId: request.senderId,
      recipientName: request.recipientName,
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to get intelligent tip suggestion',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

