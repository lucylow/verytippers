// src/components/NFTMint.tsx - React Component for NFT Minting
import { useState, useEffect } from 'react';
import { useVeryTippers } from '@/hooks/useVeryTippers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { NFTService } from '@/services/nft';
import { Loader2, Sparkles, Gift, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ethers } from 'ethers';

export const NFTMint: React.FC = () => {
  const { provider, signer, isConnected, address } = useVeryTippers();
  const [isMinting, setIsMinting] = useState(false);
  const [nftService, setNftService] = useState<NFTService | null>(null);
  const [tipsReceived, setTipsReceived] = useState<bigint | null>(null);
  const [rarity, setRarity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (provider && signer && isConnected) {
      const service = new NFTService(provider, signer);
      if (service.isInitialized()) {
        setNftService(service);
        loadEligibility();
      } else {
        setError('NFT contract not configured. Please set VITE_NFT_CONTRACT_ADDRESS in environment variables.');
      }
    } else {
      setNftService(null);
      setTipsReceived(null);
      setRarity(null);
    }
  }, [provider, signer, isConnected]);

  const loadEligibility = async () => {
    if (!nftService || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const tips = await nftService.getTotalTipsReceived(address);
      const rarityLevel = await nftService.getRarityForTips(tips);
      setTipsReceived(tips);
      setRarity(rarityLevel);
    } catch (err) {
      console.error('Failed to load eligibility:', err);
      setError(err instanceof Error ? err.message : 'Failed to load eligibility');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    if (!nftService) {
      toast.error('NFT service not initialized');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsMinting(true);
    setError(null);

    try {
      const tokenId = await nftService.mintNFT();
      toast.success('NFT Minted!', {
        description: `Congratulations! You minted VeryTippers NFT #${tokenId.toString()}`,
      });
      
      // Reload eligibility after minting
      await loadEligibility();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint NFT';
      setError(errorMessage);
      toast.error('Mint Failed', {
        description: errorMessage,
      });
    } finally {
      setIsMinting(false);
    }
  };

  const getRarityName = (rarity: number): string => {
    const names = ['Common', 'Rare', 'Epic', 'Legendary'];
    return names[rarity] || 'Unknown';
  };

  const getRarityColor = (rarity: number): string => {
    const colors = [
      'text-gray-400', // Common
      'text-blue-400', // Rare
      'text-purple-400', // Epic
      'text-yellow-400', // Legendary
    ];
    return colors[rarity] || 'text-gray-400';
  };

  const getRarityGradient = (rarity: number): string => {
    const gradients = [
      'from-gray-600 to-gray-700', // Common
      'from-blue-600 to-blue-700', // Rare
      'from-purple-600 to-purple-700', // Epic
      'from-yellow-600 to-orange-600', // Legendary
    ];
    return gradients[rarity] || 'from-gray-600 to-gray-700';
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Mint VeryTippers NFT
          </CardTitle>
          <CardDescription>
            Connect your wallet to mint NFTs based on your tipping activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to mint NFTs
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5" />
          Mint VeryTippers NFT
        </CardTitle>
        <CardDescription className="text-slate-300">
          Mint based on your tipping activity! More tips = rarer NFT.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tipsReceived !== null && rarity !== null ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Total Tips Received</span>
                <span className="text-lg font-semibold text-white">
                  {ethers.formatEther(tipsReceived)} VERY
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Eligible Rarity</span>
                <span className={`text-lg font-bold ${getRarityColor(rarity)}`}>
                  {getRarityName(rarity)}
                </span>
              </div>
            </div>

            <div className={`p-4 bg-gradient-to-r ${getRarityGradient(rarity)} rounded-lg border border-purple-500/30`}>
              <div className="text-center">
                <div className={`inline-block px-4 py-2 rounded-lg bg-gradient-to-r ${getRarityGradient(rarity)} text-white font-bold text-lg mb-2`}>
                  {getRarityName(rarity)} NFT
                </div>
                <p className="text-sm text-slate-300 mt-2">
                  You're eligible to mint a {getRarityName(rarity).toLowerCase()} NFT!
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <Button 
          onClick={handleMint}
          disabled={!nftService || isMinting || !isConnected}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          size="lg"
        >
          {isMinting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Minting...
            </>
          ) : (
            <>
              <Gift className="mr-2 h-4 w-4" />
              Mint NFT (Free)
            </>
          )}
        </Button>

        <div className="text-xs text-slate-400 text-center space-y-1">
          <p>✨ More tips = Rarer NFTs</p>
          <p>Common (0 VERY) | Rare (1 VERY) | Epic (5 VERY) | Legendary (25 VERY)</p>
        </div>
      </CardContent>
    </Card>
  );
};

