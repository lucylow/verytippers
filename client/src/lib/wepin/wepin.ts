/**
 * Wepin Wallet Integration
 * 
 * Wepin is a Web3 wallet solution integrated into VeryChat
 * SDK: @wepin/sdk-js
 * Provider: @wepin/provider-js
 * 
 * Reference: https://docs.wepin.io/en
 * 
 * Setup:
 * 1. Register your app in Wepin Workspace
 * 2. Obtain App ID and App Key
 * 3. Install: npm install @wepin/sdk-js @wepin/provider-js
 * 4. Initialize SDK with your credentials
 * 
 * Note: For VeryChat bots, Wepin is natively integrated.
 * Use VeryChat API to interact with users' wallet addresses instead.
 */

import { VERY_CHAIN_CONFIG } from '../../config/chains';
import type { WepinSDK, Account, WepinLifeCycle } from '@wepin/sdk-js';
import type { WepinProvider, BaseProvider } from '@wepin/provider-js';

// Define the SDK attributes interface locally since it may not be exported
interface IWepinSDKAttributes {
  type?: 'show' | 'hide';
  defaultLanguage?: string;
  defaultCurrency?: string;
  loginProviders?: string[];
}

// WePin SDK initialization options
export interface WepinInitOptions {
  appId: string;
  appKey: string;
  attributes?: IWepinSDKAttributes;
}

// WePin account interface
export interface WepinAccount {
  address: string;
  chainId: number;
  network: string;
  contract?: string;
  isAA?: boolean;
}

// WePin connection options
export interface WepinConnectOptions {
  email?: string;
  network?: string;
}

/**
 * Wepin SDK Wrapper
 * Handles wallet connection and transaction signing for web applications
 * 
 * @example
 * ```typescript
 * const wallet = new WepinWallet();
 * await wallet.initialize({ appId: 'your-app-id', appKey: 'your-app-key' });
 * const account = await wallet.connect();
 * ```
 */
export class WepinWallet {
  private sdk: WepinSDK | null = null;
  private provider: WepinProvider | null = null;
  private isInitialized = false;
  private account: WepinAccount | null = null;
  private accounts: Account[] = [];
  private eventHandlers: Map<string, Set<Function>> = new Map();

