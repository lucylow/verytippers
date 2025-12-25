import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

export class CacheService {
    private static instance: CacheService;
    private client: RedisClientType;

    private constructor() {
        this.client = createClient({
            url: config.REDIS_URL,
        }) as RedisClientType;

        this.client.on('error', (err) => console.error('Redis Client Error', err));
        this.client.connect().catch(err => console.error('Failed to connect to Redis', err));
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    public async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    public async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        await this.client.set(key, value, {
            EX: ttlSeconds,
        });
    }

    public async del(key: string): Promise<number> {
        return this.client.del(key);
    }
}
