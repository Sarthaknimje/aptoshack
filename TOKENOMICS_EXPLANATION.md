# Tokenomics Explanation

## How Tokens Work

1. **Token Creation (Initialize)**
   - When a creator tokenizes their content, the contract's `initialize` function is called
   - This creates a `TokenData` resource at the **creator's address**
   - The token starts with:
     - `current_supply = 0` (no tokens exist yet)
     - `apt_reserve = 0` (no APT in the bonding curve)
     - `total_supply = 1,000,000` (maximum tokens that can ever exist)
     - Price = $0 (since reserve = 0 and supply = 0)

2. **Token Distribution**
   - **NO tokens are pre-minted to the creator**
   - Tokens are minted **on-demand** when someone buys them
   - The creator doesn't hold any tokens initially
   - Tokens go directly to buyers when they purchase

3. **Buying Tokens**
   - When you buy tokens, you call `buy_tokens(creator_address, apt_payment, min_tokens_received)`
   - The contract:
     1. Calculates how many tokens you get based on the bonding curve
     2. Mints those tokens to your address
     3. Transfers your APT to the creator's address (this becomes the reserve)
     4. Updates `current_supply` and `apt_reserve`

4. **Bonding Curve**
   - First buy: Price = 0.00001 APT per token (base price)
   - Subsequent buys: Price = reserve / supply
   - As more people buy, the price increases

## Why E_INSUFFICIENT_BALANCE Error?

This error occurs when:
```
new_supply > total_supply
```

Where:
- `new_supply = current_supply + tokens_received`
- `total_supply = maximum tokens allowed (1,000,000)`

**Possible causes:**
1. The token's `total_supply` in the contract is actually 0 or very small
2. The contract wasn't properly initialized
3. There's a mismatch between what we read and what's actually in the contract

## How to Verify Token State

Check the contract state using these view functions:
- `get_current_supply(creator_address)` - How many tokens exist
- `get_total_supply(creator_address)` - Maximum tokens allowed
- `get_apt_reserve(creator_address)` - APT in the bonding curve

## Solution

If you're getting `E_INSUFFICIENT_BALANCE`:
1. Verify the token was properly initialized (total_supply > 0)
2. Check that current_supply < total_supply
3. Ensure the creator address is correct
4. Try reducing the purchase amount

