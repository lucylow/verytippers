import { BlockchainService } from './BlockchainService';
190	import { HuggingFaceService } from './HuggingFaceService';
191	import { VerychatService } from './VerychatService';
192	import { IpfsService } from './IpfsService';
193	import { DatabaseService } from './DatabaseService';
194	import { QueueService } from './QueueService';
195	import { config } from '../config';
196	import { ethers } from 'ethers';
197	import { Job } from 'bullmq';
198	
199	export interface TipResult {
200	    success: boolean;
201	    txHash?: string;
202	    tipId?: string;
203	    message?: string;
204	}
205	
206	export class TipService {
207	    private blockchainService: BlockchainService;
208	    private hfService: HuggingFaceService;
209	    private verychatService: VerychatService;
210	    private ipfsService: IpfsService;
211	    private db = DatabaseService.getInstance();
212	    private queueService: QueueService;
213	
214	    constructor() {
215	        this.blockchainService = new BlockchainService();
216	        this.hfService = new HuggingFaceService();
217	        this.verychatService = new VerychatService();
218	        this.ipfsService = new IpfsService();
219	        this.queueService = new QueueService(this.processQueueJob.bind(this));
220	        
221	        // Start listening to blockchain events
222	        this.blockchainService.listenToEvents(this.handleBlockchainEvent.bind(this));
223	    }
224	
225	    private async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
226	        // In a real app, use a library like 'eth-crypto' or 'openpgp'
227	        return `encrypted_${message}_for_${recipientPublicKey}`;
228	    }
229	
230	    public async processTip(
231	        senderId: string,
232	        recipientId: string,
233	        amount: string,
234	        token: string,
235	        message?: string
236	    ): Promise<TipResult> {
237	        // 1. Validate users and sync with DB
238	        let sender = await this.db.user.findUnique({ where: { id: senderId } });
239	        if (!sender) {
240	            const vUser = await this.verychatService.getUser(senderId);
241	            if (!vUser) return { success: false, message: 'Sender not found on Verychat.' };
242	            sender = await this.db.user.create({
243	                data: { id: vUser.id, walletAddress: vUser.walletAddress, publicKey: vUser.publicKey }
244	            });
245	        }
246	
247	        let recipient = await this.db.user.findUnique({ where: { id: recipientId } });
248	        if (!recipient) {
249	            const vUser = await this.verychatService.getUser(recipientId);
250	            if (!vUser) return { success: false, message: 'Recipient not found on Verychat.' };
251	            recipient = await this.db.user.create({
252	                data: { id: vUser.id, walletAddress: vUser.walletAddress, publicKey: vUser.publicKey }
253	            });
254	        }
255	
256	        // 2. AI Moderation
257	        if (message) {
258	            const moderationResult = await this.hfService.moderateContent(message);
259	            if (moderationResult.flagged) {
260	                return { success: false, message: 'Tip message flagged by content moderation.' };
261	            }
262	        }
263	
264	        // 3. Create pending tip in DB
265	        const tip = await this.db.tip.create({
266	            data: {
267	                senderId,
268	                recipientId,
269	                amount,
270	                token,
271	                message,
272	                status: 'PENDING'
273	            }
274	        });
275	
276	        // 4. Add to queue for async processing
277	        await this.queueService.addTipJob({ tipId: tip.id });
278	
279	        return {
280	            success: true,
281	            tipId: tip.id,
282	            message: 'Tip is being processed asynchronously.'
283	        };
284	    }
285	
286	    private async processQueueJob(job: Job): Promise<void> {
287	        const { tipId } = job.data;
288	        const tip = await this.db.tip.findUnique({ 
289	            where: { id: tipId },
290	            include: { sender: true, recipient: true }
291	        });
292	
293	        if (!tip) return;
294	
295	        try {
296	            await this.db.tip.update({ where: { id: tipId }, data: { status: 'PROCESSING' } });
297	
298	            // 1. IPFS Upload
299	            let messageHash = '';
300	            if (tip.message) {
301	                const encrypted = await this.encryptMessage(tip.message, tip.recipient.publicKey);
302	                messageHash = await this.ipfsService.upload(encrypted);
303	                await this.db.tip.update({ where: { id: tipId }, data: { messageHash } });
304	            }
305	
306	            // 2. Blockchain Transaction
307	            const tipContract = this.blockchainService.getTipContract();
308	            const amountWei = ethers.parseUnits(tip.amount, 18);
309	            const txData = tipContract.interface.encodeFunctionData('tip', [
310	                tip.recipient.walletAddress,
311	                tip.token,
312	                amountWei,
313	                messageHash
314	            ]);
315	
316	            const txResponse = await this.blockchainService.sendMetaTransaction({
317	                from: tip.sender.walletAddress,
318	                to: config.TIP_CONTRACT_ADDRESS,
319	                data: txData,
320	                signature: '0x_user_signature_placeholder' // In real app, signature comes from frontend
321	            });
322	
323	            await this.db.tip.update({ 
324	                where: { id: tipId }, 
325	                data: { txHash: txResponse.hash } 
326	            });
327	
328	            await txResponse.wait();
329	            // Status will be updated by the event listener
330	        } catch (error) {
331	            console.error(`Error processing tip ${tipId}:`, error);
332	            await this.db.tip.update({ where: { id: tipId }, data: { status: 'FAILED' } });
333	            throw error; // Allow BullMQ to retry
334	        }
335	    }
336	
337	    private async handleBlockchainEvent(eventData: any) {
338	        const { from, to, amount, messageHash, txHash } = eventData;
339	        console.log(`Received TipSent event: ${txHash}`);
340	
341	        // Update tip status in DB
342	        const tip = await this.db.tip.findFirst({
343	            where: {
344	                sender: { walletAddress: from },
345	                recipient: { walletAddress: to },
346	                messageHash: messageHash,
347	                status: 'PROCESSING'
348	            }
349	        });
350	
351	        if (tip) {
352	            await this.db.tip.update({
353	                where: { id: tip.id },
354	                data: { status: 'COMPLETED', txHash: eventData.event.transactionHash }
355	            });
356	
357	            // Notify user via Verychat
358	            await this.verychatService.sendMessage(tip.senderId, `Your tip of ${tip.amount} ${tip.token} was successful!`);
359	            await this.verychatService.sendMessage(tip.recipientId, `You received a tip of ${tip.amount} ${tip.token}!`);
360	        }
361	    }
362	}
363	
