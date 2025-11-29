/**
 * Trading Service - Real trading with bonding curves
 */

const BACKEND_URL = 'http://localhost:5001'

export interface TradeEstimate {
  algo_cost?: number
  algo_received?: number
  new_price: number
  price_impact: number
}

export interface TradeResult {
  success: boolean
  algo_cost?: number
  algo_received?: number
  token_amount: number
  new_price: number
  price_impact: number
  transaction_id?: string
  error?: string
}

export class TradingService {
  /**
   * Estimate buy trade using bonding curve
   */
  static async estimateBuy(
    asaId: number,
    tokenAmount: number
  ): Promise<TradeEstimate> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/bonding-curve/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asa_id: asaId,
          token_amount: tokenAmount,
          trade_type: 'buy'
        })
      })

      const result = await response.json()
      if (result.success) {
        return {
          algo_cost: result.algo_cost,
          new_price: result.new_price,
          price_impact: result.price_impact
        }
      }
      throw new Error(result.error || 'Estimate failed')
    } catch (error: any) {
      console.error('Error estimating buy:', error)
      throw error
    }
  }

  /**
   * Estimate sell trade using bonding curve
   */
  static async estimateSell(
    asaId: number,
    tokenAmount: number
  ): Promise<TradeEstimate> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/bonding-curve/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asa_id: asaId,
          token_amount: tokenAmount,
          trade_type: 'sell'
        })
      })

      const result = await response.json()
      if (result.success) {
        return {
          algo_received: result.algo_received,
          new_price: result.new_price,
          price_impact: result.price_impact
        }
      }
      throw new Error(result.error || 'Estimate failed')
    } catch (error: any) {
      console.error('Error estimating sell:', error)
      throw error
    }
  }

  /**
   * Execute buy trade using bonding curve
   */
  static async executeBuy(
    asaId: number,
    tokenAmount: number,
    traderAddress: string,
    transactionId: string
  ): Promise<TradeResult> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/bonding-curve/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asa_id: asaId,
          token_amount: tokenAmount,
          trader_address: traderAddress,
          transaction_id: transactionId
        })
      })

      const result = await response.json()
      if (result.success) {
        return {
          success: true,
          algo_cost: result.algo_cost,
          token_amount: result.token_amount,
          new_price: result.new_price,
          price_impact: result.price_impact
        }
      }
      return {
        success: false,
        error: result.error || 'Buy failed',
        token_amount: tokenAmount,
        new_price: 0,
        price_impact: 0
      }
    } catch (error: any) {
      console.error('Error executing buy:', error)
      return {
        success: false,
        error: error.message || 'Buy failed',
        token_amount: tokenAmount,
        new_price: 0,
        price_impact: 0
      }
    }
  }

  /**
   * Execute sell trade using bonding curve
   */
  static async executeSell(
    asaId: number,
    tokenAmount: number,
    traderAddress: string,
    transactionId: string
  ): Promise<TradeResult> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/bonding-curve/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asa_id: asaId,
          token_amount: tokenAmount,
          trader_address: traderAddress,
          transaction_id: transactionId
        })
      })

      const result = await response.json()
      if (result.success) {
        return {
          success: true,
          algo_received: result.algo_received,
          token_amount: result.token_amount,
          new_price: result.new_price,
          price_impact: result.price_impact
        }
      }
      return {
        success: false,
        error: result.error || 'Sell failed',
        token_amount: tokenAmount,
        new_price: 0,
        price_impact: 0
      }
    } catch (error: any) {
      console.error('Error executing sell:', error)
      return {
        success: false,
        error: error.message || 'Sell failed',
        token_amount: tokenAmount,
        new_price: 0,
        price_impact: 0
      }
    }
  }

  /**
   * Get trade history for a token
   */
  static async getTradeHistory(
    asaId: number,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h',
    limit: number = 100
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/trades/${asaId}?timeframe=${timeframe}&limit=${limit}`
      )
      const result = await response.json()
      if (result.success) {
        return result.trades || []
      }
      return []
    } catch (error) {
      console.error('Error fetching trade history:', error)
      return []
    }
  }

  /**
   * Get token details including bonding curve state
   */
  static async getTokenDetails(asaId: number): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/token/${asaId}`)
      const result = await response.json()
      if (result.success) {
        return result.token
      }
      return null
    } catch (error) {
      console.error('Error fetching token details:', error)
      return null
    }
  }
}

