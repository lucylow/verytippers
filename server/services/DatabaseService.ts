// @ts-nocheck
import { PrismaClient } from '@prisma/client';

export class DatabaseService {
    private static instance: PrismaClient;

    private constructor() {}

    public static getInstance(): PrismaClient {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new PrismaClient();
        }
        return DatabaseService.instance;
    }
}
