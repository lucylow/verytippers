// src/components/NFTGallery.tsx - Interactive NFT Collection Viewer
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVeryTippers } from '@/hooks/useVeryTippers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Star, Zap, Flame, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NFT {
  tokenId: string;
  rarity: number; // 0: common, 1: rare, 2: epic, 3: legendary
  rarityName: 'common' | 'rare' | 'epic' | 'legendary';
  mintedAt: number;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
}

export const NFTGallery: React.FC = () => {
  const { provider, isConnected, address } = useVeryTippers();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      loadNFTs();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const loadNFTs = async () => {
    try {
      setLoading(true);
      // Mock NFT data - replace with actual API call
      const mockNFTs: NFT[] = Array.from({ length: 8 }, (_, i) => {
        const rarities: ('common' | 'rare' | 'epic' | 'legendary')[] = ['common', 'rare', 'epic', 'legendary'];
        const rarityIndex = Math.floor(Math.random() * 4);
        return {
          tokenId: `#${1000 + i}`,
          rarity: rarityIndex,
          rarityName: rarities[rarityIndex],
          mintedAt: Date.now() - Math.random() * 1000000000,
          metadata: {
            name: `${rarities[rarityIndex]} Tipper`,
            description: `A ${rarities[rarityIndex]} VeryTippers NFT`,
          }
        };
      });
      setNfts(mockNFTs);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const rarityStyles = useMemo(() => ({
    common: 'from-slate-500 to-slate-600',
    rare: 'from-blue-500 to-blue-600',
    epic: 'from-purple-500 to-purple-600',
    legendary: 'from-orange-500 via-red-500 to-yellow-500'
  }), []);

  const rarityBadgeStyles = useMemo(() => ({
    common: 'bg-gradient-to-r from-slate-500 to-slate-600',
    rare: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    epic: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    legendary: 'bg-gradient-to-r from-orange-500 to-red-500'
  }), []);

  const getVoteMultiplier = (rarity: number) => {
    if (rarity === 3) return '10x';
    if (rarity === 2) return '5x';
    if (rarity === 1) return '2x';
    return '1x';
  };

  if (!isConnected) {
    return (
      <Card className="max-w-7xl mx-auto">
        <CardContent className="p-16 text-center">
          <Crown className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-slate-400 mb-2">Connect Wallet</h3>
          <p className="text-slate-500">Connect your wallet to view your NFT collection</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 p-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <div className="inline-flex items-center gap-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-8 py-4 rounded-3xl border border-purple-500/30 backdrop-blur-xl">
          <Crown className="w-8 h-8 text-yellow-400 drop-shadow-lg" />
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
              NFT Collection
            </h1>
            <p className="text-xl text-slate-300 mt-2">Tip your way to rarity</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50 text-center p-8 h-32">
          <div className="text-4xl mb-2">🎨</div>
          <div className="text-3xl font-bold text-white">{nfts.length}</div>
          <div className="text-slate-400">Owned NFTs</div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-center p-8 h-32">
          <Zap className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <div className="text-3xl font-bold text-emerald-400">12.5x</div>
          <div className="text-emerald-300">DAO Vote Boost</div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 text-center p-8 h-32">
          <Star className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <div className="text-3xl font-bold text-purple-400">
            {nfts.filter(n => n.rarity >= 3).length}
          </div>
          <div className="text-purple-300">Legendaries</div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30 text-center p-8 h-32">
          <Flame className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <div className="text-3xl font-bold text-orange-400">🔥</div>
          <div className="text-orange-300">On Fire!</div>
        </Card>
      </div>

      {/* NFT Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-20 h-20 text-purple-500 animate-spin" />
        </div>
      ) : nfts.length === 0 ? (
        <Card className="p-16 text-center bg-gradient-to-r from-slate-900/30 to-slate-800/30 border-slate-700/50">
          <CardContent>
            <div className="w-24 h-24 bg-gradient-to-r from-slate-700 to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Crown className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No NFTs Yet</h3>
            <p className="text-slate-400 mb-8">Send tips to earn your first VeryTippers NFT!</p>
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:shadow-purple-500/25 transition-all">
              Start Tipping
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence>
            {nfts.map((nft, index) => (
              <motion.div
                key={nft.tokenId}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="group cursor-pointer"
                onClick={() => setSelectedNFT(nft)}
              >
                <Card className="h-[400px] overflow-hidden bg-gradient-to-br from-slate-900/70 to-slate-800/70 border-slate-700/50 group-hover:border-purple-500/50 relative">
                  {/* NFT Preview */}
                  <div className="h-64 bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center relative overflow-hidden">
                    <div
                      className={cn(
                        'absolute inset-0 bg-gradient-to-r opacity-20 group-hover:opacity-30 transition-opacity',
                        rarityStyles[nft.rarityName]
                      )}
                    />
                    <div className="relative z-10 text-6xl drop-shadow-2xl animate-pulse">
                      🖼️
                    </div>
                    {/* Rarity Badge */}
                    <div
                      className={cn(
                        'absolute top-4 right-4 px-4 py-2 rounded-2xl text-xs font-bold capitalize text-white shadow-2xl',
                        rarityBadgeStyles[nft.rarityName]
                      )}
                    >
                      {nft.rarityName}
                    </div>
                  </div>

                  <CardContent className="p-6 pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-slate-400">{nft.tokenId}</span>
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center group-hover:bg-emerald-400 transition-colors">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <h3 className="font-bold text-xl text-white leading-tight truncate">
                        {nft.metadata?.name || `${nft.rarityName} Tipper`}
                      </h3>
                      <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                        DAO Vote Multiplier: {getVoteMultiplier(nft.rarity)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* NFT Detail Modal */}
      <AnimatePresence>
        {selectedNFT && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedNFT(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-700"
            >
              <div className="text-center space-y-4">
                <div className="text-8xl mb-4">{'🖼️'}</div>
                <h2 className="text-2xl font-bold text-white">{selectedNFT.metadata?.name}</h2>
                <p className="text-slate-400">{selectedNFT.metadata?.description}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={cn('px-4 py-2 rounded-full text-sm font-bold text-white', rarityBadgeStyles[selectedNFT.rarityName])}>
                    {selectedNFT.rarityName}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNFT(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

