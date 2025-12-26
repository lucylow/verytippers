# Error Handling Improvements

This document summarizes the comprehensive error handling improvements made to the VeryTippers codebase.

## Overview

The error handling system has been significantly enhanced with custom error classes, structured logging, request tracking, and consistent error responses across all endpoints.

## Key Improvements

### 1. Custom Error Classes (`backend/src/utils/errors.ts`)

Created a comprehensive error class hierarchy:

- **AppError**: Base error class with context, timestamps, and error codes
- **ValidationError**: For input validation failures (400)
- **AuthenticationError**: For authentication failures (401)
- **AuthorizationError**: For permission failures (403)
- **NotFoundError**: For resource not found (404)
- **RateLimitError**: For rate limiting (429)
- **DatabaseError**: For database operation failures (500)
- **ExternalServiceError**: For external API failures (502/503)
- **BlockchainError**: For blockchain/Web3 errors
- **BusinessLogicError**: For business rule violations

**Features:**
- Structured error context (userId, requestId, path, metadata)
- Error codes for programmatic handling
- Operational vs non-operational error distinction
- Automatic stack trace capture

### 2. Error Handler Utility (`ErrorHandler`)

Provides utilities for:
- **Error normalization**: Converts unknown errors to AppError
- **Error logging**: Structured logging with context
- **Error formatting**: Consistent API response format

### 3. Request ID Middleware (`backend/src/api/middleware/requestId.middleware.ts`)

- Adds unique request ID to each request
- Included in response headers (`X-Request-ID`)
- Used for error correlation and debugging

### 4. Enhanced Error Middleware

**Backend (Fastify)** - `backend/src/index.ts`:
- Uses custom error classes
- Includes request context in errors
- Proper error logging with Winston
- Development vs production error details

**Server (Express)** - `server/utils/errors.ts`:
- Custom error classes for Express
- Async handler wrapper (`asyncHandler`) for automatic error catching
- Error handler middleware for consistent responses

### 5. Replaced Console Logging

Replaced all `console.error`, `console.warn`, and `console.log` calls with proper Winston logger:

**Files Updated:**
- `backend/src/services/Tipping.service.ts`
- `backend/src/services/verychat/VerychatApi.service.ts`
- `backend/src/services/bot/CommandHandler.service.ts`
- `backend/src/services/social/SocialService.ts`

**Benefits:**
- Structured logging with context
- Log levels (error, warn, info, debug)
- File-based logging for production
- Better error tracking and debugging

### 6. Improved Async Error Handling

**Server Routes** - `server/index.ts`:
- Wrapped async route handlers with `asyncHandler`
- Automatic error catching and normalization
- Consistent error responses

**Example:**
```typescript
// Before
app.post('/api/v1/tip', async (req, res) => {
  try {
    // ...
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// After
app.post('/api/v1/tip', asyncHandler(async (req, res) => {
  // Errors automatically caught and handled
  const result = await tipService.processTip(...);
  res.json(result);
}));
```

### 7. Standardized Error Responses

All errors now return consistent JSON format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message is required",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "requestId": "uuid-here"
}
```

In development, additional context and stack traces are included.

## Error Categories

The system categorizes errors into:

1. **Validation Errors** (400): Invalid input
2. **Authentication Errors** (401): Missing or invalid credentials
3. **Authorization Errors** (403): Insufficient permissions
4. **Not Found Errors** (404): Resource doesn't exist
5. **Rate Limit Errors** (429): Too many requests
6. **Server Errors** (500): Internal server errors
7. **External Service Errors** (502/503): Third-party service failures
8. **Blockchain Errors** (500): Web3/blockchain operation failures

## Usage Examples

### Throwing Custom Errors

```typescript
import { ValidationError, NotFoundError } from '../utils/errors';

// Validation error
if (!message) {
  throw new ValidationError('Message is required', {
    userId: req.user.id,
    path: req.path,
  });
}

// Not found error
const user = await getUser(userId);
if (!user) {
  throw new NotFoundError('User', { userId });
}
```

### Handling Errors in Services

```typescript
import { ErrorHandler } from '../utils/errors';

try {
  // ...
} catch (error) {
  const appError = ErrorHandler.normalizeError(error, {
    userId: request.userId,
    action: 'process_tip',
  });
  
  ErrorHandler.logError(appError);
  throw appError;
}
```

### Using Async Handler

```typescript
import { asyncHandler } from '../utils/errors';

app.post('/api/endpoint', asyncHandler(async (req, res) => {
  // Errors automatically caught and handled
  const result = await service.doSomething();
  res.json(result);
}));
```

## Benefits

1. **Better Debugging**: Request IDs and structured context make debugging easier
2. **Consistent Responses**: All errors follow the same format
3. **Production Ready**: Proper logging, error categorization, and context
4. **Type Safety**: TypeScript error classes with proper typing
5. **Maintainability**: Centralized error handling logic
6. **Monitoring**: Structured logs ready for log aggregation tools (e.g., ELK, Datadog)

## Migration Notes

- All `console.error`/`console.warn` calls replaced with logger
- All async routes should use `asyncHandler` wrapper
- Custom errors should be thrown instead of generic Error
- Error context should include relevant metadata (userId, requestId, etc.)

## Future Enhancements

Potential improvements:
1. Error reporting integration (Sentry, Rollbar)
2. Error metrics and alerting
3. Error recovery strategies
4. Circuit breaker pattern for external services
5. Retry logic with exponential backoff

