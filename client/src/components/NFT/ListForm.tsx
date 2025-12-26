import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ListFormProps {
  nftContract?: string;
  tokenId?: number;
  onListSuccess?: (listingId: number, txHash: string) => void;
}

export function ListForm({ nftContract, tokenId, onListSuccess }: ListFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nftContract: nftContract || '',
    tokenId: tokenId?.toString() || '',
    price: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/nft/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nftContract: formData.nftContract,
          tokenId: parseInt(formData.tokenId),
          price: formData.price
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to list NFT');
      }

      toast.success('NFT listed successfully!');
      if (onListSuccess) {
        onListSuccess(data.data.listingId, data.data.txHash);
      }

      // Reset form
      setFormData({
        nftContract: '',
        tokenId: '',
        price: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to list NFT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>List NFT for Sale</CardTitle>
        <CardDescription>
          List your NFT on the marketplace. Make sure to approve the marketplace contract first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nftContract">NFT Contract Address</Label>
            <Input
              id="nftContract"
              value={formData.nftContract}
              onChange={(e) => setFormData({ ...formData, nftContract: e.target.value })}
              placeholder="0x..."
              required
            />
          </div>

          <div>
            <Label htmlFor="tokenId">Token ID</Label>
            <Input
              id="tokenId"
              type="number"
              value={formData.tokenId}
              onChange={(e) => setFormData({ ...formData, tokenId: e.target.value })}
              placeholder="1"
              required
            />
          </div>

          <div>
            <Label htmlFor="price">Price (in VERY)</Label>
            <Input
              id="price"
              type="number"
              step="0.001"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.1"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Listing...
              </>
            ) : (
              'List NFT'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

