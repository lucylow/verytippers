/**
 * Checkout API endpoints
 * Wrapper functions for checkout-related API calls
 */

import apiClient from './client';
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreateMetaTxRequest,
  CreateMetaTxResponse,
  UserBalanceResponse,
  UserOrdersResponse,
} from './types';

/**
 * Create Stripe checkout session to buy credits
 */
export async function createCheckoutSession(
  request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  const response = await apiClient.post<CreateCheckoutSessionResponse>(
    '/api/checkout/stripe-create-session',
    {
      userId: request.userId,
      credits: request.credits,
      success_url: request.success_url,
      cancel_url: request.cancel_url,
    }
  );

  if (!response.success) {
    return {
      error: response.error || 'Failed to create checkout session',
    };
  }

  return response.data || {};
}

/**
 * Create meta-transaction for gasless tipping with credits
 */
export async function createMetaTx(
  request: CreateMetaTxRequest
): Promise<CreateMetaTxResponse> {
  const response = await apiClient.post<CreateMetaTxResponse>(
    '/api/checkout/create-meta-tx',
    {
      userId: request.userId,
      toAddress: request.toAddress,
      amount: request.amount,
      cid: request.cid,
      nonceHint: request.nonceHint,
      fromAddress: request.fromAddress,
      signature: request.signature,
    }
  );

  if (!response.success) {
    return {
      error: response.error || 'Failed to create meta-transaction',
    };
  }

  return response.data || {};
}

/**
 * Get user balance (credits)
 */
export async function getUserBalance(
  userId: string
): Promise<UserBalanceResponse> {
  const response = await apiClient.get<UserBalanceResponse>(
    `/api/checkout/balance/${userId}`
  );

  if (!response.success) {
    return {
      credits: 0,
      userId,
      error: response.error || 'Failed to get user balance',
    };
  }

  return response.data || { credits: 0, userId };
}

/**
 * Get user orders
 */
export async function getUserOrders(
  userId: string
): Promise<UserOrdersResponse> {
  const response = await apiClient.get<{ orders: UserOrdersResponse['orders'] }>(
    `/api/checkout/orders/${userId}`
  );

  if (!response.success) {
    return {
      orders: [],
      error: response.error || 'Failed to get user orders',
    };
  }

  return {
    orders: response.data?.orders || [],
  };
}

