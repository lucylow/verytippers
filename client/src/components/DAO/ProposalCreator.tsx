// src/components/DAO/ProposalCreator.tsx - Proposal Creator Component
import { useState } from 'react';
import { DAOService, VoterPower } from '@/services/dao';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, X, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { toast } from 'sonner';

interface ProposalCreatorProps {
  daoService: DAOService;
  votingPower?: VoterPower;
  proposalThreshold?: bigint;
  onProposalCreated?: (proposalId: bigint) => void;
  onCancel?: () => void;
}

interface Action {
  target: string;
  value: string;
  calldata: string;
}

export function ProposalCreator({ 
  daoService, 
  votingPower,
  proposalThreshold,
  onProposalCreated,
  onCancel
}: ProposalCreatorProps) {
  const [description, setDescription] = useState('');
  const [actions, setActions] = useState<Action[]>([
    { target: '', value: '0', calldata: '0x' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreateProposal = () => {
    if (!votingPower || !proposalThreshold) return false;
    return votingPower.totalPower >= proposalThreshold;
  };

  const addAction = () => {
    setActions([...actions, { target: '', value: '0', calldata: '0x' }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof Action, value: string) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    // Validate actions
    const validActions = actions.filter(a => 
      a.target.trim() && 
      ethers.isAddress(a.target) &&
      a.calldata.trim() &&
      a.calldata.startsWith('0x')
    );

    if (validActions.length === 0) {
      setError('At least one valid action is required');
      return;
    }

    if (!canCreateProposal()) {
      setError(`Insufficient voting power. Required: ${proposalThreshold ? ethers.formatEther(proposalThreshold) : 'N/A'}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const targets = validActions.map(a => a.target.trim());
      const values = validActions.map(a => a.value);
      const calldatas = validActions.map(a => a.calldata.trim());

      const proposalId = await daoService.createProposal(
        targets,
        values,
        calldatas,
        description.trim()
      );

      toast.success(`Proposal #${proposalId.toString()} created successfully!`);
      
      // Reset form
      setDescription('');
      setActions([{ target: '', value: '0', calldata: '0x' }]);
      
      if (onProposalCreated) {
        onProposalCreated(proposalId);
      }
    } catch (err) {
      console.error('Failed to create proposal:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to create proposal';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <CardTitle>Create Proposal</CardTitle>
        <CardDescription>
          Create a new governance proposal for the DAO
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voting Power Check */}
        {votingPower && proposalThreshold && (
          <Alert className={canCreateProposal() ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Your Voting Power:</span>
                <span className="font-semibold">{ethers.formatEther(votingPower.totalPower)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Proposal Threshold:</span>
                <span className="font-semibold">{ethers.formatEther(proposalThreshold)}</span>
              </div>
              {!canCreateProposal() && (
                <div className="mt-2 text-xs text-red-400">
                  You need more voting power to create proposals. Earn tips, hold NFTs, or stake tokens to increase your power.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Proposal Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe your proposal in detail. This should include what changes you want to make and why..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-slate-800 border-slate-700 min-h-[120px]"
            rows={6}
          />
          <p className="text-xs text-slate-400">
            Be clear and detailed. Include reasoning and expected outcomes.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Actions</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAction}
              disabled={actions.length >= 10}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Action
            </Button>
          </div>

          {actions.map((action, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-300">Action #{index + 1}</span>
                    {actions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`target-${index}`}>Target Address *</Label>
                    <Input
                      id={`target-${index}`}
                      placeholder="0x..."
                      value={action.target}
                      onChange={(e) => updateAction(index, 'target', e.target.value)}
                      className="bg-slate-700 border-slate-600 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`value-${index}`}>Value (in wei) *</Label>
                    <Input
                      id={`value-${index}`}
                      placeholder="0"
                      value={action.value}
                      onChange={(e) => updateAction(index, 'value', e.target.value)}
                      className="bg-slate-700 border-slate-600"
                      type="number"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`calldata-${index}`}>Calldata (hex) *</Label>
                    <Input
                      id={`calldata-${index}`}
                      placeholder="0x..."
                      value={action.calldata}
                      onChange={(e) => updateAction(index, 'calldata', e.target.value)}
                      className="bg-slate-700 border-slate-600 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400">
                      Function call data encoded as hex string
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !canCreateProposal()}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Proposal
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-slate-400 space-y-1">
          <p><strong>Note:</strong> Proposals require a quorum to pass. Make sure your proposal is well-documented and has community support.</p>
          <p>Actions will be executed in sequence if the proposal succeeds and is executed.</p>
        </div>
      </CardContent>
    </Card>
  );
}

