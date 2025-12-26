import React from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Network, TestTube } from 'lucide-react';

interface NetworkSelectorProps {
  className?: string;
}

export function NetworkSelector({ className }: NetworkSelectorProps) {
  const { networkType, networkConfig, setNetworkType, switchToNetwork } = useNetwork();

  const handleNetworkChange = async (newNetworkType: 'testnet' | 'mainnet') => {
    if (newNetworkType === networkType) {
      return;
    }

    setNetworkType(newNetworkType);

    // If wallet is connected, try to switch network
    if (window.ethereum) {
      try {
        await switchToNetwork();
      } catch (error) {
        console.error('Failed to switch network in wallet:', error);
        // Network change in context still happened, just wallet switch failed
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={networkType} onValueChange={handleNetworkChange}>
        <SelectTrigger className="w-[200px]">
          <div className="flex items-center gap-2">
            {networkType === 'testnet' ? (
              <TestTube className="w-4 h-4 text-yellow-500" />
            ) : (
              <Network className="w-4 h-4 text-green-500" />
            )}
            <SelectValue>
              {networkType === 'testnet' ? 'VERY Testnet' : 'VERY Mainnet'}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="testnet">
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4 text-yellow-500" />
              <span>VERY Testnet</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                Default
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="mainnet">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-green-500" />
              <span>VERY Mainnet</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <div className="text-xs text-muted-foreground hidden sm:block">
        Chain ID: {networkConfig.chainId}
      </div>
    </div>
  );
}

