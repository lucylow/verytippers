import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MintForm } from '@/components/NFT/MintForm';
import { ListForm } from '@/components/NFT/ListForm';
import { Marketplace } from '@/components/NFT/Marketplace';

export default function NFTMarketplace() {
  const [activeTab, setActiveTab] = useState('marketplace');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">NFT Marketplace</h1>
        <p className="text-muted-foreground">
          Mint, list, and trade NFTs on VeryTippers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="mint">Mint NFT</TabsTrigger>
          <TabsTrigger value="list">List NFT</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-6">
          <Marketplace />
        </TabsContent>

        <TabsContent value="mint" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <MintForm
              onMintSuccess={(tokenId, txHash) => {
                console.log('Minted:', tokenId, txHash);
                // Optionally switch to list tab
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <ListForm
              onListSuccess={(listingId, txHash) => {
                console.log('Listed:', listingId, txHash);
                setActiveTab('marketplace');
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

