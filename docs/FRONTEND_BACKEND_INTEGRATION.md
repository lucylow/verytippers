# Frontend-Backend Integration Improvements

This document outlines the improvements made to the frontend-backend integration.

## Overview

The frontend-backend integration has been significantly improved with:
- ✅ Centralized API client
- ✅ Shared TypeScript types
- ✅ Consistent error handling
- ✅ Automatic retry logic
- ✅ Request/response interceptors
- ✅ Type safety throughout

## Key Changes

### 1. Centralized API Client (`client/src/lib/api/client.ts`)

**Before:** Components used raw `fetch` calls with inconsistent error handling:
```typescript
const response = await fetch('/api/v1/tip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ senderId, recipientId, amount, token })
});
const data = await response.json();
if (!response.ok) {
  throw new Error(data.error || 'Failed to send tip');
}
```

**After:** Components use typed API functions:
```typescript
import { sendTip } from '@/lib/api';
const result = await sendTip({
  senderId,
  recipientId,
  amount,
  token
});
if (!result.success) {
  throw new Error(result.error || 'Failed to send tip');
}
```

**Benefits:**
- Consistent error handling across all API calls
- Automatic retry logic for network errors and 5xx responses
- Request timeouts with abort controllers
- Type-safe requests and responses
- Request/response interceptors for authentication, logging, etc.

### 2. Shared TypeScript Types (`client/src/lib/api/types.ts`)

All API request and response types are now defined in a central location, ensuring:
- Type safety across the frontend
- Better IDE autocomplete
- Compile-time error checking
- Consistency between frontend and backend

### 3. API Endpoint Wrappers

Organized API functions by domain:
- **Tips** (`client/src/lib/api/tips.ts`): `sendTip`, `getTipStatus`, `getTipRecommendation`, `getMessageSuggestions`
- **Analytics** (`client/src/lib/api/analytics.ts`): `getPlatformAnalytics`, `getUserAnalytics`, `getTipFeed`
- **Badges** (`client/src/lib/api/badges.ts`): `getUserBadges`, `checkBadges`, `getUserBadgeStats`

### 4. Error Handling

Three error classes for different error scenarios:
- `ApiError`: General API errors with status codes
- `NetworkError`: Network connectivity issues
- `TimeoutError`: Request timeout errors

All errors include:
- User-friendly error messages
- Status codes (when applicable)
- Error codes for programmatic handling
- Original error data for debugging

### 5. Retry Logic

Automatic retry for:
- Network errors (connection failures)
- Timeout errors
- 5xx server errors (500, 502, 503, 504)
- Rate limiting (429)
- Request timeout (408)

Configurable per request:
```typescript
await apiClient.post('/api/v1/tip', data, {
  retry: {
    attempts: 5,
    delay: 2000,
    retryableStatusCodes: [500, 502, 503]
  }
});
```

### 6. Request Interceptors

Support for adding authentication, logging, etc.:

```typescript
import { setupDefaultInterceptors } from '@/lib/api/interceptors';

setupDefaultInterceptors({
  getAuthToken: () => localStorage.getItem('authToken'),
  getUserId: () => wallet.address || null
});
```

### 7. Updated Components

The following components have been updated to use the centralized API client:
- `TipForm.tsx` - Send tips
- `TipRecommendation.tsx` - Get AI recommendations
- `TipSuggestions.tsx` - Get message suggestions
- `WalletButton.tsx` - Get user analytics
- `SocialActivityPanel.tsx` - Get tip feed and platform analytics
- `SocialProfile.tsx` - Get user analytics
- `WalletConnect.tsx` - Get platform analytics
- `BadgeDisplay.tsx` - Get user badges
- `useAchievementEngine.ts` - Check badges

## Migration Guide

### Step 1: Import API functions

Replace raw `fetch` calls with typed API functions:

```typescript
// Before
import { fetch } from '...';

// After
import { sendTip, getUserAnalytics } from '@/lib/api';
```

### Step 2: Update API calls

Replace fetch logic with API function calls:

```typescript
// Before
const response = await fetch('/api/v1/tip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ senderId, recipientId, amount, token })
});
const data = await response.json();

// After
const result = await sendTip({ senderId, recipientId, amount, token });
if (result.success) {
  const data = result.data;
}
```

### Step 3: Update error handling

Use typed error classes:

```typescript
// Before
try {
  // fetch call
} catch (error) {
  console.error('Error:', error);
}

// After
import { ApiError, NetworkError } from '@/lib/api';
try {
  const result = await sendTip({ ... });
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network errors
  } else if (error instanceof ApiError) {
    // Handle API errors
  }
}
```

## Configuration

### Environment Variables

The API client uses `VITE_API_URL` environment variable (optional):

```env
VITE_API_URL=http://localhost:3001
```

If not set, the client uses relative paths (recommended for same-origin requests).

### Default Configuration

- **Timeout**: 30 seconds
- **Retry attempts**: 3
- **Retry delay**: 1 second
- **Retryable status codes**: 408, 429, 500, 502, 503, 504

## Best Practices

1. **Always use typed API functions** instead of raw `fetch` calls
2. **Check `result.success`** before accessing `result.data`
3. **Use try/catch** for operations that can fail
4. **Use request interceptors** for authentication instead of adding headers manually
5. **Configure retry logic** for critical operations
6. **Use appropriate timeouts** for long-running operations
7. **Handle errors appropriately** - show user-friendly messages

## Future Improvements

Potential future enhancements:
- Request/response caching
- Request deduplication
- Request queue management
- Offline support
- Request cancellation
- Progress tracking for uploads
- WebSocket support integration

## Files Changed

### New Files
- `client/src/lib/api/client.ts` - Centralized API client
- `client/src/lib/api/types.ts` - Shared TypeScript types
- `client/src/lib/api/tips.ts` - Tip API functions
- `client/src/lib/api/analytics.ts` - Analytics API functions
- `client/src/lib/api/badges.ts` - Badge API functions
- `client/src/lib/api/interceptors.ts` - Request/response interceptors
- `client/src/lib/api/index.ts` - Main export file
- `client/src/lib/api/README.md` - API client documentation

### Updated Files
- `client/src/components/TipForm.tsx`
- `client/src/components/TipRecommendation.tsx`
- `client/src/components/TipSuggestions.tsx`
- `client/src/components/WalletButton.tsx`
- `client/src/components/SocialActivityPanel.tsx`
- `client/src/components/SocialProfile.tsx`
- `client/src/components/WalletConnect.tsx`
- `client/src/components/BadgeDisplay.tsx`
- `client/src/hooks/useAchievementEngine.ts`

## Testing

To test the integration:

1. **Test API calls**: Verify all API functions work correctly
2. **Test error handling**: Verify errors are handled appropriately
3. **Test retry logic**: Verify requests are retried on failures
4. **Test interceptors**: Verify authentication headers are added
5. **Test timeout**: Verify requests timeout after specified duration

## Support

For questions or issues:
- See `client/src/lib/api/README.md` for detailed usage documentation
- Check component implementations for examples
- Review error handling patterns in updated components

