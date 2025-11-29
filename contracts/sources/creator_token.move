module creatorvault::creator_token {
    use aptos_framework::fungible_asset::{Self, Metadata, MintRef, TransferRef, BurnRef};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::string;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use std::signer;
    use std::option;
    use std::error;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_INSUFFICIENT_PAYMENT: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_NOT_CREATOR: u64 = 5;

    /// Struct to store token metadata and refs for each creator
    struct TokenData has key {
        metadata: Object<Metadata>,
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
        creator: address,
        total_supply: u64,
        current_supply: u64,
        apt_reserve: u64,  // APT reserve in the bonding curve (in octas)
    }

    /// Initialize a new creator token (Fungible Asset)
    /// This creates the FA metadata and generates all necessary refs
    entry fun initialize(
        creator: &signer,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
        total_supply: u64,
        icon_uri: vector<u8>,
        project_uri: vector<u8>,
    ) {
        let creator_addr = signer::address_of(creator);
        
        // Check if token already exists
        assert!(!exists<TokenData>(creator_addr), error::already_exists(E_NOT_INITIALIZED));
        
        // Validate inputs
        assert!(total_supply > 0, error::invalid_argument(E_INVALID_AMOUNT));
        assert!(decimals <= 18, error::invalid_argument(E_INVALID_AMOUNT));

        // Create a non-deletable object for the token metadata
        let constructor_ref = &object::create_named_object(creator, symbol);

        // Create the FA metadata with primary store enabled
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::some((total_supply as u128)), // Maximum supply (convert u64 to u128)
            string::utf8(name),
            string::utf8(symbol),
            decimals,
            string::utf8(icon_uri),
            string::utf8(project_uri),
        );

        // Generate all necessary refs
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);

        // Get the metadata object address
        let metadata = object::object_from_constructor_ref<Metadata>(constructor_ref);

        // Store the refs in the creator's account
        // Start with 0 supply and 0 reserve (price = $0)
        move_to(creator, TokenData {
            metadata,
            mint_ref,
            transfer_ref,
            burn_ref,
            creator: creator_addr,
            total_supply,
            current_supply: 0,
            apt_reserve: 0,  // Start with 0 reserve (price = 0)
        });
    }

    /// Mint initial supply to creator
    entry fun mint_initial_supply(
        creator: &signer,
        amount: u64,
    ) acquires TokenData {
        let creator_addr = signer::address_of(creator);
        let token_data = borrow_global_mut<TokenData>(creator_addr);
        
        // Validate amount
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        assert!(token_data.current_supply + amount <= token_data.total_supply, error::invalid_argument(E_INSUFFICIENT_BALANCE));
        
        // Mint the fungible asset
        let fa = fungible_asset::mint(
            &token_data.mint_ref,
            amount,
        );

        // Deposit to creator's primary store
        primary_fungible_store::deposit(creator_addr, fa);
        
        // Update current supply
        token_data.current_supply = token_data.current_supply + amount;
    }

    /// Mint tokens to a recipient (only creator can call)
    entry fun mint(
        creator: &signer,
        recipient: address,
        amount: u64,
    ) acquires TokenData {
        let creator_addr = signer::address_of(creator);
        let token_data = borrow_global_mut<TokenData>(creator_addr);
        
        // Only creator can mint
        assert!(creator_addr == token_data.creator, error::permission_denied(E_NOT_CREATOR));
        
        // Validate amount
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        assert!(token_data.current_supply + amount <= token_data.total_supply, error::invalid_argument(E_INSUFFICIENT_BALANCE));
        
        // Mint the fungible asset
        let fa = fungible_asset::mint(
            &token_data.mint_ref,
            amount,
        );

        // Transfer to recipient (will auto-create primary store if needed)
        primary_fungible_store::deposit(recipient, fa);
        
        // Update current supply
        token_data.current_supply = token_data.current_supply + amount;
    }

    /// Buy tokens with APT (bonding curve pricing)
    /// Uses linear bonding curve: price = reserve / supply
    /// Formula: reserve = supply^2 / (2 * k), where k = 1 for simplicity
    /// When buying: calculate tokens from APT using integration
    entry fun buy_tokens(
        buyer: &signer,
        creator: address,
        apt_payment: u64,  // APT amount to pay (in octas)
        min_tokens_received: u64,  // Minimum tokens expected (slippage protection)
    ) acquires TokenData {
        let buyer_addr = signer::address_of(buyer);
        let token_data = borrow_global_mut<TokenData>(creator);
        
        // Validate payment
        assert!(apt_payment > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        // Calculate tokens using linear bonding curve
        // Formula: reserve = supply^2 / 2
        // Solving for new_supply: new_supply = sqrt(2 * new_reserve)
        let old_reserve = token_data.apt_reserve;
        let old_supply = token_data.current_supply;
        let new_reserve = old_reserve + apt_payment;
        
        // Calculate tokens using simplified bonding curve
        // Price = reserve / supply (when supply > 0)
        // For initial buy (supply = 0): use base price
        let base_price = 1000; // 0.00001 APT per token (1000 octas) - very low starting price
        
        let tokens_received: u64;
        if (old_supply == 0) {
            // First buy: use base price
            tokens_received = apt_payment / base_price;
        } else {
            // Subsequent buys: price = reserve / supply
            let current_price = old_reserve / old_supply;
            // Simplified: tokens = apt_payment / current_price
            tokens_received = apt_payment / current_price;
        };
        
        let new_supply = old_supply + tokens_received;
        
        // Validate we can mint this many tokens
        assert!(tokens_received > 0, error::invalid_argument(E_INVALID_AMOUNT));
        assert!(new_supply <= token_data.total_supply, error::invalid_argument(E_INSUFFICIENT_BALANCE));
        assert!(tokens_received >= min_tokens_received, error::invalid_argument(E_INSUFFICIENT_PAYMENT));
        
        // Transfer APT from buyer to creator (this becomes the reserve)
        let payment = coin::withdraw<AptosCoin>(buyer, apt_payment);
        coin::deposit(creator, payment);
        
        // Mint tokens to buyer
        let fa = fungible_asset::mint(
            &token_data.mint_ref,
            tokens_received,
        );
        primary_fungible_store::deposit(buyer_addr, fa);
        
        // Update state
        token_data.current_supply = new_supply;
        token_data.apt_reserve = new_reserve;
    }
    

    /// Sell tokens for APT (bonding curve pricing)
    /// Uses same bonding curve formula as buy
    /// Note: This requires the creator to also sign to transfer APT back
    entry fun sell_tokens(
        seller: &signer,
        creator_signer: &signer,
        token_amount: u64,
        min_apt_received: u64,
    ) acquires TokenData {
        let seller_addr = signer::address_of(seller);
        let creator_addr = signer::address_of(creator_signer);
        let token_data = borrow_global_mut<TokenData>(creator_addr);
        
        // Validate amount
        assert!(token_amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        // Check seller has enough tokens
        let balance = primary_fungible_store::balance(seller_addr, token_data.metadata);
        assert!(balance >= token_amount, error::invalid_argument(E_INSUFFICIENT_BALANCE));
        
        // Calculate APT received using bonding curve
        let old_supply = token_data.current_supply;
        let old_reserve = token_data.apt_reserve;
        let new_supply = old_supply - token_amount;
        
        // Calculate APT received: price = reserve / supply
        // When selling: apt_received = token_amount * current_price
        let current_price = if (old_supply > 0) old_reserve / old_supply else 0;
        let apt_received = token_amount * current_price;
        let new_reserve = old_reserve - apt_received;
        
        // Validate minimum received
        assert!(apt_received >= min_apt_received, error::invalid_argument(E_INSUFFICIENT_PAYMENT));
        assert!(apt_received <= old_reserve, error::invalid_argument(E_INSUFFICIENT_BALANCE));
        
        // Withdraw tokens from seller
        let fa = primary_fungible_store::withdraw(seller, token_data.metadata, token_amount);
        
        // Burn the tokens
        fungible_asset::burn(&token_data.burn_ref, fa);
        
        // Transfer APT from creator to seller
        let payment = coin::withdraw<AptosCoin>(creator_signer, apt_received);
        coin::deposit(seller_addr, payment);
        
        // Update state
        token_data.current_supply = new_supply;
        token_data.apt_reserve = new_reserve;
    }

    /// Get the metadata object address for a token
    #[view]
    public fun get_metadata_address(creator: address): Object<Metadata> acquires TokenData {
        borrow_global<TokenData>(creator).metadata
    }

    /// Get token balance for an account
    #[view]
    public fun get_balance(creator: address, account: address): u64 acquires TokenData {
        let metadata = borrow_global<TokenData>(creator).metadata;
        primary_fungible_store::balance(account, metadata)
    }

    /// Get current supply
    #[view]
    public fun get_current_supply(creator: address): u64 acquires TokenData {
        borrow_global<TokenData>(creator).current_supply
    }

    /// Get total supply
    #[view]
    public fun get_total_supply(creator: address): u64 acquires TokenData {
        borrow_global<TokenData>(creator).total_supply
    }

    /// Get APT reserve
    #[view]
    public fun get_apt_reserve(creator: address): u64 acquires TokenData {
        borrow_global<TokenData>(creator).apt_reserve
    }

    /// Get current price (reserve / supply)
    #[view]
    public fun get_current_price(creator: address): u64 acquires TokenData {
        let token_data = borrow_global<TokenData>(creator);
        let supply = token_data.current_supply;
        if (supply == 0) {
            return 0
        };
        // Price = reserve / supply (in octas per token)
        token_data.apt_reserve / supply
    }

    /// Transfer tokens between accounts
    entry fun transfer(
        sender: &signer,
        creator: address,
        recipient: address,
        amount: u64,
    ) acquires TokenData {
        let metadata = borrow_global<TokenData>(creator).metadata;
        primary_fungible_store::transfer(sender, metadata, recipient, amount);
    }

    /// Burn tokens (only creator can call)
    entry fun burn(
        creator: &signer,
        amount: u64,
    ) acquires TokenData {
        let creator_addr = signer::address_of(creator);
        let token_data = borrow_global_mut<TokenData>(creator_addr);
        
        // Only creator can burn
        assert!(creator_addr == token_data.creator, error::permission_denied(E_NOT_CREATOR));
        
        // Check balance
        let balance = primary_fungible_store::balance(creator_addr, token_data.metadata);
        assert!(balance >= amount, error::invalid_argument(E_INSUFFICIENT_BALANCE));
        
        // Withdraw and burn
        let fa = primary_fungible_store::withdraw(creator, token_data.metadata, amount);
        fungible_asset::burn(&token_data.burn_ref, fa);
        
        // Update current supply
        token_data.current_supply = token_data.current_supply - amount;
    }
}
