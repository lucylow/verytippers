// src/services/dao.ts - Frontend DAO Integration
import { ethers } from 'ethers';
import { NFTService } from './nft';

// Contract address - should be set via environment variables
const DAO_CONTRACT_ADDRESS = import.meta.env.VITE_DAO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// ABI definitions - Core functions for DAO governance
const VeryTippersDAOABI = [
  // Proposal functions
  'function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) external returns (uint256)',
  'function castVote(uint256 proposalId, uint8 support) external returns (uint256)',
  'function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external returns (uint256)',
  'function execute(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) external payable returns (uint256)',
  'function queue(uint256 proposalId) external returns (uint256)',
  
  // Voting power functions
  'function getVotes(address account, uint256 blockNumber) public view returns (uint256)',
  'function getVoterPower(address voter) external view returns (uint256 tokenPower, uint256 nftPower, uint256 tipsPower, uint256 totalPower)',
  'function getNFTVoteBoost(address account) external view returns (uint256)',
  'function memberTipsReceived(address) public view returns (uint256)',
  
  // Proposal queries
  'function state(uint256 proposalId) public view returns (uint8)',
  'function proposalCount() public view returns (uint256)',
  'function proposalThreshold() public view returns (uint256)',
  'function quorum(uint256 blockNumber) public view returns (uint256)',
  
  // DAO stats
  'function daoStats() external view returns (uint256 totalSupply_, uint256 treasury_, uint256 activeProposals)',
  'function treasuryBalance() public view returns (uint256)',
  'function treasuryRecipient() public view returns (address)',
  
  // Events
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
  'event ProposalCreatedWithTips(uint256 proposalId, address proposer, uint256 tipsBoost)',
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
  'event TipsRecorded(address indexed member, uint256 amount)',
  
  // Token interface (if DAO uses external token)
  'function token() external view returns (address)'
];

export interface VoterPower {
  tokenPower: bigint;
  nftPower: bigint;
  tipsPower: bigint;
  totalPower: bigint;
}

export interface DAOStats {
  totalSupply: bigint;
  treasury: bigint;
  activeProposals: bigint;
}

export interface ProposalInfo {
  proposalId: bigint;
  proposer: string;
  targets: string[];
  values: bigint[];
  calldatas: string[];
  startBlock: bigint;
  endBlock: bigint;
  description: string;
  state: number;
  votesFor?: bigint;
  votesAgainst?: bigint;
  votesAbstain?: bigint;
  quorum?: bigint;
  hasVoted?: boolean;
  userVote?: 0 | 1 | 2;
  tipsBoost?: bigint;
}

export interface VoteInfo {
  proposalId: bigint;
  voter: string;
  support: 0 | 1 | 2;
  weight: bigint;
  reason?: string;
  blockNumber: bigint;
  timestamp?: number;
}

export interface ProposalVotes {
  for: bigint;
  against: bigint;
  abstain: bigint;
  quorum: bigint;
}

