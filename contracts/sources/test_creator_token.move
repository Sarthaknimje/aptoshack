#[test_only]
module creatorvault::test_creator_token {
    use creatorvault::creator_token;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::object;
    use std::signer;
    use std::string;

    #[test(creator = @creatorvault)]
    fun test_initialize(creator: signer) {
        let creator_addr = signer::address_of(&creator);
        
        // Initialize a token
        creator_token::initialize(
            &creator,
            b"Test Token",
            b"TEST",
            8,
            1000000,
            b"https://example.com/icon.png",
            b"https://example.com"
        );
        
        // Verify token was created by checking metadata address
        let metadata = creator_token::get_metadata_address(creator_addr);
        assert!(object::object_address(&metadata) != @0x0, 1);
    }

    #[test(creator = @creatorvault)]
    fun test_mint_initial_supply(creator: signer) {
        let creator_addr = signer::address_of(&creator);
        
        // Initialize token
        creator_token::initialize(
            &creator,
            b"Test Token 2",
            b"TEST2",
            8,
            1000000,
            b"https://example.com/icon.png",
            b"https://example.com"
        );
        
        // Mint initial supply
        creator_token::mint_initial_supply(&creator, 500000);
        
        // Check balance
        let balance = creator_token::get_balance(creator_addr, creator_addr);
        assert!(balance == 500000, 2);
        
        // Check current supply
        let current_supply = creator_token::get_current_supply(creator_addr);
        assert!(current_supply == 500000, 3);
    }

    #[test(creator = @creatorvault, recipient = @0x123)]
    fun test_transfer(creator: signer, recipient: signer) {
        let creator_addr = signer::address_of(&creator);
        let recipient_addr = signer::address_of(&recipient);
        
        // Initialize and mint
        creator_token::initialize(
            &creator,
            b"Transfer Test",
            b"TRANS",
            8,
            1000000,
            b"https://example.com/icon.png",
            b"https://example.com"
        );
        
        creator_token::mint_initial_supply(&creator, 100000);
        
        // Transfer tokens
        creator_token::transfer(&creator, creator_addr, recipient_addr, 50000);
        
        // Check balances
        let creator_balance = creator_token::get_balance(creator_addr, creator_addr);
        let recipient_balance = creator_token::get_balance(creator_addr, recipient_addr);
        
        assert!(creator_balance == 50000, 4);
        assert!(recipient_balance == 50000, 5);
    }

    #[test(creator = @creatorvault)]
    fun test_get_total_supply(creator: signer) {
        let creator_addr = signer::address_of(&creator);
        
        creator_token::initialize(
            &creator,
            b"Supply Test",
            b"SUPP",
            8,
            2000000,
            b"https://example.com/icon.png",
            b"https://example.com"
        );
        
        let total_supply = creator_token::get_total_supply(creator_addr);
        assert!(total_supply == 2000000, 6);
    }
}

