import axios from 'axios';
import { config } from '../config';

export interface VerychatUser {
    id: string;
    walletAddress: string;
    publicKey: string;
    username?: string;
}

export class VerychatService {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.baseUrl = config.VERYCHAT_API_URL || 'https://api.verychat.io/v1';
        this.apiKey = config.VERYCHAT_API_KEY || '';
    }

    async getUser(userId: string): Promise<VerychatUser | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching user ${userId} from Verychat:`, error);
            // Fallback for development if API key is missing
            if (!this.apiKey) {
                console.warn('Verychat API Key missing, using mock data');
                if (userId === 'userA') return { id: 'userA', walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', publicKey: 'mockPublicKeyA' };
                if (userId === 'userB') return { id: 'userB', walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', publicKey: 'mockPublicKeyB' };
            }
            return null;
        }
    }

    async sendMessage(userId: string, message: string): Promise<boolean> {
        try {
            await axios.post(`${this.baseUrl}/messages`, {
                recipientId: userId,
                text: message
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return true;
        } catch (error) {
            console.error(`Error sending message to user ${userId}:`, error);
            return false;
        }
    }
}
