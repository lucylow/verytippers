import { DataSource } from 'typeorm';
import { config } from './config';
import { User } from '../models/User.entity';
import { Tip } from '../models/Tip.entity';
import { Badge } from '../models/Badge.entity';
import { UserBadge } from '../models/UserBadge.entity';
import { Leaderboard } from '../models/Leaderboard.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.DATABASE.URL,
  entities: [User, Tip, Badge, UserBadge, Leaderboard],
  synchronize: config.SERVER.NODE_ENV === 'development', // Auto-sync in dev only
  logging: config.SERVER.NODE_ENV === 'development',
  extra: {
    max: config.DATABASE.POOL_SIZE,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  migrations: ['src/migrations/**/*.ts'],
  migrationsTableName: 'migrations',
});

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    
    if (config.SERVER.NODE_ENV === 'production') {
      await AppDataSource.runMigrations();
      console.log('✅ Database migrations completed');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

