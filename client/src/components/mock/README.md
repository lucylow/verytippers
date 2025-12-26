# Mock Components for VeryTippers Demo

This directory contains improved mock components that demonstrate the complete VeryTippers flow using an in-memory backend.

## Components

### `ChatInput.tsx`
Chat-like input component with:
- Support for `/tip @handle amount` command
- AI-powered tip suggestions based on message length
- One-tap acceptance of AI suggestions

### `WalletModal.tsx`
Wallet confirmation modal that:
- Shows tip details (recipient, amount)
- Displays "Gas: 0 (relayer pays)" to highlight gasless transactions
- Handles signing and sending

### `Leaderboard.tsx`
Leaderboard component displaying:
- Top users by total received tips
- User handles and display names
- Total VERY received

## Usage

The mock demo is accessible at `/mock-demo` route. It includes:

1. **Tip Feed**: Real-time feed of all tips with confirmation status
2. **Chat Input**: Type `/tip @username 5` or get AI suggestions
3. **Users List**: Shows all users and their balances
4. **Leaderboard**: Top tippers ranked by total received
5. **Recent Activity**: Quick view of recent transactions

## Mock Backend

The `mockBackend` (in `@/lib/mockBackend.ts`) simulates:
- IPFS uploads (returns fake CIDs)
- Meta-transaction creation
- Relayer submission (immediate txHash, delayed confirmation)
- Real-time updates via subscription pattern

## Features

- **Real-time Updates**: Uses subscription pattern to update UI when tips are confirmed
- **Pending States**: Tips show as pending until confirmed (~2-3 seconds)
- **Balance Updates**: User balances update automatically when tips confirm
- **AI Suggestions**: Smart tip amount suggestions based on message content

## Extending

To replace with real backend:
1. Replace `mockBackend` calls with real API calls
2. Use WebSocket/SSE for real-time updates instead of `onUpdate` subscription
3. Replace mock IPFS with real IPFS service
4. Replace mock relayer with real relayer API

