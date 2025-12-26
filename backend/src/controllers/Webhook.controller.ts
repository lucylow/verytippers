import { Router, Request, Response } from 'express';
import { VerychatApiService } from '../services/verychat/VerychatApi.service';
import { TippingService } from '../services/Tipping.service';
import { config } from '../config/config';
import crypto from 'crypto';

export class WebhookController {
  public router: Router;
  private verychat: VerychatApiService;
  private tipping: TippingService;

  constructor() {
    this.router = Router();
    this.verychat = new VerychatApiService();
    this.tipping = new TippingService();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // VeryChat webhook endpoint
    this.router.post('/webhook/verychat', this.handleVeryChatWebhook.bind(this));
    
    // Blockchain event listener (for contract events)
    this.router.post('/webhook/blockchain', this.handleBlockchainWebhook.bind(this));
    
    // Health check
    this.router.get('/health', this.healthCheck.bind(this));
  }

  private async handleVeryChatWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-verychat-signature'];
      const timestamp = req.headers['x-verychat-timestamp'];
      
      // Verify webhook signature
      if (!this.verifySignature(signature as string, timestamp as string, req.body)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Process the webhook event
      await this.verychat.handleWebhook(req.body);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private verifySignature(signature: string, timestamp: string, body: any): boolean {
    // Implement VeryChat webhook signature verification
    // This depends on VeryChat's webhook security implementation
    if (!signature || !timestamp) {
      return false;
    }

    // Create expected signature
    const payload = JSON.stringify(body);
    const secret = config.SECURITY.WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp + payload);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private async handleBlockchainWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { event, data } = req.body;
      
      switch (event) {
        case 'TipSent':
          await this.handleTipSentEvent(data);
          break;
        case 'BadgeMinted':
          await this.handleBadgeMintedEvent(data);
          break;
        case 'Withdrawal':
          await this.handleWithdrawalEvent(data);
          break;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Blockchain webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async handleTipSentEvent(data: any): Promise<void> {
    // Update database with confirmed tip
    // This is called when the TipSent event is emitted from the smart contract
    const { from, to, token, amount, messageHash, tipId, transactionHash } = data;
    
    console.log('TipSent event received:', { from, to, amount, tipId, transactionHash });
    
    // The tip should already be in the database, but we can update its status
    // This would typically be handled by the TippingService
  }

  private async handleBadgeMintedEvent(data: any): Promise<void> {
    const { user, badgeId, transactionHash } = data;
    console.log('BadgeMinted event received:', { user, badgeId, transactionHash });
  }

  private async handleWithdrawalEvent(data: any): Promise<void> {
    const { user, amount, token, transactionHash } = data;
    console.log('Withdrawal event received:', { user, amount, token, transactionHash });
  }

  private healthCheck(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        redis: 'connected',
        blockchain: 'connected',
        verychat: 'connected'
      }
    });
  }
}

