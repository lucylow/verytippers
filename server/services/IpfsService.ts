import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { config } from '../config';
import axios from 'axios';

export type IpfsProvider = 'infura' | 'pinata';

export class IpfsService {
    private client: IPFSHTTPClient | null = null;
    private provider: IpfsProvider;

    constructor() {
        // Determine provider: Pinata takes precedence if configured (free tier friendly)
        if (config.PINATA_API_KEY && config.PINATA_SECRET_API_KEY) {
            this.provider = 'pinata';
        } else if (config.IPFS_PROJECT_ID && config.IPFS_PROJECT_SECRET) {
            this.provider = 'infura';
            const auth = 'Basic ' + Buffer.from(config.IPFS_PROJECT_ID + ':' + config.IPFS_PROJECT_SECRET).toString('base64');
            this.client = create({
                host: 'ipfs.infura.io',
                port: 5001,
                protocol: 'https',
                headers: {
                    authorization: auth,
                },
            });
        } else {
            this.provider = 'pinata'; // Default to Pinata for demo/mock
        }
    }

    /**
     * Upload content to IPFS using the configured provider (Pinata or Infura)
     */
    async upload(content: string): Promise<string> {
        if (this.provider === 'pinata') {
            return this.uploadToPinata(content);
        }

        if (!this.client) {
            console.warn('IPFS client not configured, returning mock hash');
            return `ipfs://mockhash_${Date.now()}`;
        }

        try {
            const added = await this.client.add(content);
            return `ipfs://${added.path}`;
        } catch (error) {
            console.error('Error uploading to IPFS (Infura):', error);
            throw new Error('Failed to upload to IPFS');
        }
    }

    /**
     * Upload JSON content to Pinata IPFS (free tier: 1GB storage)
     * Documentation: https://docs.pinata.cloud/api-pinning/pin-json
     */
    private async uploadToPinata(content: string): Promise<string> {
        const pinataApiKey = config.PINATA_API_KEY;
        const pinataSecret = config.PINATA_SECRET_API_KEY;

        if (!pinataApiKey || !pinataSecret) {
            console.warn('Pinata credentials not configured, returning mock hash');
            return `ipfs://mockhash_${Date.now()}`;
        }

        try {
            // Try to parse as JSON for structured data
            let pinataContent: any;
            try {
                pinataContent = JSON.parse(content);
            } catch {
                // If not JSON, wrap in a message field
                pinataContent = { message: content, timestamp: new Date().toISOString() };
            }

            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                { pinataContent },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'pinata_api_key': pinataApiKey,
                        'pinata_secret_api_key': pinataSecret,
                    },
                }
            );

            const cid = response.data.IpfsHash;
            if (!cid) {
                throw new Error('Pinata response missing IpfsHash');
            }

            return `ipfs://${cid}`;
        } catch (error: any) {
            console.error('Error uploading to Pinata:', error.response?.data || error.message);
            // Fallback to mock in development
            if (config.NODE_ENV === 'development') {
                console.warn('Falling back to mock hash in development');
                return `ipfs://mockhash_${Date.now()}`;
            }
            throw new Error('Failed to upload to Pinata IPFS');
        }
    }

    /**
     * Upload file/buffer to Pinata IPFS
     * Note: For Node.js, you'll need to install 'form-data' package:
     * npm install form-data
     */
    async uploadFile(file: Buffer, filename?: string): Promise<string> {
        if (this.provider !== 'pinata') {
            throw new Error('File upload currently only supported with Pinata provider');
        }

        const pinataApiKey = config.PINATA_API_KEY;
        const pinataSecret = config.PINATA_SECRET_API_KEY;

        if (!pinataApiKey || !pinataSecret) {
            console.warn('Pinata credentials not configured, returning mock hash');
            return `ipfs://mockhash_${Date.now()}`;
        }

        try {
            // Use dynamic import for form-data (optional dependency)
            let FormData: any;
            try {
                // @ts-ignore - form-data is an optional dependency
                const formDataModule = await import('form-data');
                FormData = formDataModule.default || formDataModule;
            } catch {
                throw new Error('form-data package not installed. Install it with: npm install form-data');
            }

            const formData = new FormData();
            formData.append('file', file, filename || 'file');

            const metadata = JSON.stringify({
                name: filename || 'uploaded-file',
            });
            formData.append('pinataMetadata', metadata);

            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'pinata_api_key': pinataApiKey,
                        'pinata_secret_api_key': pinataSecret,
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                }
            );

            const cid = response.data.IpfsHash;
            if (!cid) {
                throw new Error('Pinata response missing IpfsHash');
            }

            return `ipfs://${cid}`;
        } catch (error: any) {
            console.error('Error uploading file to Pinata:', error.response?.data || error.message);
            throw new Error('Failed to upload file to Pinata IPFS');
        }
    }

    /**
     * Fetch content from IPFS
     */
    async fetch(hash: string): Promise<string> {
        const cleanHash = hash.replace('ipfs://', '').replace('/ipfs/', '');

        // Try Pinata gateway first (if using Pinata), then public gateway
        if (this.provider === 'pinata' && config.PINATA_GATEWAY_URL) {
            try {
                const response = await axios.get(`${config.PINATA_GATEWAY_URL}/ipfs/${cleanHash}`, {
                    timeout: 10000,
                });
                return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            } catch (error) {
                console.warn('Failed to fetch from Pinata gateway, trying public gateway');
            }
        }

        // Try public IPFS gateway
        try {
            const response = await axios.get(`https://ipfs.io/ipfs/${cleanHash}`, {
                timeout: 10000,
            });
            return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        } catch (error) {
            console.error('Error fetching from public IPFS gateway:', error);
        }

        // Fallback: use Infura client if available
        if (this.client) {
            try {
                const stream = this.client.cat(cleanHash);
                let data = '';
                for await (const chunk of stream) {
                    data += new TextDecoder().decode(chunk);
                }
                return data;
            } catch (error) {
                console.error('Error fetching from Infura IPFS:', error);
            }
        }

        throw new Error('Failed to fetch from IPFS (all methods failed)');
    }

    /**
     * Get the current IPFS provider
     */
    getProvider(): IpfsProvider {
        return this.provider;
    }
}
