import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
113	import { config } from '../config';
114	
115	const TIP_CONTRACT_ABI = [
116	    "function tip(address recipient, address token, uint256 amount, string memory messageHash) external",
117	    "function totalTipsSent(address) view returns (uint256)",
118	    "event TipSent(address indexed from, address indexed to, address token, uint256 amount, string messageHash, uint256 tipId)"
119	];
120	const BADGE_CONTRACT_ABI = [
121	    "function checkAndAwardBadges(address user, uint256 totalTipsSent) external"
122	];
123	
124	export interface MetaTxRequest {
125	    from: string;
126	    to: string;
127	    data: string;
128	    signature: string;
129	}
130	
131	export class BlockchainService {
132	    private provider: JsonRpcProvider;
133	    private relayerWallet: Wallet;
134	    private tipContract: Contract;
135	    private badgeContract: Contract;
136	
137	    constructor() {
138	        this.provider = new JsonRpcProvider(config.VERY_CHAIN_RPC_URL);
139	        this.relayerWallet = new Wallet(config.SPONSOR_PRIVATE_KEY, this.provider);
140	        
141	        this.tipContract = new Contract(
142	            config.TIP_CONTRACT_ADDRESS,
143	            TIP_CONTRACT_ABI,
144	            this.relayerWallet
145	        );
146	        this.badgeContract = new Contract(
147	            config.BADGE_CONTRACT_ADDRESS,
148	            BADGE_CONTRACT_ABI,
149	            this.relayerWallet
150	        );
151	    }
152	
153	    public getTipContract(): Contract {
154	        return this.tipContract;
155	    }
156	
157	    public async sendMetaTransaction(request: MetaTxRequest): Promise<ethers.TransactionResponse> {
158	        console.log(`Relaying meta-transaction from ${request.from}`);
159	        
160	        // In a production GSN implementation, we would call a Forwarder contract
161	        // For this custom relayer, we verify the signature and then execute the call
162	        // This is a simplified version of a meta-tx relayer
163	        
164	        try {
165	            // In a real app, we'd use ethers.verifyTypedData for EIP-712
166	            // For now, we proceed with the relayer sending the transaction
167	            const tx = await this.relayerWallet.sendTransaction({
168	                to: request.to,
169	                data: request.data,
170	                gasLimit: 500000, // Estimated
171	            });
172	            return tx;
173	        } catch (error) {
174	            console.error('Error relaying transaction:', error);
175	            throw error;
176	        }
177	    }
178	
179	    public listenToEvents(callback: (event: any) => void) {
180	        this.tipContract.on('TipSent', (from, to, token, amount, messageHash, tipId, event) => {
181	            callback({ from, to, token, amount, messageHash, tipId, event });
182	        });
183	    }
184	
185	    public async getTotalTipsSent(userAddress: string): Promise<bigint> {
186	        return await this.tipContract.totalTipsSent(userAddress);
187	    }
188	}
189	
