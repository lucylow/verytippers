import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MintFormProps {
  onMintSuccess?: (tokenId: number, txHash: string) => void;
}

export function MintForm({ onMintSuccess }: MintFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    toAddress: '',
    name: '',
    description: '',
    imageUrl: '',
    imageBase64: '',
    boostMultiplier: '1.0'
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData({ ...formData, imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/nft/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAddress: formData.toAddress,
          name: formData.name,
          description: formData.description,
          imageUrl: formData.imageUrl || undefined,
          imageBase64: formData.imageBase64 || undefined,
          boostMultiplier: parseFloat(formData.boostMultiplier) || 1.0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to mint NFT');
      }

      toast.success('NFT minted successfully!');
      if (onMintSuccess) {
        onMintSuccess(data.data.tokenId, data.data.txHash);
      }

      // Reset form
      setFormData({
        toAddress: '',
        name: '',
        description: '',
        imageUrl: '',
        imageBase64: '',
        boostMultiplier: '1.0'
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to mint NFT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint NFT</CardTitle>
        <CardDescription>Create a new NFT with metadata stored on IPFS</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="toAddress">Recipient Address</Label>
            <Input
              id="toAddress"
              value={formData.toAddress}
              onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
              placeholder="0x..."
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VeryBadge #123"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Creator badge — awarded to top tippers"
              required
            />
          </div>

          <div>
            <Label htmlFor="imageUrl">Image URL (or upload below)</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="imageFile">Or Upload Image</Label>
            <Input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            {formData.imageBase64 && (
              <img
                src={formData.imageBase64}
                alt="Preview"
                className="mt-2 max-w-xs rounded"
              />
            )}
          </div>

          <div>
            <Label htmlFor="boostMultiplier">Boost Multiplier</Label>
            <Input
              id="boostMultiplier"
              type="number"
              step="0.1"
              min="1"
              value={formData.boostMultiplier}
              onChange={(e) => setFormData({ ...formData, boostMultiplier: e.target.value })}
              placeholder="1.0"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Multiplier for tip weighting (e.g., 2.0 = 2x boost)
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              'Mint NFT'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

