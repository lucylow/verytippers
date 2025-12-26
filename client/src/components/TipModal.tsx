import React, { useState } from 'react'
import { TipPayload } from '@/types/tip'
import * as api from '@/lib/mockApi'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, Wallet, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  open: boolean
  payload?: TipPayload
  onClose: () => void
  onComplete: (txHash: string) => void
  meId: string
}

export default function TipModal({ open, payload, onClose, onComplete, meId }: Props) {
  const [loading, setLoading] = useState(false)
  const [useWepin, setUseWepin] = useState(true)
  const [step, setStep] = useState<'confirm' | 'signing' | 'processing' | 'complete'>('confirm')
  
  if (!open || !payload) return null

  async function handleSign() {
    setLoading(true)
    setStep('signing')
    
    try {
      // 1. client signs payload (mock)
      setStep('signing')
      const signed = await api.api_signPayload(payload, meId)
      toast.success('Payload signed')
      
      // 2. orchestrator ipfs add (encrypted) -> CID
      setStep('processing')
      const { cid } = await api.api_ipfsAdd(JSON.stringify({ payload: signed }))
      toast.success(`Content uploaded to IPFS: ${cid.slice(0, 8)}...`)
      
      // 3. create metaTx
      const metaTx = await api.api_createMetaTx(payload, cid)
      
      // 4. relayer submits
      setStep('processing')
      const receipt = await api.api_relayerSubmit(metaTx)
      
      setStep('complete')
      toast.success('Tip submitted successfully!')
      
      // Wait a moment to show completion state
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // done
      onComplete(receipt.txHash)
    } catch (err: any) {
      toast.error('Error: ' + (err?.message || 'Failed to process tip'))
      setStep('confirm')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setStep('confirm')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {step === 'complete' ? 'Tip Confirmed!' : 'Confirm Tip'}
          </DialogTitle>
          <DialogDescription>
            {step === 'complete' 
              ? 'Your tip has been successfully submitted to the blockchain.'
              : 'Review and confirm your tip transaction'}
          </DialogDescription>
        </DialogHeader>

        {step === 'complete' ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div className="space-y-2">
              <p className="font-semibold">Tip sent successfully!</p>
              <p className="text-sm text-muted-foreground">
                Transaction hash: {payload && '0x' + Math.random().toString(16).slice(2, 10) + '...'}
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">@{payload.to}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{payload.amount} VERY</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gas:</span>
                <span className="text-green-600 dark:text-green-400 font-medium">0 (relayer pays)</span>
              </div>
              {payload.message && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">Message:</span>
                  <p className="mt-1 text-sm">{payload.message}</p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="wepin" 
                checked={useWepin} 
                onCheckedChange={(checked) => setUseWepin(checked === true)}
                disabled={loading}
              />
              <Label 
                htmlFor="wepin" 
                className="text-sm font-normal cursor-pointer"
              >
                Use Wepin key (embedded)
              </Label>
            </div>

            {step === 'signing' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing transaction...</span>
              </div>
            )}

            {step === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing transaction...</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSign} 
                disabled={loading || step !== 'confirm'}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === 'signing' ? 'Signing...' : 'Processing...'}
                  </>
                ) : (
                  'Sign & Submit'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

