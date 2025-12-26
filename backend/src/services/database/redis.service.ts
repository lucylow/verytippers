import { createClient } from 'redis';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private client: ReturnType<typeof createClient>;
  private connected: boolean = false;

  private constructor() {
    this.client = createClient({
      url: config.REDIS_URL,
      password: config.REDIS_PASSWORD || undefined,
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('✅ Redis connecting...');
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis connected');
      this.connected = true;
    });

    this.client.on('end', () => {
      logger.info('Redis disconnected');
      this.connected = false;
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (!this.connected) {
        await this.client.connect();
      }
    } catch (error) {
      logger.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.quit();
        this.connected = false;
      }
    } catch (error) {
      logger.error('❌ Redis disconnection error:', error);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
    }
  }

  public async del(key: string): Promise<void> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

