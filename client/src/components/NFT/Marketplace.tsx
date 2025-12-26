import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShoppingCart } from 'lucide-react';
import { ethers } from 'ethers';

interface Listing {
  id: number;
  listingId: string;
  seller: string;
  price: string;
  active: boolean;
  NFT: {
    tokenId: string;
    contract: string;
    tokenURI: string;
    metadata?: any;
  };
}

export function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const response = await fetch('/api/nft/marketplace/listings?limit=50');
      const data = await response.json();
      if (data.success) {
        setListings(data.data);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listingId: number, price: string) => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask or connect a wallet');
      return;
    }

    setBuying(listingId);

    try {
      // Get buyer address
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const buyerAddress = await signer.getAddress();

      // Call buy API
      const response = await fetch('/api/nft/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          buyerAddress
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to buy NFT');
      }

      toast.success('NFT purchased successfully!');
      loadListings(); // Refresh listings
    } catch (error: any) {
      toast.error(error.message || 'Failed to buy NFT');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">NFT Marketplace</h2>
        <p className="text-muted-foreground">Browse and purchase NFTs</p>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No active listings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardHeader>
                <CardTitle>Token #{listing.NFT.tokenId}</CardTitle>
                <CardDescription>
                  {listing.NFT.metadata?.name || 'NFT'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {listing.NFT.metadata?.image && (
                    <img
                      src={listing.NFT.metadata.image}
                      alt={listing.NFT.metadata.name}
                      className="w-full rounded"
                    />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-2xl font-bold">{ethers.formatEther(listing.price)} VERY</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seller</p>
                    <p className="text-sm font-mono">{listing.seller.slice(0, 10)}...</p>
                  </div>
                  <Button
                    onClick={() => handleBuy(Number(listing.listingId), listing.price)}
                    disabled={buying === Number(listing.listingId)}
                    className="w-full"
                  >
                    {buying === Number(listing.listingId) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Purchasing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Buy Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

