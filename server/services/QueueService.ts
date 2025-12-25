import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';

const connection = new IORedis(config.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

export const tipQueue = new Queue('tip-processing', { connection });

export class QueueService {
    private worker: Worker;

    constructor(processCallback: (job: Job) => Promise<void>) {
        this.worker = new Worker('tip-processing', processCallback, { 
            connection,
            concurrency: 5
        });

        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed successfully`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed with error: ${err.message}`);
        });
    }

    async addTipJob(data: any) {
        return await tipQueue.add('process-tip', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        });
    }
}
