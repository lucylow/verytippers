// server/scripts/startEventListener.ts - Start blockchain event listener
import { getEventListener } from '../services/eventListener';

const eventListener = getEventListener();
const status = eventListener.getStatus();

if (status.listening) {
    console.log('✅ Event listener started successfully');
    console.log(`Tip contract: ${status.tipContract || 'Not configured'}`);
    console.log(`NFT contract: ${status.nftContract || 'Not configured'}`);
    console.log(`Marketplace contract: ${status.marketplaceContract || 'Not configured'}`);
} else {
    console.warn('⚠️ Event listener not started (contract address not configured)');
}

// Keep process alive
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down event listener');
    eventListener.stopListening();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down event listener');
    eventListener.stopListening();
    process.exit(0);
});
