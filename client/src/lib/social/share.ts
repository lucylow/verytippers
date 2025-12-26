// src/lib/social/share.ts
// Social sharing utilities for Web3 interactions

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  hashtags?: string[];
}

/**
 * Share content using Web Share API with fallback to clipboard
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  const { title, text, url, hashtags } = options;
  const shareUrl = url || window.location.href;
  const shareText = text || title || '';
  const hashtagsString = hashtags ? hashtags.map(tag => `#${tag}`).join(' ') : '';

  const shareData: ShareData = {
    title: title || 'VeryTippers',
    text: `${shareText} ${hashtagsString}`.trim(),
    url: shareUrl,
  };

  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    } else {
      // Fallback to clipboard
      const fullText = `${shareText} ${hashtagsString}\n${shareUrl}`.trim();
      await navigator.clipboard.writeText(fullText);
      return false; // Indicates clipboard fallback was used
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      // User cancelled share
      return false;
    }
    // Fallback to clipboard on error
    try {
      const fullText = `${shareText} ${hashtagsString}\n${shareUrl}`.trim();
      await navigator.clipboard.writeText(fullText);
      return false;
    } catch (clipboardError) {
      console.error('Failed to share or copy:', clipboardError);
      throw clipboardError;
    }
  }
}

/**
 * Share wallet connection
 */
export async function shareWalletConnection(address: string): Promise<boolean> {
  return shareContent({
    title: 'I just connected my wallet to VeryTippers!',
    text: `Check out my Web3 profile: ${address.slice(0, 6)}...${address.slice(-4)}`,
    url: `${window.location.origin}/profile/${address}`,
    hashtags: ['Web3', 'VeryTippers', 'VERYChain'],
  });
}

/**
 * Share a tip transaction
 */
export async function shareTip(
  amount: string,
  recipient: string,
  txHash?: string
): Promise<boolean> {
  const txUrl = txHash 
    ? `https://explorer.verychain.io/tx/${txHash}`
    : window.location.href;

  return shareContent({
    title: 'I just sent a tip!',
    text: `Sent ${amount} VERY to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
    url: txUrl,
    hashtags: ['Web3', 'VeryTippers', 'Tipping'],
  });
}

/**
 * Share profile
 */
export async function shareProfile(address: string, stats?: {
  tipsSent?: number;
  tipsReceived?: number;
  rank?: number;
}): Promise<boolean> {
  let text = `Check out my VeryTippers profile: ${address.slice(0, 6)}...${address.slice(-4)}`;
  
  if (stats) {
    const statsText = [];
    if (stats.tipsSent) statsText.push(`${stats.tipsSent} tips sent`);
    if (stats.tipsReceived) statsText.push(`${stats.tipsReceived} tips received`);
    if (stats.rank) statsText.push(`Rank #${stats.rank}`);
    
    if (statsText.length > 0) {
      text += `\n${statsText.join(' • ')}`;
    }
  }

  return shareContent({
    title: 'My VeryTippers Profile',
    text,
    url: `${window.location.origin}/profile/${address}`,
    hashtags: ['Web3', 'VeryTippers', 'VERYChain'],
  });
}

/**
 * Share achievement/badge
 */
export async function shareAchievement(
  badgeName: string,
  description?: string
): Promise<boolean> {
  return shareContent({
    title: `I just earned the ${badgeName} badge!`,
    text: description || `Check out my achievement on VeryTippers`,
    url: window.location.href,
    hashtags: ['Web3', 'VeryTippers', 'Achievement', 'Badge'],
  });
}

/**
 * Copy address to clipboard
 */
export async function copyAddress(address: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(address);
  } catch (error) {
    console.error('Failed to copy address:', error);
    throw error;
  }
}

/**
 * Generate shareable link for wallet address
 */
export function getProfileLink(address: string): string {
  return `${window.location.origin}/profile/${address}`;
}

/**
 * Generate shareable link for transaction
 */
export function getTransactionLink(txHash: string, explorerUrl?: string): string {
  const baseUrl = explorerUrl || 'https://explorer.verychain.io';
  return `${baseUrl}/tx/${txHash}`;
}

