# Bot Automation Services

This directory contains enhanced automation services for the VeryTippers bot.

## Services

### CommandHandler.service.ts
Enhanced command parsing, validation, and routing system.

**Features:**
- Automatic command parsing with argument validation
- Command aliases support
- Prerequisite checking (wallet, KYC)
- Extensible command registration
- Built-in commands: `/tip`, `/stats`, `/leaderboard`, `/help`

**Usage:**
```typescript
const commandHandler = new CommandHandlerService();
const result = await commandHandler.handleCommand('/tip @user 10 Great job!', {
  userId: 'user123',
  chatId: 'chat456',
});
```

### NotificationService.service.ts
Automated notification system with retry logic and batching.

**Features:**
- Queue-based notification processing
- Automatic retry with exponential backoff
- Rate limiting per chat (10 notifications/minute)
- Priority-based processing (high/normal/low)
- Circuit breaker integration
- Dead letter queue for failed notifications

**Usage:**
```typescript
const notificationService = new NotificationService(redis);
await notificationService.send({
  chatId: 'chat123',
  message: 'Tip sent successfully!',
  priority: 'high',
});
```

### AutomationMonitor.service.ts
Health monitoring and metrics for automation systems.

**Features:**
- Automated health checks (30s interval)
- Queue statistics monitoring
- Circuit breaker state tracking
- Service latency monitoring
- Health summary generation

**Usage:**
```typescript
const monitor = new AutomationMonitorService(redis, tipQueue, notificationQueue);
monitor.startMonitoring();
const metrics = await monitor.getMetrics();
const isHealthy = await monitor.isHealthy();
```

## Utilities

### circuitBreaker.ts
Circuit breaker pattern implementation to prevent cascading failures.

**Features:**
- Three states: CLOSED, OPEN, HALF_OPEN
- Automatic state transitions
- Failure counting with time windows
- Configurable thresholds

**Usage:**
```typescript
import { circuitBreakers } from '../../utils/circuitBreaker';

const result = await circuitBreakers.verychat.execute(async () => {
  return await verychatApi.sendMessage(chatId, message);
});
```

## Integration

These services are integrated into:
- `server/integrations/verychat.ts` - Enhanced webhook handler
- `backend/src/workers/tip-processor.worker.ts` - Tip processing with circuit breakers
- `backend/src/services/Leaderboard.service.ts` - Cron jobs with error handling

## Improvements Made

1. **Enhanced Webhook Handling**
   - HMAC-SHA256 signature verification
   - Retry logic with exponential backoff
   - Better error handling and user notifications

2. **Command System**
   - Centralized command handler
   - Automatic validation and routing
   - Extensible architecture

3. **Notification Automation**
   - Queue-based processing
   - Automatic retries
   - Rate limiting

4. **Monitoring & Health Checks**
   - Automated health monitoring
   - Service metrics
   - Circuit breaker tracking

5. **Resilience**
   - Circuit breakers for all external services
   - Automatic retry with backoff
   - Dead letter queues
   - Error recovery mechanisms

6. **Cron Jobs**
   - Error handling with automatic retries
   - Logging and monitoring
   - Failure recovery

