// @ts-nocheck
/**
 * Enhanced Bot Command Handler
 * Provides automated command parsing, validation, and routing
 */

import { VerychatApiService } from '../verychat/VerychatApi.service';
import { TippingService } from '../Tipping.service';
import { UserRepository } from '../../repositories/User.repository';
import { LeaderboardService } from '../Leaderboard.service';

export interface CommandContext {
  userId: string;
  chatId: string;
  username?: string;
  args?: string;
  messageId?: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  handler: (context: CommandContext) => Promise<CommandResult>;
  minArgs?: number;
  maxArgs?: number;
  requiresWallet?: boolean;
  requiresKYC?: boolean;
}

export class CommandHandlerService {
  private commands: Map<string, CommandDefinition> = new Map();
  private verychat: VerychatApiService;
  private tippingService: TippingService;
  private userRepo: UserRepository;
  private leaderboardService: LeaderboardService;

  constructor() {
    this.verychat = new VerychatApiService();
    this.tippingService = new TippingService();
    this.userRepo = new UserRepository();
    this.leaderboardService = new LeaderboardService();
    this.registerDefaultCommands();
  }

  /**
   * Register a command
   */
  registerCommand(command: CommandDefinition): void {
    this.commands.set(command.name.toLowerCase(), command);
    
    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commands.set(alias.toLowerCase(), command);
      });
    }
  }

  /**
   * Parse and execute a command
   */
  async handleCommand(
    commandText: string,
    context: CommandContext
  ): Promise<CommandResult> {
    try {
      // Parse command
      const parsed = this.parseCommand(commandText);
      if (!parsed) {
        return {
          success: false,
          message: 'Invalid command format. Use /help for available commands.',
        };
      }

      const { command, args } = parsed;

      // Find command definition
      const cmdDef = this.commands.get(command.toLowerCase());
      if (!cmdDef) {
        return {
          success: false,
          message: `Unknown command "${command}". Use /help for available commands.`,
        };
      }

      // Validate arguments
      const argList = args ? args.trim().split(/\s+/) : [];
      const validation = this.validateArgs(argList, cmdDef);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid arguments. ${cmdDef.usage}\n${validation.error}`,
        };
      }

      // Check prerequisites
      const prerequisiteCheck = await this.checkPrerequisites(context, cmdDef);
      if (!prerequisiteCheck.allowed) {
        return {
          success: false,
          message: prerequisiteCheck.reason || 'Command not available',
        };
      }

      // Execute command
      const result = await cmdDef.handler({
        ...context,
        args: args || undefined,
      });

      return result;
    } catch (error: any) {
      const { logger } = require('../../utils/logger');
      logger.error('Command execution error', { error, command, args });
      return {
        success: false,
        message: 'An error occurred while processing your command.',
        error: error.message,
      };
    }
  }

  /**
   * Parse command text
   */
  private parseCommand(text: string): { command: string; args?: string } | null {
    // Match /command or /command args
    const match = text.match(/^\/(\w+)(?:\s+(.*))?$/);
    if (!match) {
      return null;
    }

    return {
      command: match[1],
      args: match[2],
    };
  }

  /**
   * Validate command arguments
   */
  private validateArgs(
    args: string[],
    cmdDef: CommandDefinition
  ): { valid: boolean; error?: string } {
    const argCount = args.length;

    if (cmdDef.minArgs !== undefined && argCount < cmdDef.minArgs) {
      return {
        valid: false,
        error: `Command requires at least ${cmdDef.minArgs} argument(s)`,
      };
    }

    if (cmdDef.maxArgs !== undefined && argCount > cmdDef.maxArgs) {
      return {
        valid: false,
        error: `Command accepts at most ${cmdDef.maxArgs} argument(s)`,
      };
    }

    return { valid: true };
  }

  /**
   * Check prerequisites (wallet, KYC, etc.)
   */
  private async checkPrerequisites(
    context: CommandContext,
    cmdDef: CommandDefinition
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (cmdDef.requiresWallet) {
      const user = await this.userRepo.findByVerychatId(context.userId);
      if (!user || !user.walletAddress) {
        return {
          allowed: false,
          reason:
            'This command requires a linked wallet. Please connect your wallet first.',
        };
      }
    }

    if (cmdDef.requiresKYC) {
      const kycStatus = await this.verychat.verifyKYC(context.userId);
      if (!kycStatus.isVerified) {
        return {
          allowed: false,
          reason:
            'This command requires KYC verification. Please complete KYC first.',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Tip command
    this.registerCommand({
      name: 'tip',
      aliases: ['send', 'give'],
      description: 'Tip another user',
      usage: '/tip @username amount [message]',
      minArgs: 2,
      maxArgs: 3,
      requiresWallet: true,
      handler: async (context) => {
        const args = context.args?.split(/\s+/) || [];
        const recipient = args[0]?.replace('@', '');
        const amount = parseFloat(args[1]);
        const message = args.slice(2).join(' ') || undefined;

        if (!recipient || !amount || isNaN(amount) || amount <= 0) {
          return {
            success: false,
            message:
              'Invalid format. Usage: /tip @username amount [message]\nExample: /tip @alice 5 GREAT JOB!',
          };
        }

        const result = await this.tippingService.processTip({
          senderId: context.userId,
          recipientUsername: recipient,
          amount,
          token: 'VERY',
          message,
          chatId: context.chatId,
        });

        return {
          success: result.success,
          message: result.message || result.error || 'Tip processed',
          data: result,
        };
      },
    });

    // Stats command
    this.registerCommand({
      name: 'stats',
      aliases: ['stat', 'me'],
      description: 'View your tipping statistics',
      usage: '/stats',
      handler: async (context) => {
        const user = await this.userRepo.findByVerychatId(context.userId);
        if (!user) {
          return {
            success: false,
            message: 'User not found. Please register first.',
          };
        }

        const stats = {
          tipsSent: user.totalTipsSent?.toString() || '0',
          tipsReceived: user.totalTipsReceived?.toString() || '0',
          tipStreak: user.tipStreak || 0,
          uniqueUsersTipped: user.uniqueUsersTipped || 0,
        };

        return {
          success: true,
          message: `📊 *Your Stats*\n\n` +
            `💰 Tips Sent: ${stats.tipsSent} VERY\n` +
            `🎉 Tips Received: ${stats.tipsReceived} VERY\n` +
            `🔥 Tip Streak: ${stats.tipStreak} days\n` +
            `👥 Unique Users Tipped: ${stats.uniqueUsersTipped}`,
          data: stats,
        };
      },
    });

    // Leaderboard command
    this.registerCommand({
      name: 'leaderboard',
      aliases: ['lb', 'top', 'rankings'],
      description: 'View top tippers',
      usage: '/leaderboard [daily|weekly|monthly]',
      handler: async (context) => {
        const period = context.args?.trim() || 'daily';
        const validPeriods = ['daily', 'weekly', 'monthly'];
        
        if (!validPeriods.includes(period.toLowerCase())) {
          return {
            success: false,
            message: `Invalid period. Use one of: ${validPeriods.join(', ')}`,
          };
        }

        const entries = await this.leaderboardService.getLeaderboard(
          period,
          'tips_sent',
          10
        );

        if (entries.length === 0) {
          return {
            success: true,
            message: `📈 *${period.toUpperCase()} Leaderboard*\n\nNo data available yet.`,
          };
        }

        const leaderboardText = entries
          .map(
            (entry, index) =>
              `${this.getRankEmoji(entry.rank)} ${entry.username}: ${entry.score} VERY`
          )
          .join('\n');

        return {
          success: true,
          message: `📈 *${period.toUpperCase()} Leaderboard*\n\n${leaderboardText}`,
          data: entries,
        };
      },
    });

    // Help command
    this.registerCommand({
      name: 'help',
      aliases: ['h', 'commands'],
      description: 'Show available commands',
      usage: '/help [command]',
      handler: async (context) => {
        const commandName = context.args?.trim().toLowerCase();

        if (commandName) {
          // Show specific command help
          const cmdDef = this.commands.get(commandName);
          if (!cmdDef) {
            return {
              success: false,
              message: `Command "${commandName}" not found. Use /help for all commands.`,
            };
          }

          return {
            success: true,
            message: `*${cmdDef.name}*\n\n` +
              `${cmdDef.description}\n\n` +
              `Usage: \`${cmdDef.usage}\``,
            data: cmdDef,
          };
        }

        // Show all commands
        const commandList = Array.from(this.commands.values())
          .filter((cmd, index, self) => 
            self.findIndex(c => c.name === cmd.name) === index
          )
          .map(cmd => `\`${cmd.usage}\` - ${cmd.description}`)
          .join('\n');

        return {
          success: true,
          message: `*Available Commands*\n\n${commandList}\n\nUse /help <command> for detailed information.`,
        };
      },
    });
  }

  private getRankEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  }

  /**
   * Get all registered commands
   */
  getCommands(): CommandDefinition[] {
    return Array.from(
      new Set(Array.from(this.commands.values()).map(cmd => cmd.name))
    ).map(name => {
      const cmd = Array.from(this.commands.values()).find(c => c.name === name);
      return cmd!;
    });
  }
}

