module creatorvault::creator_token {
    use aptos_framework::fungible_asset::{Self, FungibleAsset, Metadata, MintRef, TransferRef, BurnRef};
    use aptos_framework::object::{Self, ConstructorRef, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::string::{Self, String};
    use std::signer;
    use std::option;

    /// Struct to store token metadata and refs for each creator
    struct TokenData has key {
        metadata: Object<Metadata>,
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
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
        // Create a non-deletable object for the token metadata
        let constructor_ref = &object::create_named_object(creator, symbol);

        // Create the FA metadata with primary store enabled
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::some(total_supply), // Maximum supply
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
        move_to(creator, TokenData {
            metadata,
            mint_ref,
            transfer_ref,
            burn_ref,
        });
    }

    /// Mint tokens to a recipient
    entry fun mint(
        creator: &signer,
        recipient: address,
        amount: u64,
    ) acquires TokenData {
        let token_data = borrow_global_mut<TokenData>(signer::address_of(creator));
        
        // Mint the fungible asset
        let fa = fungible_asset::mint(
            &token_data.mint_ref,
            amount,
        );

        // Transfer to recipient (will auto-create primary store if needed)
        primary_fungible_store::deposit(recipient, fa);
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
}

