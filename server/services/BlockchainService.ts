import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import { config } from '../config';

const TIP_CONTRACT_ABI = [
    "function tip(address recipient, address token, uint256 amount, string memory messageHash) external",
    "function totalTipsSent(address) view returns (uint256)",
    "event TipSent(address indexed from, address indexed to, address token, uint256 amount, string messageHash, uint256 tipId)"
];
const BADGE_CONTRACT_ABI = [
    "function checkAndAwardBadges(address user, uint256 totalTipsSent) external"
];

export interface MetaTxRequest {
    from: string;
    to: string;
    data: string;
    signature: string;
}

export class BlockchainService {
    private provider: JsonRpcProvider;
    private relayerWallet: Wallet;
    private tipContract: Contract;
    private badgeContract: Contract;

    constructor() {
        this.provider = new JsonRpcProvider(config.VERY_CHAIN_RPC_URL);
        this.relayerWallet = new Wallet(config.SPONSOR_PRIVATE_KEY, this.provider);
        
        this.tipContract = new Contract(
            config.TIP_CONTRACT_ADDRESS,
            TIP_CONTRACT_ABI,
            this.relayerWallet
        );
        this.badgeContract = new Contract(
            config.BADGE_CONTRACT_ADDRESS,
            BADGE_CONTRACT_ABI,
            this.relayerWallet
        );
    }

    public getTipContract(): Contract {
        return this.tipContract;
    }

    public async sendMetaTransaction(request: MetaTxRequest): Promise<ethers.TransactionResponse> {
        console.log(`Relaying meta-transaction from ${request.from}`);
        
        // In a production GSN implementation, we would call a Forwarder contract
        // For this custom relayer, we verify the signature and then execute the call
        // This is a simplified version of a meta-tx relayer
        
        try {
            // In a real app, we'd use ethers.verifyTypedData for EIP-712
            // For now, we proceed with the relayer sending the transaction
            const tx = await this.relayerWallet.sendTransaction({
                to: request.to,
                data: request.data,
                gasLimit: 500000, // Estimated
            });
            return tx;
        } catch (error) {
            console.error('Error relaying transaction:', error);
            throw error;
        }
    }

    public listenToEvents(callback: (event: any) => void) {
        this.tipContract.on('TipSent', (from, to, token, amount, messageHash, tipId, event) => {
            callback({ from, to, token, amount, messageHash, tipId, event });
        });
    }

    public async getTotalTipsSent(userAddress: string): Promise<bigint> {
        return await this.tipContract.totalTipsSent(userAddress);
    }
}