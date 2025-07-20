# WebSocket Management System Usage

This document demonstrates how to use the WebSocket management system for memory-safe multi-channel messaging in the Fastify app.

## Features

- **Memory-safe connection management**: Automatic cleanup on disconnect
- **Channel-based messaging**: Organize clients into topic-based channels
- **REST-to-WebSocket integration**: Trigger WebSocket messages from API endpoints
- **User/Organization filtering**: Send messages to specific users or organizations
- **Event bus integration**: Cross-service messaging capabilities

## Client Connection Examples

### Basic Connection

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  console.log("Connected to WebSocket");

  // Join a channel
  ws.send(
    JSON.stringify({
      type: "JOIN_CHANNEL",
      channel: "notifications",
    }),
  );
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("Received:", message);
};
```

### Channel Management

```javascript
// Join multiple channels
ws.send(
  JSON.stringify({
    type: "JOIN_CHANNEL",
    channel: "org:company123",
  }),
);

ws.send(
  JSON.stringify({
    type: "JOIN_CHANNEL",
    channel: "user:user456",
  }),
);

// Leave a channel
ws.send(
  JSON.stringify({
    type: "LEAVE_CHANNEL",
    channel: "notifications",
  }),
);
```

### Sending Messages

```javascript
// Send message to a channel
ws.send(
  JSON.stringify({
    type: "CHAT_MESSAGE",
    channel: "general",
    data: {
      text: "Hello everyone!",
      userId: "user123",
    },
  }),
);

// Send job description
ws.send(
  JSON.stringify({
    type: "JOB_DESCRIPTION",
    data: {
      title: "Software Engineer",
      description: "We need a full-stack developer...",
      organizationId: "company123",
    },
  }),
);
```

## Server-side Usage

### Broadcasting from REST Endpoints

```typescript
// In any route handler
export const someRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post("/process-job", async (request, reply) => {
    const { jobId, organizationId } = request.body;

    // Process the job...

    // Notify WebSocket clients
    if (fastify.wsManager) {
      // Broadcast to organization channel
      fastify.wsManager.broadcastToChannel(`org:${organizationId}`, {
        type: "JOB_PROCESSED",
        data: {
          jobId,
          status: "completed",
          completedAt: new Date().toISOString(),
        },
      });

      // Or broadcast to specific users
      fastify.wsManager.broadcastToFiltered(
        { organizationId },
        {
          type: "JOB_NOTIFICATION",
          channel: "notifications",
          data: { jobId, message: "Your job has been processed!" },
        },
      );
    }

    return { success: true };
  });
};
```

### Using the Event Bus

```typescript
// In any service
export class JobProcessingService {
  constructor(private wsManager: WebSocketManager) {}

  async processJob(jobId: string) {
    // Process the job...

    // Use event bus for cross-service messaging
    const eventBus = this.wsManager.getEventBus();

    await eventBus.publish("broadcast_to_channel", {
      type: "JOB_UPDATE",
      channel: "job-updates",
      data: { jobId, status: "in-progress" },
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Custom Broadcast Endpoint

```bash
# Send message to specific channel
curl -X POST http://localhost:3000/v1/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "notifications",
    "type": "SYSTEM_ALERT",
    "data": {
      "message": "System maintenance in 10 minutes"
    }
  }'

# Send message to organization
curl -X POST http://localhost:3000/v1/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "company123",
    "type": "ORG_ANNOUNCEMENT",
    "data": {
      "message": "New policy update available"
    }
  }'
```

## Channel Naming Conventions

- `org:{organizationId}` - Organization-wide messages
- `user:{userId}` - User-specific messages
- `job:{jobId}` - Job-specific updates
- `notifications` - General notifications
- `alerts` - System alerts
- `chat:{roomId}` - Chat rooms

## Memory Safety Features

1. **Automatic cleanup**: Clients are removed when they disconnect
2. **Channel cleanup**: Empty channels are automatically deleted
3. **Dead connection detection**: Ping/pong heartbeat mechanism
4. **Error isolation**: Failed sends don't affect other clients
5. **Connection state validation**: Messages only sent to open connections

## Monitoring

### Get WebSocket Statistics

```bash
curl http://localhost:3000/ws/status
```

Response:

```json
{
  "stats": {
    "totalClients": 15,
    "totalChannels": 8,
    "channelBreakdown": {
      "notifications": 12,
      "org:company123": 5,
      "user:user456": 1,
      "job-updates": 8
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

The system automatically handles and responds to client errors:

```javascript
// Client receives error messages in this format
{
  "type": "ERROR",
  "channel": "error",
  "data": {
    "message": "Invalid message format",
    "originalMessage": { /* the original invalid message */ }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Best Practices

1. **Use meaningful channel names** with consistent naming conventions
2. **Include timestamps** in your message data for debugging
3. **Handle reconnection logic** on the client side
4. **Validate message schemas** before sending
5. **Monitor channel usage** to optimize performance
6. **Implement rate limiting** for high-frequency messages
7. **Use filtered broadcasting** when possible to reduce network traffic
