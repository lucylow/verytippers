// src/pages/Admin/AdsEditor.tsx - Admin UI for managing ads
import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, X } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADS_ADMIN_KEY || 'changeme';

interface Ad {
  id?: string;
  advertiser: string;
  title: string;
  description?: string;
  imageUrl?: string;
  targetTags: string[];
  targetGuild?: string;
  url: string;
  budget: number;
  active: boolean;
  impressions?: number;
  clicks?: number;
}

export default function AdsEditor() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ads?apiKey=${ADMIN_KEY}`);
      if (!response.ok) throw new Error('Failed to fetch ads');
      const data = await response.json();
      setAds(data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const handleCreate = () => {
    setEditingAd({
      advertiser: '',
      title: '',
      description: '',
      imageUrl: '',
      targetTags: [],
      url: '',
      budget: 0,
      active: true,
    });
  };

  const handleSave = async () => {
    if (!editingAd) return;

    setLoading(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const adData = {
        ...editingAd,
        targetTags: tags,
      };

      const url = editingAd.id
        ? `${API_BASE_URL}/api/admin/ads/${editingAd.id}?apiKey=${ADMIN_KEY}`
        : `${API_BASE_URL}/api/admin/ads?apiKey=${ADMIN_KEY}`;

      const method = editingAd.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save ad');
      }

      await fetchAds();
      setEditingAd(null);
      setTagsInput('');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setTagsInput(ad.targetTags.join(', '));
  };

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
      <main className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Ads Management</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Ad
        </Button>
      </div>

      {editingAd && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingAd.id ? 'Edit Ad' : 'Create Ad'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingAd(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Advertiser</Label>
              <Input
                value={editingAd.advertiser}
                onChange={(e) => setEditingAd({ ...editingAd, advertiser: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={editingAd.title}
                onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                placeholder="Ad title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editingAd.description || ''}
                onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                placeholder="Ad description"
                rows={3}
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={editingAd.imageUrl || ''}
                onChange={(e) => setEditingAd({ ...editingAd, imageUrl: e.target.value })}
                placeholder="https://example.com/image.png"
              />
            </div>
            <div>
              <Label>Target URL *</Label>
              <Input
                value={editingAd.url}
                onChange={(e) => setEditingAd({ ...editingAd, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label>Target Tags (comma-separated)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="dev, web3, blockchain"
              />
            </div>
            <div>
              <Label>Target Guild (optional)</Label>
              <Input
                value={editingAd.targetGuild || ''}
                onChange={(e) => setEditingAd({ ...editingAd, targetGuild: e.target.value })}
                placeholder="guild-id"
              />
            </div>
            <div>
              <Label>Budget</Label>
              <Input
                type="number"
                value={editingAd.budget}
                onChange={(e) => setEditingAd({ ...editingAd, budget: parseFloat(e.target.value) || 0 })}
                placeholder="0.0"
              />
            </div>
            <Button onClick={handleSave} disabled={loading || !editingAd.title || !editingAd.url}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {ads.map((ad) => (
          <Card key={ad.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{ad.title}</h3>
                    <span className="text-xs text-slate-500">by {ad.advertiser}</span>
                    {ad.active ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Active</span>
                    ) : (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Inactive</span>
                    )}
                  </div>
                  {ad.description && <p className="text-sm text-slate-400 mb-2">{ad.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Impressions: {ad.impressions || 0}</span>
                    <span>Clicks: {ad.clicks || 0}</span>
                    <span>CTR: {ad.impressions ? ((ad.clicks || 0) / ad.impressions * 100).toFixed(2) : 0}%</span>
                  </div>
                  {ad.targetTags.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {ad.targetTags.map((tag, i) => (
                        <span key={i} className="text-xs bg-slate-700 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(ad)}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ads.length === 0 && !editingAd && (
        <Card>
          <CardContent className="p-8 text-center text-slate-400">
            No ads yet. Create your first ad to get started.
          </CardContent>
        </Card>
      )}
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

