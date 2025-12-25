import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { config } from '../config';

export class IpfsService {
    private client: IPFSHTTPClient | null = null;

    constructor() {
        if (config.IPFS_PROJECT_ID && config.IPFS_PROJECT_SECRET) {
            const auth = 'Basic ' + Buffer.from(config.IPFS_PROJECT_ID + ':' + config.IPFS_PROJECT_SECRET).toString('base64');
            this.client = create({
                host: 'ipfs.infura.io',
                port: 5001,
                protocol: 'https',
                headers: {
                    authorization: auth,
                },
            });
        }
    }

    async upload(content: string): Promise<string> {
        if (!this.client) {
            console.warn('IPFS client not configured, returning mock hash');
            return `ipfs://mockhash_${Date.now()}`;
        }

        try {
            const added = await this.client.add(content);
            return `ipfs://${added.path}`;
        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            throw new Error('Failed to upload to IPFS');
        }
    }

    async fetch(hash: string): Promise<string> {
        if (!this.client) {
            return `Mock content for ${hash}`;
        }

        try {
            const stream = this.client.cat(hash.replace('ipfs://', ''));
            let data = '';
            for await (const chunk of stream) {
                data += new TextDecoder().decode(chunk);
            }
            return data;
        } catch (error) {
            console.error('Error fetching from IPFS:', error);
            throw new Error('Failed to fetch from IPFS');
        }
    }
}
