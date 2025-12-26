# API Client

Centralized API client for frontend-backend communication with consistent error handling, retry logic, and type safety.

## Features

- ✅ **Centralized API Client** - Single point of entry for all API calls
- ✅ **Type Safety** - Shared TypeScript types for requests and responses
- ✅ **Error Handling** - Consistent error handling with typed error classes
- ✅ **Retry Logic** - Automatic retry for failed requests (network errors, timeouts, 5xx)
- ✅ **Request Interceptors** - Add authentication, logging, etc.
- ✅ **Response Interceptors** - Transform responses before returning
- ✅ **Error Interceptors** - Handle errors consistently
- ✅ **Timeout Handling** - Configurable request timeouts
- ✅ **Standardized API Responses** - Consistent response format

## Usage

### Basic API Calls

```typescript
import { sendTip, getTipRecommendation, getUserAnalytics } from '@/lib/api';

// Send a tip
const result = await sendTip({
  senderId: '0x123...',
  recipientId: '0x456...',
  amount: '10.5',
  token: 'VERY',
  message: 'Great content!'
});

if (result.success) {
  console.log('Tip sent:', result.data?.tipId);
} else {
  console.error('Error:', result.error);
}

// Get tip recommendation
const recommendation = await getTipRecommendation({
  content: 'Great article about Web3...',
  authorId: '0x789...'
});

// Get user analytics
const analytics = await getUserAnalytics('0x123...');
```

### Direct API Client Usage

```typescript
import apiClient from '@/lib/api/client';

// GET request
const response = await apiClient.get('/api/v1/users/123');

// POST request
const response = await apiClient.post('/api/v1/tip', {
  senderId: '0x123...',
  recipientId: '0x456...',
  amount: '10.5',
  token: 'VERY'
});

// With custom configuration
const response = await apiClient.post(
  '/api/v1/tip',
  { ...data },
  {
    timeout: 60000, // 60 seconds
    retry: {
      attempts: 5,
      delay: 2000,
      retryableStatusCodes: [500, 502, 503]
    }
  }
);
```

### Error Handling

```typescript
import { ApiError, NetworkError, TimeoutError } from '@/lib/api';

try {
  const result = await sendTip({ ... });
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network errors
    console.error('Network error:', error.message);
  } else if (error instanceof TimeoutError) {
    // Handle timeout
    console.error('Request timed out');
  } else if (error instanceof ApiError) {
    // Handle API errors
    console.error('API error:', error.statusCode, error.message);
  }
}
```

### Request Interceptors

Add authentication, logging, etc.:

```typescript
import { apiClient } from '@/lib/api';
import { setupDefaultInterceptors } from '@/lib/api/interceptors';

// Setup interceptors during app initialization
setupDefaultInterceptors({
  getAuthToken: () => localStorage.getItem('authToken'),
  getUserId: () => {
    const wallet = useWallet();
    return wallet.address || null;
  }
});

// Or add custom interceptors
apiClient.addRequestInterceptor((config) => {
  // Add custom headers
  const headers = new Headers(config.headers);
  headers.set('X-Custom-Header', 'value');
  return { ...config, headers };
});
```

## API Endpoints

### Tips
- `sendTip(request)` - Send a tip
- `getTipStatus(tipId)` - Get tip status
- `getTipRecommendation(request)` - Get AI tip recommendation
- `getMessageSuggestions(request)` - Get message suggestions

### Analytics
- `getPlatformAnalytics()` - Get platform-wide analytics
- `getUserAnalytics(userId)` - Get user analytics
- `getTipFeed(limit)` - Get tip feed

### Badges
- `getUserBadges(userId)` - Get user badges
- `checkBadges(userId)` - Check and award badges
- `getUserBadgeStats(userId)` - Get badge statistics

## Configuration

The API client uses environment variables for configuration:

```env
VITE_API_URL=http://localhost:3001  # Optional: defaults to relative paths
```

If `VITE_API_URL` is not set, the client uses relative paths (e.g., `/api/v1/tip`), which is recommended for same-origin requests.

## Type Safety

All API functions use shared TypeScript types defined in `@/lib/api/types`. This ensures:

- Type-safe requests
- Type-safe responses
- Better IDE autocomplete
- Compile-time error checking

## Migration Guide

### Before (raw fetch)

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

### After (API client)

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

## Best Practices

1. **Always use typed API functions** instead of raw `fetch` calls
2. **Handle errors appropriately** - use try/catch for operations that can fail
3. **Check `result.success`** before accessing `result.data`
4. **Use request interceptors** for authentication instead of adding headers manually
5. **Configure retry logic** for critical operations
6. **Use appropriate timeouts** for long-running operations

