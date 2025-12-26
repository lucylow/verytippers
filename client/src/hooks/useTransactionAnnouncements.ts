import { useCallback } from 'react';
import { useTransactionAnnouncer } from '@/components/accessibility';

/**
 * useTransactionAnnouncements - Hook for announcing Web3 transaction states
 * 
 * Provides convenient methods for announcing transaction lifecycle events
 * in a screen-reader friendly way.
 */
export function useTransactionAnnouncements() {
  const { announce } = useTransactionAnnouncer();

  const announceTransactionStart = useCallback((description: string) => {
    announce(`Transaction started: ${description}. Waiting for your signature in your wallet.`, 'assertive');
  }, [announce]);

  const announceTransactionSent = useCallback((txHash?: string) => {
    const hashInfo = txHash ? ` Transaction hash: ${txHash.slice(0, 8)}...${txHash.slice(-6)}.` : '';
    announce(`Transaction sent successfully. Waiting for blockchain confirmation.${hashInfo}`, 'assertive');
  }, [announce]);

  const announceTransactionConfirmed = useCallback((txHash?: string) => {
    const hashInfo = txHash ? ` Transaction hash: ${txHash.slice(0, 8)}...${txHash.slice(-6)}.` : '';
    announce(`Transaction confirmed successfully.${hashInfo}`, 'assertive');
  }, [announce]);

  const announceTransactionFailed = useCallback((reason?: string) => {
    const reasonInfo = reason ? ` Reason: ${reason}.` : '';
    announce(`Transaction failed.${reasonInfo}`, 'assertive');
  }, [announce]);

  const announceWalletConnection = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'failed', details?: string) => {
    const messages = {
      connecting: 'Connecting wallet. Please approve the connection request in your wallet.',
      connected: details ? `Wallet connected: ${details}` : 'Wallet connected successfully.',
      disconnected: 'Wallet disconnected.',
      failed: details ? `Wallet connection failed: ${details}` : 'Wallet connection failed.',
    };
    announce(messages[status], status === 'failed' ? 'assertive' : 'polite');
  }, [announce]);

  const announceNetworkSwitch = useCallback((status: 'switching' | 'switched' | 'failed', networkName?: string) => {
    const messages = {
      switching: networkName ? `Switching to ${networkName} network. Please approve in your wallet.` : 'Switching network. Please approve in your wallet.',
      switched: networkName ? `Switched to ${networkName} network successfully.` : 'Network switched successfully.',
      failed: networkName ? `Failed to switch to ${networkName} network.` : 'Network switch failed.',
    };
    announce(messages[status], status === 'failed' ? 'assertive' : 'polite');
  }, [announce]);

  const announceTipSent = useCallback((amount: string, recipient: string, gasless: boolean = true) => {
    const gasInfo = gasless ? ' No gas fees required.' : '';
    announce(`Tip of ${amount} sent to ${recipient}.${gasInfo} Waiting for confirmation.`, 'assertive');
  }, [announce]);

  const announceTipConfirmed = useCallback((amount: string, recipient: string) => {
    announce(`Tip of ${amount} to ${recipient} confirmed successfully.`, 'assertive');
  }, [announce]);

  return {
    announceTransactionStart,
    announceTransactionSent,
    announceTransactionConfirmed,
    announceTransactionFailed,
    announceWalletConnection,
    announceNetworkSwitch,
    announceTipSent,
    announceTipConfirmed,
  };
}

