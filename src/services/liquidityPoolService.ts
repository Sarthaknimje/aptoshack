/**
 * Liquidity Pool Service
 * Implements AMM (Automated Market Maker) functionality
 * Uses constant product formula: x * y = k
 */

export interface LiquidityPool {
  tokenReserve: number // Token reserve in pool
  algoReserve: number // APTOS reserve in pool
  totalLiquidity: number // Total liquidity tokens
  k: number // Constant product (tokenReserve * algoReserve)
}

export interface LiquidityPosition {
  liquidityTokens: number // User's share of liquidity
  tokenAmount: number // User's token contribution
  algoAmount: number // User's APTOS contribution
  share: number // Percentage of pool owned
}

export class LiquidityPoolService {
  /**
   * Initialize a new liquidity pool
   */
  static initialize(
    tokenAmount: number,
    algoAmount: number
  ): LiquidityPool {
    const k = tokenAmount * algoAmount
    const totalLiquidity = Math.sqrt(k) // Initial liquidity tokens

    return {
      tokenReserve: tokenAmount,
      algoReserve: algoAmount,
      totalLiquidity,
      k
    }
  }

  /**
   * Add liquidity to the pool
   */
  static addLiquidity(
    pool: LiquidityPool,
    tokenAmount: number,
    algoAmount: number
  ): { liquidityTokens: number; newPool: LiquidityPool } {
    // Calculate liquidity tokens to mint
    // Based on share of reserves
    const tokenShare = tokenAmount / pool.tokenReserve
    const algoShare = algoAmount / pool.algoReserve
    const share = Math.min(tokenShare, algoShare) // Use minimum to maintain ratio

    const liquidityTokens = pool.totalLiquidity * share

    // Update pool
    const newPool: LiquidityPool = {
      tokenReserve: pool.tokenReserve + tokenAmount,
      algoReserve: pool.algoReserve + algoAmount,
      totalLiquidity: pool.totalLiquidity + liquidityTokens,
      k: (pool.tokenReserve + tokenAmount) * (pool.algoReserve + algoAmount)
    }

    return {
      liquidityTokens,
      newPool
    }
  }

  /**
   * Remove liquidity from the pool
   */
  static removeLiquidity(
    pool: LiquidityPool,
    liquidityTokens: number
  ): { tokenAmount: number; algoAmount: number; newPool: LiquidityPool } {
    // Calculate share
    const share = liquidityTokens / pool.totalLiquidity

    // Calculate amounts to return
    const tokenAmount = pool.tokenReserve * share
    const algoAmount = pool.algoReserve * share

    // Update pool
    const newPool: LiquidityPool = {
      tokenReserve: pool.tokenReserve - tokenAmount,
      algoReserve: pool.algoReserve - algoAmount,
      totalLiquidity: pool.totalLiquidity - liquidityTokens,
      k: (pool.tokenReserve - tokenAmount) * (pool.algoReserve - algoAmount)
    }

    return {
      tokenAmount,
      algoAmount,
      newPool
    }
  }

  /**
   * Swap tokens for APTOS (sell tokens)
   */
  static swapTokensForAlgo(
    pool: LiquidityPool,
    tokenAmount: number,
    slippageTolerance: number = 0.01 // 1% slippage
  ): { algoAmount: number; priceImpact: number; newPool: LiquidityPool } {
    // Calculate APTOS output using constant product formula
    // k = x * y (must remain constant)
    // New algo reserve = k / (token reserve + token amount)
    const newTokenReserve = pool.tokenReserve + tokenAmount
    const newAlgoReserve = pool.k / newTokenReserve
    const algoAmount = pool.algoReserve - newAlgoReserve

    // Apply slippage protection
    const minAlgoAmount = algoAmount * (1 - slippageTolerance)

    // Calculate price impact
    const currentPrice = pool.algoReserve / pool.tokenReserve
    const newPrice = newAlgoReserve / newTokenReserve
    const priceImpact = ((currentPrice - newPrice) / currentPrice) * 100

    // Update pool
    const newPool: LiquidityPool = {
      tokenReserve: newTokenReserve,
      algoReserve: newAlgoReserve,
      totalLiquidity: pool.totalLiquidity,
      k: pool.k // k remains constant
    }

    return {
      algoAmount: minAlgoAmount, // Return minimum to account for slippage
      priceImpact,
      newPool
    }
  }

  /**
   * Swap APTOS for tokens (buy tokens)
   */
  static swapAlgoForTokens(
    pool: LiquidityPool,
    algoAmount: number,
    slippageTolerance: number = 0.01 // 1% slippage
  ): { tokenAmount: number; priceImpact: number; newPool: LiquidityPool } {
    // Calculate token output using constant product formula
    const newAlgoReserve = pool.algoReserve + algoAmount
    const newTokenReserve = pool.k / newAlgoReserve
    const tokenAmount = pool.tokenReserve - newTokenReserve

    // Apply slippage protection
    const minTokenAmount = tokenAmount * (1 - slippageTolerance)

    // Calculate price impact
    const currentPrice = pool.algoReserve / pool.tokenReserve
    const newPrice = newAlgoReserve / newTokenReserve
    const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100

    // Update pool
    const newPool: LiquidityPool = {
      tokenReserve: newTokenReserve,
      algoReserve: newAlgoReserve,
      totalLiquidity: pool.totalLiquidity,
      k: pool.k // k remains constant
    }

    return {
      tokenAmount: minTokenAmount, // Return minimum to account for slippage
      priceImpact,
      newPool
    }
  }

  /**
   * Get current price from pool
   */
  static getCurrentPrice(pool: LiquidityPool): number {
    return pool.algoReserve / pool.tokenReserve
  }

  /**
   * Calculate user's liquidity position
   */
  static calculatePosition(
    pool: LiquidityPool,
    userLiquidityTokens: number
  ): LiquidityPosition {
    const share = userLiquidityTokens / pool.totalLiquidity
    const tokenAmount = pool.tokenReserve * share
    const algoAmount = pool.algoReserve * share

    return {
      liquidityTokens: userLiquidityTokens,
      tokenAmount,
      algoAmount,
      share: share * 100 // Percentage
    }
  }

  /**
   * Calculate optimal liquidity amounts to maintain ratio
   */
  static calculateOptimalLiquidity(
    pool: LiquidityPool,
    tokenAmount: number
  ): { algoAmount: number; ratio: number } {
    // Maintain current ratio
    const ratio = pool.algoReserve / pool.tokenReserve
    const algoAmount = tokenAmount * ratio

    return {
      algoAmount,
      ratio
    }
  }

  /**
   * Estimate swap output with price impact
   */
  static estimateSwap(
    pool: LiquidityPool,
    inputAmount: number,
    isBuying: boolean // true = buying tokens with APTOS, false = selling tokens for APTOS
  ): {
    outputAmount: number
    priceImpact: number
    newPrice: number
  } {
    if (isBuying) {
      const result = this.swapAlgoForTokens(pool, inputAmount, 0) // No slippage for estimation
      return {
        outputAmount: result.tokenAmount,
        priceImpact: result.priceImpact,
        newPrice: this.getCurrentPrice(result.newPool)
      }
    } else {
      const result = this.swapTokensForAlgo(pool, inputAmount, 0) // No slippage for estimation
      return {
        outputAmount: result.algoAmount,
        priceImpact: result.priceImpact,
        newPrice: this.getCurrentPrice(result.newPool)
      }
    }
  }
}

