import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MintForm } from '@/components/NFT/MintForm';
import { ListForm } from '@/components/NFT/ListForm';
import { Marketplace } from '@/components/NFT/Marketplace';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function NFTMarketplace() {
  const [activeTab, setActiveTab] = useState('marketplace');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Failed to load navigation</h1>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
      >
        <Navbar />
      </ErrorBoundary>
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">NFT Marketplace</h1>
          <p className="text-muted-foreground">
            Mint, list, and trade NFTs on VeryTippers
          </p>
        </div>

        <ErrorBoundary
          fallback={
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold mb-4">Failed to load NFT Marketplace</h2>
              <p className="text-muted-foreground mb-4">
                There was an error loading the NFT marketplace interface.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90"
                >
                  Go Home
                </button>
              </div>
            </div>
          }
          onError={(error, errorInfo) => {
            console.error("Error in NFT Marketplace:", error, errorInfo);
          }}
        >
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
        </ErrorBoundary>
      </main>
      <ErrorBoundary
        fallback={
          <div className="py-4 px-4 text-center text-sm text-muted-foreground">
            Footer unavailable
          </div>
        }
      >
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

