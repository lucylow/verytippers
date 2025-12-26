import { IpfsService } from './IpfsService';

export interface NFTMetadataAttributes {
    trait_type: string;
    value: string | number;
}

export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes?: NFTMetadataAttributes[];
    boostMultiplier?: number;
    external_url?: string;
    animation_url?: string;
}

/**
 * Service for creating and managing NFT metadata
 */
export class NFTMetadataService {
    private ipfsService: IpfsService;

    constructor() {
        this.ipfsService = new IpfsService();
    }

    /**
     * Create ERC-721 compliant metadata JSON
     */
    createMetadata(data: {
        name: string;
        description: string;
        image: string;
        attributes?: NFTMetadataAttributes[];
        boostMultiplier?: number;
        external_url?: string;
        animation_url?: string;
    }): NFTMetadata {
        const metadata: NFTMetadata = {
            name: data.name,
            description: data.description,
            image: data.image,
            ...(data.attributes && { attributes: data.attributes }),
            ...(data.boostMultiplier && { boostMultiplier: data.boostMultiplier }),
            ...(data.external_url && { external_url: data.external_url }),
            ...(data.animation_url && { animation_url: data.animation_url })
        };

        return metadata;
    }

    /**
     * Upload metadata to IPFS and return tokenURI
     */
    async uploadMetadata(metadata: NFTMetadata): Promise<string> {
        const metadataJson = JSON.stringify(metadata, null, 2);
        const tokenURI = await this.ipfsService.upload(metadataJson);
        return tokenURI;
    }

    /**
     * Create metadata with image upload
     */
    async createMetadataWithImage(data: {
        name: string;
        description: string;
        imageBase64?: string;
        imageUrl?: string;
        imageFile?: Buffer;
        attributes?: NFTMetadataAttributes[];
        boostMultiplier?: number;
    }): Promise<{ metadata: NFTMetadata; tokenURI: string }> {
        let imageUri = data.imageUrl;

        // Upload image if provided as base64 or file
        if (data.imageBase64) {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(data.imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            imageUri = await this.ipfsService.uploadFile(imageBuffer, `${data.name.replace(/\s+/g, '_')}.png`);
        } else if (data.imageFile) {
            imageUri = await this.ipfsService.uploadFile(data.imageFile, `${data.name.replace(/\s+/g, '_')}.png`);
        }

        if (!imageUri) {
            throw new Error('Image is required (imageUrl, imageBase64, or imageFile)');
        }

        // Create metadata
        const metadata = this.createMetadata({
            name: data.name,
            description: data.description,
            image: imageUri,
            attributes: data.attributes,
            boostMultiplier: data.boostMultiplier
        });

        // Upload metadata to IPFS
        const tokenURI = await this.uploadMetadata(metadata);

        return { metadata, tokenURI };
    }

    /**
     * Parse metadata from IPFS URI
     */
    async fetchMetadata(tokenURI: string): Promise<NFTMetadata> {
        const content = await this.ipfsService.fetch(tokenURI);
        return JSON.parse(content) as NFTMetadata;
    }
}

