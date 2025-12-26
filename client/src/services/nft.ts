// src/services/nft.ts - Frontend NFT Integration
// Integrates VeryTippersNFT with TipRouter for tip-gated minting

import { ethers } from 'ethers';

// Contract addresses - should be set via environment variables
const TIP_ROUTER_ADDRESS = import.meta.env.VITE_TIP_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000';
const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// ABI definitions - These should be replaced with actual compiled ABIs
// For now, we'll define the minimal interface needed
const TipRouterABI = [
  'function submitTip(address from, address to, uint256 amount, bytes32 cidHash, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'event TipSubmitted(bytes32 indexed cidHash, address indexed from, address indexed to, uint256 amount, uint256 nonce)'
];

const VeryTippersNFTABI = [
  'function mintWithTips(address to) external returns (uint256 tokenId)',
  'function totalTipsReceived(address) view returns (uint256)',
  'function getRarityForTips(uint256 tips) view returns (uint8)',
  'function tokenRarity(uint256) view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function getTokenInfo(uint256 tokenId) view returns (uint8 rarity, uint256 tipsRequired, string memory rarityName)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'event NFTMinted(uint256 indexed tokenId, address indexed to, uint8 rarity, uint256 tipAmount)'
];

export interface NFTInfo {
  tokenId: number;
  rarity: number;
  rarityName: string;
  tipsRequired: bigint;
  uri?: string;
}

export class NFTService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private nftContract: ethers.Contract | null = null;
  private tipRouter: ethers.Contract | null = null;

  constructor(provider: ethers.BrowserProvider | null, signer: ethers.JsonRpcSigner | null) {
    this.provider = provider;
    this.signer = signer;

    if (provider && NFT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      if (signer) {
        this.nftContract = new ethers.Contract(
          NFT_CONTRACT_ADDRESS,
          VeryTippersNFTABI,
          signer
        );
      } else {
        this.nftContract = new ethers.Contract(
          NFT_CONTRACT_ADDRESS,
          VeryTippersNFTABI,
          provider
        );
      }
    }

    if (provider && TIP_ROUTER_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      this.tipRouter = new ethers.Contract(
        TIP_ROUTER_ADDRESS,
        TipRouterABI,
        provider
      );
    }
  }

  /**
   * Mint NFT based on total tips received
   */
  async mintNFT(): Promise<ethers.BigNumberish> {
    if (!this.signer) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    if (!this.nftContract) {
      throw new Error('NFT contract not initialized. Please check contract address configuration.');
    }

    const address = await this.signer.getAddress();
    
    // Check eligibility based on tips received
    const tipsReceived = await this.nftContract.totalTipsReceived(address);
    const rarity = await this.nftContract.getRarityForTips(tipsReceived);
    
    console.log(`Eligible for rarity ${rarity} NFT based on ${ethers.formatEther(tipsReceived)} VERY tips`);
    
    // Mint NFT
    const tx = await this.nftContract.mintWithTips(address);
    const receipt = await tx.wait();
    
    // Parse events
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.nftContract!.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed && parsed.name === 'NFTMinted');
    
    const tokenId = event?.args?.tokenId;
    if (!tokenId) {
      throw new Error('Failed to get token ID from mint transaction');
    }
    
    console.log(`NFT minted! Token ID: ${tokenId.toString()}`);
    
    return tokenId;
  }

  /**
   * Get all NFTs owned by the connected address
   * Note: This requires ERC721Enumerable which may not be in the contract
   * For now, we'll implement a basic version that works without enumerable
   */
  async getMyNFTs(): Promise<{ tokenId: number; rarity: number }[]> {
    if (!this.signer || !this.nftContract) {
      throw new Error('Wallet not connected or contract not initialized');
    }

    const address = await this.signer.getAddress();
    const balance = await this.nftContract.balanceOf(address);
    
    // If the contract doesn't support tokenOfOwnerByIndex, we can't enumerate
    // This is a limitation - would need ERC721Enumerable extension
    // For now, return empty array with a note
    console.warn('getMyNFTs: Contract may not support token enumeration. Consider using ERC721Enumerable.');
    
    const nfts: { tokenId: number; rarity: number }[] = [];
    
    // Try to get tokens if contract supports it
    try {
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await this.nftContract.tokenOfOwnerByIndex(address, i);
          const rarity = await this.nftContract.tokenRarity(tokenId);
          nfts.push({ 
            tokenId: Number(tokenId), 
            rarity: Number(rarity) 
          });
        } catch (error) {
          console.warn(`Failed to get token at index ${i}:`, error);
          break;
        }
      }
    } catch (error) {
      console.warn('Contract does not support tokenOfOwnerByIndex:', error);
    }
    
    return nfts;
  }

  /**
   * Get detailed token information
   */
  async getTokenInfo(tokenId: number): Promise<NFTInfo> {
    if (!this.nftContract) {
      throw new Error('NFT contract not initialized');
    }

    const [rarity, tipsRequired, rarityName] = await this.nftContract.getTokenInfo(tokenId);
    
    let uri: string | undefined;
    try {
      uri = await this.nftContract.tokenURI(tokenId);
    } catch (error) {
      console.warn('Failed to get token URI:', error);
    }

    return {
      tokenId,
      rarity: Number(rarity),
      rarityName,
      tipsRequired,
      uri
    };
  }

  /**
   * Get total tips received for an address
   */
  async getTotalTipsReceived(address?: string): Promise<bigint> {
    if (!this.nftContract) {
      throw new Error('NFT contract not initialized');
    }

    if (!address && !this.signer) {
      throw new Error('Address required or wallet must be connected');
    }

    const targetAddress = address || (await this.signer!.getAddress());
    return await this.nftContract.totalTipsReceived(targetAddress);
  }

  /**
   * Get rarity tier for a given tip amount
   */
  async getRarityForTips(tips: bigint): Promise<number> {
    if (!this.nftContract) {
      throw new Error('NFT contract not initialized');
    }

    const rarity = await this.nftContract.getRarityForTips(tips);
    return Number(rarity);
  }

  /**
   * Check if contract is initialized
   */
  isInitialized(): boolean {
    return this.nftContract !== null && NFT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';
  }
}