export class DAOService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private daoContract: ethers.Contract | null = null;

  constructor(provider: ethers.BrowserProvider | null, signer: ethers.JsonRpcSigner | null) {
    this.provider = provider;
    this.signer = signer;

    if (provider && DAO_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      if (signer) {
        this.daoContract = new ethers.Contract(
          DAO_CONTRACT_ADDRESS,
          VeryTippersDAOABI,
          signer
        );
      } else {
        this.daoContract = new ethers.Contract(
          DAO_CONTRACT_ADDRESS,
          VeryTippersDAOABI,
          provider
        );
      }
    }
  }

  /**
   * Check if DAO contract is initialized
   */
  isInitialized(): boolean {
    return this.daoContract !== null && DAO_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';
  }

  /**
   * Create a governance proposal
   */
  async createProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    description: string
  ): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    if (!this.daoContract) {
      throw new Error('DAO contract not initialized. Please check contract address configuration.');
    }

    // Convert string values to BigInt
    const valuesBigInt = values.map(v => BigInt(v));

    // Execute proposal
    const tx = await this.daoContract.propose(targets, valuesBigInt, calldatas, description);
    const receipt = await tx.wait();

    // Parse proposal ID from events
    const proposalCreatedEvent = receipt.logs
      .map((log: any) => {
        try {
          return this.daoContract!.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed && parsed.name === 'ProposalCreated');

    if (!proposalCreatedEvent || !proposalCreatedEvent.args) {
      throw new Error('Failed to get proposal ID from transaction');
    }

    const proposalId = proposalCreatedEvent.args.proposalId;
    console.log(`Proposal created! Proposal ID: ${proposalId.toString()}`);

    return proposalId;
  }

  /**
   * Cast a vote on a proposal
   * @param proposalId The proposal ID
   * @param support 0 = Against, 1 = For, 2 = Abstain
   * @param reason Optional reason for the vote
   */
  async castVote(
    proposalId: bigint,
    support: 0 | 1 | 2,
    reason?: string
  ): Promise<void> {
    if (!this.signer) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    let tx;
    if (reason) {
      tx = await this.daoContract.castVoteWithReason(proposalId, support, reason);
    } else {
      tx = await this.daoContract.castVote(proposalId, support);
    }

    await tx.wait();
    console.log(`Vote cast on proposal ${proposalId.toString()}`);
  }

  /**
   * Get voting power breakdown for an address
   */
  async getVoterPower(address?: string): Promise<VoterPower> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    if (!address && !this.signer) {
      throw new Error('Address required or wallet must be connected');
    }

    const targetAddress = address || (await this.signer!.getAddress());
    const [tokenPower, nftPower, tipsPower, totalPower] = await this.daoContract.getVoterPower(targetAddress);

    return {
      tokenPower,
      nftPower,
      tipsPower,
      totalPower
    };
  }

  /**
   * Get my voting power
   */
  async getMyPower(): Promise<VoterPower> {
    return this.getVoterPower();
  }

  /**
   * Get DAO statistics
   */
  async getDAOStats(): Promise<DAOStats> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    const [totalSupply, treasury, activeProposals] = await this.daoContract.daoStats();

    return {
      totalSupply,
      treasury,
      activeProposals
    };
  }

  /**
   * Get proposal state
   * 0 = Pending, 1 = Active, 2 = Canceled, 3 = Defeated, 4 = Succeeded, 5 = Queued, 6 = Expired, 7 = Executed
   */
  async getProposalState(proposalId: bigint): Promise<number> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    const state = await this.daoContract.state(proposalId);
    return Number(state);
  }

  /**
   * Get proposal threshold (minimum voting power needed to create a proposal)
   */
  async getProposalThreshold(): Promise<bigint> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    return await this.daoContract.proposalThreshold();
  }

  /**
   * Get quorum for a specific block
   */
  async getQuorum(blockNumber?: bigint): Promise<bigint> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    const block = blockNumber ?? BigInt(await this.provider!.getBlockNumber());
    return await this.daoContract.quorum(block);
  }

  /**
   * Get tips received by a member
   */
  async getMemberTipsReceived(address?: string): Promise<bigint> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    if (!address && !this.signer) {
      throw new Error('Address required or wallet must be connected');
    }

    const targetAddress = address || (await this.signer!.getAddress());
    return await this.daoContract.memberTipsReceived(targetAddress);
  }

  /**
   * Get NFT vote boost for an address
   */
  async getNFTVoteBoost(address?: string): Promise<bigint> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    if (!address && !this.signer) {
      throw new Error('Address required or wallet must be connected');
    }

    const targetAddress = address || (await this.signer!.getAddress());
    return await this.daoContract.getNFTVoteBoost(targetAddress);
  }

  /**
   * Queue a proposal for execution (after it succeeds)
   */
  async queueProposal(proposalId: bigint): Promise<void> {
    if (!this.signer) {
      throw new Error('Wallet not connected.');
    }

    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    const tx = await this.daoContract.queue(proposalId);
    await tx.wait();
    console.log(`Proposal ${proposalId.toString()} queued for execution`);
  }

  /**
   * Execute a queued proposal
   */
  async executeProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string
  ): Promise<void> {
    if (!this.signer) {
      throw new Error('Wallet not connected.');
    }

    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    const valuesBigInt = values.map(v => BigInt(v));
    const tx = await this.daoContract.execute(targets, valuesBigInt, calldatas, descriptionHash);
    await tx.wait();
    console.log('Proposal executed');
  }

  /**
   * Get all proposals (fetches proposal count and retrieves each)
   * Note: In production, this should use an indexer for better performance
   */
  async getAllProposals(limit: number = 50): Promise<ProposalInfo[]> {
    if (!this.daoContract || !this.provider) {
      throw new Error('DAO contract not initialized.');
    }

    try {
      const proposalCount = await this.daoContract.proposalCount();
      const count = Number(proposalCount);
      const startIndex = Math.max(1, count - limit + 1);
      
      const proposals: ProposalInfo[] = [];
      
      // Fetch proposals in reverse order (newest first)
      for (let i = count; i >= startIndex && i > 0; i--) {
        try {
          const proposalId = BigInt(i);
          const proposal = await this.getProposalInfo(proposalId);
          proposals.push(proposal);
        } catch (err) {
          console.warn(`Failed to fetch proposal ${i}:`, err);
          // Continue with other proposals
        }
      }
      
      return proposals;
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
      throw err;
    }
  }

  /**
   * Get proposal information by ID
   */
  async getProposalInfo(proposalId: bigint): Promise<ProposalInfo> {
    if (!this.daoContract || !this.provider) {
      throw new Error('DAO contract not initialized.');
    }

    try {
      // Note: This requires the contract to have a proposal() view function
      // For now, we'll use events or a simplified approach
      // In production, use an indexer that listens to ProposalCreated events
      
      const state = await this.getProposalState(proposalId);
      const currentBlock = await this.provider.getBlockNumber();
      
      // Fetch proposal created event from logs
      const filter = this.daoContract.filters.ProposalCreated(proposalId);
      const logs = await this.daoContract.queryFilter(filter);
      
      if (logs.length === 0) {
        throw new Error(`Proposal ${proposalId.toString()} not found`);
      }

      const log = logs[0];
      const parsed = this.daoContract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      
      if (!parsed || !parsed.args) {
        throw new Error('Failed to parse proposal event');
      }

      // Get voting power breakdown
      let votesFor = BigInt(0);
      let votesAgainst = BigInt(0);
      let votesAbstain = BigInt(0);
      
      try {
        // Try to get vote counts (requires contract to support these functions)
        // For now, we'll set defaults
      } catch (err) {
        console.warn('Could not fetch vote counts:', err);
      }

      const quorum = await this.getQuorum(BigInt(currentBlock));

      // Check if user has voted (if signer is available)
      let hasVoted = false;
      let userVote: 0 | 1 | 2 | undefined;
      if (this.signer) {
        try {
          const address = await this.signer.getAddress();
          const voteFilter = this.daoContract.filters.VoteCast(address, proposalId);
          const voteLogs = await this.daoContract.queryFilter(voteFilter);
          if (voteLogs.length > 0) {
            hasVoted = true;
            const voteLog = voteLogs[0];
            const voteParsed = this.daoContract.interface.parseLog({
              topics: voteLog.topics as string[],
              data: voteLog.data
            });
            if (voteParsed?.args) {
              userVote = Number(voteParsed.args.support) as 0 | 1 | 2;
            }
          }
        } catch (err) {
          console.warn('Could not check user vote:', err);
        }
      }

      // Cast values to array of bigints
      const valuesArg = parsed.args.values as any;
      const valuesArray: bigint[] = Array.isArray(valuesArg) 
        ? valuesArg.map((v: any) => BigInt(v))
        : [];
      
      return {
        proposalId,
        proposer: parsed.args.proposer,
        targets: parsed.args.targets,
        values: valuesArray,
        calldatas: parsed.args.calldatas,
        startBlock: parsed.args.startBlock,
        endBlock: parsed.args.endBlock,
        description: parsed.args.description,
        state,
        votesFor,
        votesAgainst,
        votesAbstain,
        quorum,
        hasVoted,
        userVote
      };
    } catch (err) {
      console.error(`Failed to get proposal ${proposalId.toString()}:`, err);
      throw err;
    }
  }

  /**
   * Get user's voting history
   */
  async getVotingHistory(address?: string, limit: number = 20): Promise<VoteInfo[]> {
    if (!this.daoContract || !this.provider) {
      throw new Error('DAO contract not initialized.');
    }

    if (!address && !this.signer) {
      throw new Error('Address required or wallet must be connected');
    }

    try {
      const targetAddress = address || (await this.signer!.getAddress());
      const filter = this.daoContract.filters.VoteCast(targetAddress);
      const logs = await this.daoContract.queryFilter(filter, -limit);
      
      const votes: VoteInfo[] = [];
      
      for (const log of logs.reverse()) {
        try {
          const parsed = this.daoContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          
          if (parsed && parsed.args) {
            const block = await this.provider.getBlock(log.blockNumber);
            
            votes.push({
              proposalId: parsed.args.proposalId,
              voter: parsed.args.voter,
              support: Number(parsed.args.support) as 0 | 1 | 2,
              weight: parsed.args.weight,
              reason: parsed.args.reason,
              blockNumber: BigInt(log.blockNumber),
              timestamp: block?.timestamp
            });
          }
        } catch (err) {
          console.warn('Failed to parse vote log:', err);
        }
      }
      
      return votes;
    } catch (err) {
      console.error('Failed to get voting history:', err);
      throw err;
    }
  }

  /**
   * Check if user has voted on a proposal
   */
  async hasVoted(proposalId: bigint, address?: string): Promise<boolean> {
    if (!this.daoContract) {
      throw new Error('DAO contract not initialized.');
    }

    if (!address && !this.signer) {
      throw new Error('Address required or wallet must be connected');
    }

    try {
      const targetAddress = address || (await this.signer!.getAddress());
      const filter = this.daoContract.filters.VoteCast(targetAddress, proposalId);
      const logs = await this.daoContract.queryFilter(filter);
      return logs.length > 0;
    } catch (err) {
      console.error('Failed to check vote:', err);
      return false;
    }
  }

  /**
   * Get proposal votes summary (requires contract support or indexer)
   */
  async getProposalVotes(proposalId: bigint): Promise<ProposalVotes> {
    if (!this.daoContract || !this.provider) {
      throw new Error('DAO contract not initialized.');
    }

    try {
      // Fetch all VoteCast events for this proposal
      const filter = this.daoContract.filters.VoteCast(null, proposalId);
      const logs = await this.daoContract.queryFilter(filter);
      
      let votesFor = BigInt(0);
      let votesAgainst = BigInt(0);
      let votesAbstain = BigInt(0);
      
      for (const log of logs) {
        try {
          const parsed = this.daoContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          
          if (parsed && parsed.args) {
            const support = Number(parsed.args.support);
            const weight = parsed.args.weight;
            
            if (support === 1) {
              votesFor += weight;
            } else if (support === 0) {
              votesAgainst += weight;
            } else if (support === 2) {
              votesAbstain += weight;
            }
          }
        } catch (err) {
          console.warn('Failed to parse vote:', err);
        }
      }
      
      const currentBlock = await this.provider.getBlockNumber();
      const quorum = await this.getQuorum(BigInt(currentBlock));
      
      return {
        for: votesFor,
        against: votesAgainst,
        abstain: votesAbstain,
        quorum
      };
    } catch (err) {
      console.error('Failed to get proposal votes:', err);
      throw err;
    }
  }
}


