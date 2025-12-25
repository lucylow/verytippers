import { HfInference } from '@huggingface/inference';
77	import { config } from '../config';
78	import { CacheService } from './CacheService';
79	
80	export interface ModerationResult {
81	    isSafe: boolean;
82	    flagged: boolean;
83	    categories: { [key: string]: number };
84	    scores: number[];
85	    needsManualReview: boolean;
86	}
87	
88	export class HuggingFaceService {
89	    private client: HfInference;
90	    private cache: CacheService;
91	
92	    constructor() {
93	        this.client = new HfInference(config.HUGGINGFACE_API_KEY);
94	        this.cache = CacheService.getInstance();
95	    }
96	
97	    private getScore(result: any[], label: string): number {
98	        const item = result.find(r => r.label === label);
99	        return item ? item.score : 0;
100	    }
101	
102	    public async moderateContent(text: string): Promise<ModerationResult> {
103	        const cacheKey = `hf:moderation:${Buffer.from(text).toString('base64').slice(0, 50)}`;
104	        const cached = await this.cache.get(cacheKey);
105	        if (cached) return JSON.parse(cached);
106	
107	        try {
108	            // Stage 1: Fast keyword check (simplified)
109	            const keywords = ['scam', 'spam', 'offensive_word_placeholder'];
110	            if (keywords.some(k => text.toLowerCase().includes(k))) {
111	                return { isSafe: false, flagged: true, categories: { keyword: 1 }, scores: [1], needsManualReview: true };
112	            }
113	
114	            // Stage 2: AI Model Check
115	            const result = await this.client.textClassification({
116	                model: 'unitary/toxic-bert',
117	                inputs: text,
118	            });
119	
120	            const categories = {
121	                toxic: this.getScore(result, 'toxic'),
122	                severe_toxic: this.getScore(result, 'severe_toxic'),
123	                obscene: this.getScore(result, 'obscene'),
124	                threat: this.getScore(result, 'threat'),
125	                insult: this.getScore(result, 'insult'),
126	                identity_hate: this.getScore(result, 'identity_hate'),
127	            };
128	
129	            const scores = Object.values(categories);
130	            const maxScore = Math.max(...scores);
131	            
132	            // Multi-stage logic:
133	            // > 0.8: Immediate flag
134	            // 0.5 - 0.8: Manual review
135	            // < 0.5: Safe
136	            const flagged = maxScore > 0.8;
137	            const needsManualReview = maxScore > 0.5 && maxScore <= 0.8;
138	
139	            const moderationResult: ModerationResult = {
140	                isSafe: !flagged && !needsManualReview,
141	                categories,
142	                flagged,
143	                scores,
144	                needsManualReview
145	            };
146	
147	            await this.cache.set(cacheKey, JSON.stringify(moderationResult), 3600);
148	            return moderationResult;
149	        } catch (error) {
150	            console.error('HuggingFace API Error:', error);
151	            return { isSafe: true, flagged: false, categories: {}, scores: [], needsManualReview: false };
152	        }
153	    }
154	}
155	
