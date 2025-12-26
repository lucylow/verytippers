import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShoppingCart } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { transferVeryTokens, getVeryTokenContract } from '@/lib/web3/veryToken';
import { CONTRACTS } from '@/lib/web3/config';

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
  const { isConnected, signer, address, veryTokenBalance } = useWallet();
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

  const handleBuy = async (listingId: number, price: string, seller: string) => {
    // Check wallet connection
    if (!isConnected || !signer || !address) {
      toast.error('Please connect your MetaMask wallet first');
      return;
    }

    if (!window.ethereum) {
      toast.error('Please install MetaMask or connect a wallet');
      return;
    }

    setBuying(listingId);

    try {
      // Parse price (it's in wei, so we need to convert to token amount)
      const priceInWei = BigInt(price);
      
      // Get VERY token contract to check balance and decimals
      const veryTokenContract = getVeryTokenContract(signer);
      const decimals = await veryTokenContract.decimals();
      const priceInTokens = Number(ethers.formatUnits(priceInWei, Number(decimals)));

      // Check balance
      const balance = await veryTokenContract.balanceOf(address);
      if (balance < priceInWei) {
        const balanceFormatted = ethers.formatUnits(balance, Number(decimals));
        toast.error(`Insufficient VERY token balance. You have ${balanceFormatted} VERY, but need ${priceInTokens} VERY`);
        setBuying(null);
        return;
      }

      // Calculate platform fee (2.5% = 250 basis points)
      const platformFeeBps = 250;
      const feeAmount = (priceInWei * BigInt(platformFeeBps)) / BigInt(10000);
      const sellerAmount = priceInWei - feeAmount;

      // Get platform fee recipient from API or use seller as fallback
      let platformFeeRecipient = seller;
      try {
        const feeResponse = await fetch('/api/nft/marketplace/fee-recipient');
        if (feeResponse.ok) {
          const feeData = await feeResponse.json();
          if (feeData.success && feeData.data) {
            platformFeeRecipient = feeData.data;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch platform fee recipient, using seller address', error);
      }

      toast.loading('Transferring VERY tokens...', { id: 'transfer-tokens' });

      // Transfer VERY tokens to seller
      const transferToSeller = await transferVeryTokens(
        seller,
        Number(ethers.formatUnits(sellerAmount, Number(decimals))),
        signer
      );

      if (!transferToSeller.success) {
        toast.error(transferToSeller.error || 'Failed to transfer VERY tokens to seller', { id: 'transfer-tokens' });
        setBuying(null);
        return;
      }

      // Transfer platform fee if applicable
      if (feeAmount > 0 && platformFeeRecipient !== seller) {
        const transferFee = await transferVeryTokens(
          platformFeeRecipient,
          Number(ethers.formatUnits(feeAmount, Number(decimals))),
          signer
        );

        if (!transferFee.success) {
          toast.warning('NFT purchase completed, but platform fee transfer failed: ' + (transferFee.error || 'Unknown error'), { id: 'transfer-tokens' });
        }
      }

      toast.success('VERY tokens transferred successfully', { id: 'transfer-tokens' });
      toast.loading('Completing NFT purchase...', { id: 'complete-purchase' });

      // Now call the buy API to complete the NFT transfer
      // The API will handle the marketplace contract interaction
      const response = await fetch('/api/nft/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          buyerAddress: address,
          paymentToken: 'VERY', // Indicate we're using VERY tokens
          paymentTxHash: transferToSeller.transactionHash
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete NFT purchase');
      }

      toast.success('NFT purchased successfully with VERY tokens!', { id: 'complete-purchase' });
      loadListings(); // Refresh listings
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      // Handle user rejection
      if (error.code === 4001 || error.message?.includes('reject') || error.message?.includes('denied')) {
        toast.error('Transaction rejected by user', { id: 'transfer-tokens' });
      } else {
        toast.error(error.message || 'Failed to buy NFT', { id: 'transfer-tokens' });
      }
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
                  {!isConnected ? (
                    <Button
                      disabled
                      className="w-full"
                      variant="outline"
                    >
                      Connect Wallet to Buy
                    </Button>
                  ) : veryTokenBalance && parseFloat(veryTokenBalance.formatted) < parseFloat(ethers.formatEther(listing.price)) ? (
                    <Button
                      disabled
                      className="w-full"
                      variant="outline"
                    >
                      Insufficient VERY Balance
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleBuy(Number(listing.listingId), listing.price, listing.seller)}
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
                          Buy with VERY
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

