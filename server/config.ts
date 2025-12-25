import * as dotenv from 'dotenv';
33	import path from 'path';
34	import { fileURLToPath } from 'url';
35	
36	const __filename = fileURLToPath(import.meta.url);
37	const __dirname = path.dirname(__filename);
38	
39	// Load .env file from the root of the project
40	dotenv.config({ path: path.resolve(__dirname, '../../.env') });
41	
42	export const config = {
43	    // Server
44	    NODE_ENV: process.env.NODE_ENV || 'development',
45	    PORT: parseInt(process.env.PORT || '3001'),
46	    API_VERSION: process.env.API_VERSION || 'v1',
47	
48	    // Database
49	    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/verytippers',
50	
51	    // Verychat Bot
52	    VERYCHAT_API_URL: process.env.VERYCHAT_API_URL || 'https://api.verychat.io/v1',
53	    VERYCHAT_API_KEY: process.env.VERYCHAT_API_KEY || '',
54	    VERYCHAT_BOT_TOKEN: process.env.VERYCHAT_BOT_TOKEN || 'dummy_token',
55	    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dummy_secret',
56	
57	    // Redis
58	    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
59	
60	    // IPFS
61	    IPFS_PROJECT_ID: process.env.IPFS_PROJECT_ID || '',
62	    IPFS_PROJECT_SECRET: process.env.IPFS_PROJECT_SECRET || '',
63	
64	    // Blockchain
65	    VERY_CHAIN_RPC_URL: process.env.VERY_CHAIN_RPC_URL || 'http://localhost:8545',
66	    SPONSOR_PRIVATE_KEY: process.env.SPONSOR_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
67	    
68	    // Contract Addresses
69	    TIP_CONTRACT_ADDRESS: process.env.TIP_CONTRACT_ADDRESS || '0xTipContractAddress',
70	    BADGE_CONTRACT_ADDRESS: process.env.BADGE_CONTRACT_ADDRESS || '0xBadgeContractAddress',
71	    VERY_TOKEN_ADDRESS: process.env.VERY_TOKEN_ADDRESS || '0xVeryTokenAddress',
72	
73	    // AI/HuggingFace
74	    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || 'dummy_hf_key',
75	};
76	