  /**
   * Initialize Wepin SDK
   * @param options - Initialization options including appId, appKey, and optional attributes
   */
  async initialize(options: WepinInitOptions): Promise<void> {
    if (this.isInitialized) {
      console.warn('Wepin SDK already initialized');
      return;
    }

    try {
      // Dynamic import to avoid errors if SDK not installed
      const WepinSDKModule = await import('@wepin/sdk-js').catch(() => null);
      const WepinProviderModule = await import('@wepin/provider-js').catch(() => null);
      
      if (!WepinSDKModule || !WepinProviderModule) {
        throw new Error(
          '@wepin/sdk-js or @wepin/provider-js not installed. ' +
          'Install them with: npm install @wepin/sdk-js @wepin/provider-js'
        );
      }

      // Initialize SDK
      this.sdk = new WepinSDKModule.WepinSDK({
        appId: options.appId,
        appKey: options.appKey,
      });

      // Initialize Provider
      this.provider = new WepinProviderModule.WepinProvider({
        appId: options.appId,
        appKey: options.appKey,
      });

      // Initialize SDK with attributes
      const attributes: IWepinSDKAttributes = {
        type: 'hide', // Hide widget initially
        defaultLanguage: options.attributes?.defaultLanguage || 'en',
        defaultCurrency: options.attributes?.defaultCurrency || 'USD',
        loginProviders: options.attributes?.loginProviders,
      };

      await this.sdk.init(attributes);
      await this.provider.init({
        defaultLanguage: attributes.defaultLanguage || 'en',
        defaultCurrency: attributes.defaultCurrency || 'USD',
      });

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('Wepin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Wepin SDK:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Set up event listeners for wallet state changes
   */
  private setupEventListeners(): void {
    if (!this.sdk) return;

    // Listen for account changes
    this.sdk.on('accountChanged', (accounts: Account[]) => {
      this.accounts = accounts;
      if (accounts.length > 0) {
        const primaryAccount = accounts[0];
        this.account = {
          address: primaryAccount.address,
          chainId: VERY_CHAIN_CONFIG.chainIdDecimal,
          network: primaryAccount.network,
          contract: primaryAccount.contract,
          isAA: primaryAccount.isAA,
        };
      }
      this.emit('accountChanged', this.account);
    });

    // Listen for lifecycle changes
    this.sdk.on('lifecycleChanged', (lifecycle: WepinLifeCycle) => {
      this.emit('lifecycleChanged', lifecycle);
    });

    // Listen for widget open/close
    this.sdk.on('widgetOpened', () => {
      this.emit('widgetOpened');
    });

    this.sdk.on('widgetClosed', () => {
      this.emit('widgetClosed');
    });
  }

  /**
   * Connect wallet
   * Opens Wepin widget for user authentication and login
   * @param options - Connection options including optional email and network
   */
  async connect(options?: WepinConnectOptions): Promise<WepinAccount> {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('Wepin SDK not initialized. Call initialize() first.');
    }

    try {
      // Check current status
      const status = await this.sdk.getStatus();
      
      // If not logged in, show login UI
      if (status === 'before_login' || status === 'not_initialized') {
        await this.sdk.loginWithUI({ email: options?.email });
      }

      // If logged in but not registered, register the user
      if (status === 'login_before_register') {
        await this.sdk.register();
      }

      // Get accounts for the specified network or all networks
      const networkFilter = options?.network ? [options.network] : undefined;
      const accounts = await this.sdk.getAccounts({ 
        networks: networkFilter,
        withEoa: true 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please ensure you have created a wallet.');
      }

      this.accounts = accounts;
      
      // Find account for VERY Chain or use first account
      const veryChainAccount = accounts.find(
        acc => acc.network.toLowerCase() === 'very' || 
               acc.network.toLowerCase() === 'verychain'
      ) || accounts[0];

      this.account = {
        address: veryChainAccount.address,
        chainId: VERY_CHAIN_CONFIG.chainIdDecimal,
        network: veryChainAccount.network,
        contract: veryChainAccount.contract,
        isAA: veryChainAccount.isAA,
      };

      this.emit('connected', this.account);
      return this.account;
    } catch (error) {
      console.error('Failed to connect Wepin wallet:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get connected account
   */
  getAccount(): WepinAccount | null {
    return this.account;
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<Account[]> {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('Wepin SDK not initialized');
    }

    try {
      this.accounts = await this.sdk.getAccounts({ withEoa: true });
      return this.accounts;
    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw error;
    }
  }

  /**
   * Get current SDK status/lifecycle
   */
  async getStatus(): Promise<WepinLifeCycle> {
    if (!this.isInitialized || !this.sdk) {
      return 'not_initialized';
    }

    try {
      return await this.sdk.getStatus();
    } catch (error) {
      console.error('Failed to get status:', error);
      return 'not_initialized';
    }
  }

  /**
   * Disconnect wallet (logout)
   */
  async disconnect(): Promise<void> {
    if (!this.isInitialized || !this.sdk) {
      return;
    }

    try {
      await this.sdk.logout();
      this.account = null;
      this.accounts = [];
      this.emit('disconnected');
    } catch (error) {
      console.error('Failed to disconnect Wepin wallet:', error);
      throw error;
    }
  }

  /**
   * Sign transaction using Wepin provider
   * @param transaction - Transaction object compatible with EIP-1193
   */
  async signTransaction(transaction: {
    to?: string;
    value?: string;
    data?: string;
    gas?: string;
    gasPrice?: string;
  }): Promise<string> {
    if (!this.account) {
      throw new Error('Wallet not connected');
    }

    if (!this.provider) {
      throw new Error('Wepin provider not initialized');
    }

    try {
      // Get provider for the network
      const network = this.account.network || 'very';
      const baseProvider = await this.provider.getProvider(network);
      
      // Send transaction using EIP-1193 interface
      const txHash = await baseProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.account.address,
          to: transaction.to,
          value: transaction.value || '0x0',
          data: transaction.data || '0x',
          gas: transaction.gas,
          gasPrice: transaction.gasPrice,
        }],
      });

      return txHash as string;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a message using personal_sign (EIP-191)
   * @param message - Message to sign (will be UTF-8 encoded)
   */
  async signMessage(message: string): Promise<string> {
    if (!this.account) {
      throw new Error('Wallet not connected');
    }

    if (!this.provider) {
      throw new Error('Wepin provider not initialized');
    }

    try {
      const network = this.account.network || 'very';
      const baseProvider = await this.provider.getProvider(network);
      
      // personal_sign expects the message as a hex string
      // Convert UTF-8 string to hex
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      const messageHex = '0x' + Array.from(messageBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Sign message using personal_sign (EIP-191)
      // Note: Some providers may accept the message directly as a string
      // If this fails, try passing the message string directly
      const accountAddress = this.account.address;
      const signature = await baseProvider.request({
        method: 'personal_sign',
        params: [messageHex, accountAddress],
      }).catch(async () => {
        // Fallback: try with message as string (some providers handle encoding)
        return await baseProvider.request({
          method: 'personal_sign',
          params: [message, accountAddress],
        });
      });

      return signature as string;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Get Wepin provider for direct blockchain interaction
   * Compatible with ethers.js and web3.js (EIP-1193)
   * @param network - Network name (defaults to account network or 'very')
   */
  async getProvider(network?: string): Promise<BaseProvider> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('Wepin provider not initialized');
    }

    try {
      const targetNetwork = network || this.account?.network || 'very';
      return await this.provider.getProvider(targetNetwork);
    } catch (error) {
      console.error('Failed to get Wepin provider:', error);
      throw error;
    }
  }

  /**
   * Open WePin widget
   */
  async openWidget(): Promise<void> {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('Wepin SDK not initialized');
    }

    try {
      await this.sdk.openWidget();
    } catch (error) {
      console.error('Failed to open widget:', error);
      throw error;
    }
  }

  /**
   * Close WePin widget
   */
  closeWidget(): void {
    if (!this.isInitialized || !this.sdk) {
      return;
    }

    try {
      this.sdk.closeWidget();
    } catch (error) {
      console.error('Failed to close widget:', error);
    }
  }

  /**
   * Change widget language and currency
   */
  changeLanguage(language: string, currency: string): void {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('Wepin SDK not initialized');
    }

    try {
      this.sdk.changeLanguage({ language, currency });
      if (this.provider) {
        this.provider.changeLanguage({ language, currency });
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  }

  /**
   * Add event listener
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.sdk) {
        await this.sdk.finalize();
      }
      if (this.provider) {
        await this.provider.finalize();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      this.sdk = null;
      this.provider = null;
      this.isInitialized = false;
      this.account = null;
      this.accounts = [];
      this.eventHandlers.clear();
    }
  }

  /**
   * Finalize and cleanup (call when done with wallet)
   */
  async finalize(): Promise<void> {
    await this.cleanup();
  }
}

// Note: React hook implementation should be in a separate .tsx file
// This file provides the core WepinWallet class
// For React hooks, create client/src/hooks/useWepin.tsx

