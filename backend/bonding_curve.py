"""
Bonding Curve Implementation for Backend
Similar to pump.fun mechanism - realistic pricing for creator tokens
"""

import json
from typing import Dict, Any

class BondingCurve:
    """
    Bonding curve pricing mechanism
    
    Uses constant product formula: k = token_reserve * algo_reserve
    Similar to pump.fun but optimized for creator tokens on Algorand.
    
    Key concepts:
    - Virtual liquidity: Initial reserves that exist virtually to set starting price
    - Constant product: k = x * y (price increases as tokens are bought)
    - Price impact: Larger trades have more impact on price
    """
    
    def __init__(self, initial_price: float = 0.00001, initial_supply: int = 1000000, 
                 virtual_algo: float = None, curve_steepness: float = 0.5):
        """
        Initialize bonding curve with realistic pump.fun-style parameters
        
        Args:
            initial_price: Starting price in APTOS per token (default: 0.00001 APTOS = very accessible entry)
            initial_supply: Total token supply available for trading
            virtual_algo: Virtual APTOS reserve (if None, calculated from initial_price)
            curve_steepness: How quickly price increases (0.5 = gradual curve like pump.fun)
        
        Realistic Bonding Curve Mechanics:
        - Uses constant product formula: k = token_reserve * algo_reserve
        - Price = algo_reserve / token_reserve
        - As tokens are bought, token_reserve decreases, price increases
        - As tokens are sold, token_reserve increases, price decreases
        - This creates natural price discovery through supply/demand
        """
        self.initial_price = initial_price
        self.initial_supply = initial_supply
        self.curve_steepness = curve_steepness
        
        # Virtual reserves determine the bonding curve shape
        # Higher virtual reserves = flatter curve (less price impact per trade)
        # Lower virtual reserves = steeper curve (more price impact per trade)
        # pump.fun uses a moderate curve that allows early buyers to profit significantly
        self.virtual_token_reserve = initial_supply
        
        # Calculate virtual APTOS reserve based on initial price
        # Formula: price = algo_reserve / token_reserve
        # So: algo_reserve = price * token_reserve
        if virtual_algo is not None:
            self.virtual_algo_reserve = virtual_algo
        else:
            # Default: set virtual APTOS to create desired initial price
            # Using curve_steepness to control the slope
            # Lower steepness = more virtual APTOS = flatter curve
            self.virtual_algo_reserve = initial_price * initial_supply * (1 + curve_steepness)
        
        # Constant product k - this never changes
        self.k = self.virtual_token_reserve * self.virtual_algo_reserve
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            'initial_price': self.initial_price,
            'initial_supply': getattr(self, 'initial_supply', self.virtual_token_reserve),
            'virtual_token_reserve': self.virtual_token_reserve,
            'virtual_algo_reserve': self.virtual_algo_reserve,
            'k': self.k,
            'curve_steepness': getattr(self, 'curve_steepness', 1.0)
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BondingCurve':
        """Create from dictionary"""
        curve = cls.__new__(cls)
        curve.initial_price = data.get('initial_price', 0.0001)
        curve.initial_supply = data.get('initial_supply', data.get('virtual_token_reserve', 1000000))
        curve.virtual_token_reserve = data.get('virtual_token_reserve', curve.initial_supply)
        curve.virtual_algo_reserve = data.get('virtual_algo_reserve', curve.initial_price * curve.virtual_token_reserve)
        curve.k = data.get('k', curve.virtual_token_reserve * curve.virtual_algo_reserve)
        curve.curve_steepness = data.get('curve_steepness', 1.0)
        return curve
    
    def calculate_buy_price(self, current_supply: float, current_algo_reserve: float, token_amount: float) -> Dict[str, float]:
        """
        Calculate price for buying tokens
        
        Args:
            current_supply: Tokens currently in circulation
            current_algo_reserve: APTOS currently in the reserve
            token_amount: Number of tokens to buy
        
        Returns:
            dict with 'algo_cost', 'new_price', 'new_supply', 'new_algo_reserve'
        """
        # Current virtual reserves (available tokens and APTOS in the curve)
        current_token_reserve = self.virtual_token_reserve - current_supply
        current_algo_reserve_total = self.virtual_algo_reserve + current_algo_reserve
        
        # Ensure we have tokens available
        if current_token_reserve <= 0:
            raise ValueError("No tokens available in bonding curve")
        
        # After buying tokens, calculate new APTOS reserve using constant product formula
        new_token_reserve = current_token_reserve - token_amount
        
        if new_token_reserve <= 0:
            raise ValueError(f"Cannot buy {token_amount} tokens. Only {current_token_reserve} available.")
        
        # Maintain constant product: k = token_reserve * algo_reserve
        new_algo_reserve_total = self.k / new_token_reserve
        
        # APTOS cost is the difference
        algo_cost = new_algo_reserve_total - current_algo_reserve_total
        
        # New price (APTOS per token)
        new_price = new_algo_reserve_total / new_token_reserve if new_token_reserve > 0 else self.initial_price
        
        return {
            'algo_cost': algo_cost,
            'new_price': new_price,
            'new_supply': current_supply + token_amount,
            'new_algo_reserve': current_algo_reserve + algo_cost
        }
    
    def calculate_sell_price(self, current_supply: float, current_algo_reserve: float, token_amount: float) -> Dict[str, float]:
        """
        Calculate price for selling tokens
        
        Args:
            current_supply: Tokens currently in circulation
            current_algo_reserve: APTOS currently in the reserve
            token_amount: Number of tokens to sell
        
        Returns:
            dict with 'algo_received', 'new_price', 'new_supply', 'new_algo_reserve'
        """
        # Current virtual reserves (available tokens and APTOS in the curve)
        current_token_reserve = self.virtual_token_reserve - current_supply
        current_algo_reserve_total = self.virtual_algo_reserve + current_algo_reserve
        
        # Ensure we have tokens to sell
        if current_supply < token_amount:
            raise ValueError(f"Cannot sell {token_amount} tokens. Only {current_supply} in circulation.")
        
        # After selling tokens, calculate new APTOS reserve using constant product formula
        new_token_reserve = current_token_reserve + token_amount
        
        # Maintain constant product: k = token_reserve * algo_reserve
        new_algo_reserve_total = self.k / new_token_reserve
        
        # APTOS received is the difference
        algo_received = current_algo_reserve_total - new_algo_reserve_total
        
        # New price (APTOS per token)
        new_price = new_algo_reserve_total / new_token_reserve if new_token_reserve > 0 else self.initial_price
        
        return {
            'algo_received': algo_received,
            'new_price': new_price,
            'new_supply': current_supply - token_amount,
            'new_algo_reserve': current_algo_reserve - algo_received
        }
    
    def get_current_price(self, current_supply: float, current_algo_reserve: float) -> float:
        """Get current price from state"""
        current_token_reserve = self.virtual_token_reserve - current_supply
        current_algo_reserve_total = self.virtual_algo_reserve + current_algo_reserve
        return current_algo_reserve_total / current_token_reserve if current_token_reserve > 0 else self.initial_price


class BondingCurveState:
    """Current state of bonding curve"""
    
    def __init__(self, token_supply: float = 0, algo_reserve: float = 0):
        self.token_supply = token_supply
        self.algo_reserve = algo_reserve
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'token_supply': self.token_supply,
            'algo_reserve': self.algo_reserve
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BondingCurveState':
        """Create from dictionary"""
        return cls(
            token_supply=data.get('token_supply', 0),
            algo_reserve=data.get('algo_reserve', 0)
        )

