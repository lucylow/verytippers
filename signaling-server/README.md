# VeryTippers Signaling Server

Simple WebSocket signaling server for WebRTC peer-to-peer connections.

## Setup

```bash
npm install
```

## Running

```bash
npm start
# or for development with auto-reload
npm run dev
```

The server will start on port 8080 (or PORT environment variable).

## Configuration

Set environment variables:
- `PORT` - Server port (default: 8080)

## Production Notes

- Add JWT auth in the `join` handler to prevent unauthorized room access
- For production scaling, use Redis Pub/Sub instead of in-memory rooms
- Provide TLS (HTTPS + WSS) for secure connections
- Consider adding rate limiting and connection quotas

## Protocol

The server expects JSON messages with the following structure:

```json
{
  "type": "join" | "offer" | "answer" | "ice",
  "room": "room-id",
  "data": { ... }
}
```

- `join`: Join a room (required first message)
- `offer`: WebRTC offer from initiator
- `answer`: WebRTC answer from responder
- `ice`: ICE candidate exchange

