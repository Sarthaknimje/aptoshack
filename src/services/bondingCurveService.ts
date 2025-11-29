/**
 * Bonding Curve Service
 * Implements a bonding curve pricing mechanism similar to pump.fun
 * Price increases as tokens are bought, decreases as tokens are sold
 */

export interface BondingCurveConfig {
  initialPrice: number // Starting price in APTOS
  virtualTokenReserve: number // Virtual token supply
  virtualAlgoReserve: number // Virtual APTOS reserve
  k: number // Constant product (virtualTokenReserve * virtualAlgoReserve)
}

export interface BondingCurveState {
  tokenSupply: number // Current token supply
  algoReserve: number // Current APTOS in reserve
  currentPrice: number // Current price per token
  marketCap: number // Current market cap
}

export class BondingCurveService {
  /**
   * Initialize bonding curve with starting parameters
   */
  static initialize(
    initialPrice: number = 0.001, // 0.001 APTOS per token
    initialTokenSupply: number = 1000000 // 1M tokens
  ): BondingCurveConfig {
    // Calculate virtual reserves based on initial price
    // Price = virtualAlgoReserve / virtualTokenReserve
    const virtualAlgoReserve = initialPrice * initialTokenSupply
    const virtualTokenReserve = initialTokenSupply
    const k = virtualTokenReserve * virtualAlgoReserve

    return {
      initialPrice,
      virtualTokenReserve,
      virtualAlgoReserve,
      k
    }
  }

  /**
   * Calculate price for buying a specific amount of tokens
   * Uses constant product formula: k = x * y
   * Where x = token reserve, y = algo reserve
   */
  static calculateBuyPrice(
    config: BondingCurveConfig,
    currentState: BondingCurveState,
    tokenAmount: number
  ): { algoCost: number; newPrice: number; newState: BondingCurveState } {
    // Current virtual reserves
    const currentTokenReserve = config.virtualTokenReserve - currentState.tokenSupply
    const currentAlgoReserve = config.virtualAlgoReserve + currentState.algoReserve

    // After buying tokens
    const newTokenReserve = currentTokenReserve - tokenAmount
    const newAlgoReserve = config.k / newTokenReserve

    // APTOS cost = difference in reserves
    const algoCost = newAlgoReserve - currentAlgoReserve

    // New price = newAlgoReserve / newTokenReserve
    const newPrice = newAlgoReserve / newTokenReserve

    // New state
    const newState: BondingCurveState = {
      tokenSupply: currentState.tokenSupply + tokenAmount,
      algoReserve: currentState.algoReserve + algoCost,
      currentPrice: newPrice,
      marketCap: (currentState.tokenSupply + tokenAmount) * newPrice
    }

    return {
      algoCost,
      newPrice,
      newState
    }
  }

  /**
   * Calculate price for selling a specific amount of tokens
   */
  static calculateSellPrice(
    config: BondingCurveConfig,
    currentState: BondingCurveState,
    tokenAmount: number
  ): { algoReceived: number; newPrice: number; newState: BondingCurveState } {
    // Current virtual reserves
    const currentTokenReserve = config.virtualTokenReserve - currentState.tokenSupply
    const currentAlgoReserve = config.virtualAlgoReserve + currentState.algoReserve

    // After selling tokens
    const newTokenReserve = currentTokenReserve + tokenAmount
    const newAlgoReserve = config.k / newTokenReserve

    // APTOS received = difference in reserves
    const algoReceived = currentAlgoReserve - newAlgoReserve

    // New price = newAlgoReserve / newTokenReserve
    const newPrice = newAlgoReserve / newTokenReserve

    // New state
    const newState: BondingCurveState = {
      tokenSupply: currentState.tokenSupply - tokenAmount,
      algoReserve: currentState.algoReserve - algoReceived,
      currentPrice: newPrice,
      marketCap: (currentState.tokenSupply - tokenAmount) * newPrice
    }

    return {
      algoReceived,
      newPrice,
      newState
    }
  }

  /**
   * Calculate how many tokens can be bought with a specific APTOS amount
   */
  static calculateTokensForAlgo(
    config: BondingCurveConfig,
    currentState: BondingCurveState,
    algoAmount: number
  ): { tokenAmount: number; newPrice: number; newState: BondingCurveState } {
    // Current virtual reserves
    const currentTokenReserve = config.virtualTokenReserve - currentState.tokenSupply
    const currentAlgoReserve = config.virtualAlgoReserve + currentState.algoReserve

    // After adding APTOS
    const newAlgoReserve = currentAlgoReserve + algoAmount
    const newTokenReserve = config.k / newAlgoReserve

    // Tokens received = difference in reserves
    const tokenAmount = currentTokenReserve - newTokenReserve

    // New price
    const newPrice = newAlgoReserve / newTokenReserve

    // New state
    const newState: BondingCurveState = {
      tokenSupply: currentState.tokenSupply + tokenAmount,
      algoReserve: currentState.algoReserve + algoAmount,
      currentPrice: newPrice,
      marketCap: (currentState.tokenSupply + tokenAmount) * newPrice
    }

    return {
      tokenAmount,
      newPrice,
      newState
    }
  }

  /**
   * Calculate APTOS received for selling a specific token amount
   */
  static calculateAlgoForTokens(
    config: BondingCurveConfig,
    currentState: BondingCurveState,
    tokenAmount: number
  ): { algoAmount: number; newPrice: number; newState: BondingCurveState } {
    const result = this.calculateSellPrice(config, currentState, tokenAmount)
    return {
      algoAmount: result.algoReceived,
      newPrice: result.newPrice,
      newState: result.newState
    }
  }

  /**
   * Get current price from state
   */
  static getCurrentPrice(state: BondingCurveState): number {
    return state.currentPrice
  }

  /**
   * Get price impact for a trade
   * Price impact = (newPrice - currentPrice) / currentPrice * 100
   */
  static getPriceImpact(
    currentPrice: number,
    newPrice: number
  ): number {
    return ((newPrice - currentPrice) / currentPrice) * 100
  }

  /**
   * Generate price curve data for visualization
   */
  static generatePriceCurve(
    config: BondingCurveConfig,
    maxSupply: number = 1000000,
    steps: number = 100
  ): Array<{ supply: number; price: number; marketCap: number }> {
    const curve: Array<{ supply: number; price: number; marketCap: number }> = []
    const stepSize = maxSupply / steps

    for (let i = 0; i <= steps; i++) {
      const supply = i * stepSize
      const tokenReserve = config.virtualTokenReserve - supply
      const algoReserve = config.k / tokenReserve
      const price = algoReserve / tokenReserve
      const marketCap = supply * price

      curve.push({ supply, price, marketCap })
    }

    return curve
  }

  /**
   * Check if bonding curve should migrate to AMM
   * Typically when market cap reaches a threshold (e.g., $50k)
   */
  static shouldMigrateToAMM(
    state: BondingCurveState,
    migrationThreshold: number = 50000 // $50k in APTOS
  ): boolean {
    return state.marketCap >= migrationThreshold
  }

  /**
   * Calculate liquidity needed for AMM migration
   */
  static calculateLiquidityForMigration(
    state: BondingCurveState,
    liquidityRatio: number = 0.5 // 50% of reserves go to liquidity
  ): { tokenAmount: number; algoAmount: number } {
    return {
      tokenAmount: state.tokenSupply * liquidityRatio,
      algoAmount: state.algoReserve * liquidityRatio
    }
  }
}

