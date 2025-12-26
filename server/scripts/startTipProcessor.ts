// server/scripts/startTipProcessor.ts - Start tip processor worker
import '../queues/tipProcessor';

// The worker is automatically started when the module is imported
console.log('✅ Tip processor worker started');
console.log('Listening for tip processing jobs...');

// Keep process alive
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
