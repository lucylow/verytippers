/**
 * Relayer Gas Accounting System
 * Tracks gas sponsorship budget and usage
 */

const STORAGE_KEY = 'verytippers_gas_budget';
const DEFAULT_BUDGET_USD = 25.0;

interface GasBudget {
  totalBudgetUSD: number;
  usedUSD: number;
  remainingUSD: number;
  transactionsCount: number;
  lastReset: number; // Timestamp
}

/**
 * Gets current gas budget state
 */
export function getGasBudget(): GasBudget {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        totalBudgetUSD: parsed.totalBudgetUSD || DEFAULT_BUDGET_USD,
        usedUSD: parsed.usedUSD || 0,
        remainingUSD: (parsed.totalBudgetUSD || DEFAULT_BUDGET_USD) - (parsed.usedUSD || 0),
        transactionsCount: parsed.transactionsCount || 0,
        lastReset: parsed.lastReset || Date.now()
      };
    }
  } catch (error) {
    console.warn('Failed to load gas budget from storage:', error);
  }

  // Default budget
  return {
    totalBudgetUSD: DEFAULT_BUDGET_USD,
    usedUSD: 0,
    remainingUSD: DEFAULT_BUDGET_USD,
    transactionsCount: 0,
    lastReset: Date.now()
  };
}

/**
 * Charges gas cost (in USD) from the budget
 */
export function chargeGas(costUSD: number): { success: boolean; remaining: number; error?: string } {
  if (costUSD <= 0) {
    return { success: false, error: 'Invalid gas cost', remaining: getGasBudget().remainingUSD };
  }

  const budget = getGasBudget();

  if (budget.remainingUSD < costUSD) {
    return {
      success: false,
      error: 'Insufficient gas budget',
      remaining: budget.remainingUSD
    };
  }

  const updated = {
    ...budget,
    usedUSD: budget.usedUSD + costUSD,
    remainingUSD: budget.remainingUSD - costUSD,
    transactionsCount: budget.transactionsCount + 1
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return {
      success: true,
      remaining: updated.remainingUSD
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save gas budget',
      remaining: budget.remainingUSD
    };
  }
}

/**
 * Estimates gas cost in USD based on gas price and gas limit
 */
export function estimateGasCostUSD(
  gasLimit: bigint,
  gasPrice: bigint,
  veryPriceUSD: number = 0.01 // Default VERY price in USD (update with real price)
): number {
  const totalGas = gasLimit * gasPrice;
  const totalVery = Number(totalGas) / 1e18; // Convert from wei
  return totalVery * veryPriceUSD;
}

/**
 * Resets gas budget (for testing or daily reset)
 */
export function resetGasBudget(newBudgetUSD: number = DEFAULT_BUDGET_USD): void {
  const budget: GasBudget = {
    totalBudgetUSD: newBudgetUSD,
    usedUSD: 0,
    remainingUSD: newBudgetUSD,
    transactionsCount: 0,
    lastReset: Date.now()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  } catch (error) {
    console.error('Failed to reset gas budget:', error);
  }
}

/**
 * Adds more budget (for admin or promotional purposes)
 */
export function addGasBudget(amountUSD: number): { success: boolean; newTotal: number; error?: string } {
  if (amountUSD <= 0) {
    return { success: false, error: 'Invalid amount', newTotal: getGasBudget().totalBudgetUSD };
  }

  const budget = getGasBudget();
  const updated = {
    ...budget,
    totalBudgetUSD: budget.totalBudgetUSD + amountUSD,
    remainingUSD: budget.remainingUSD + amountUSD
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return {
      success: true,
      newTotal: updated.totalBudgetUSD
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to add gas budget',
      newTotal: budget.totalBudgetUSD
    };
  }
}

/**
 * Gets formatted budget string for display
 */
export function getFormattedBudget(): string {
  const budget = getGasBudget();
  return `$${budget.remainingUSD.toFixed(2)} / $${budget.totalBudgetUSD.toFixed(2)}`;
}

/**
 * Checks if there's enough budget for a transaction
 */
export function hasEnoughBudget(estimatedCostUSD: number): boolean {
  const budget = getGasBudget();
  return budget.remainingUSD >= estimatedCostUSD;
}

/**
 * Gets budget statistics
 */
export function getBudgetStats() {
  const budget = getGasBudget();
  const usagePercent = (budget.usedUSD / budget.totalBudgetUSD) * 100;

  return {
    ...budget,
    usagePercent: usagePercent.toFixed(2),
    formattedRemaining: `$${budget.remainingUSD.toFixed(2)}`,
    formattedUsed: `$${budget.usedUSD.toFixed(2)}`,
    formattedTotal: `$${budget.totalBudgetUSD.toFixed(2)}`
  };
}

