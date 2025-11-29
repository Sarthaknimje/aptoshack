# Shelby Account Information

## Account Details

**Account Name:** default  
**Address:** `0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f`

## Funding Instructions

To enable real Shelby uploads, you need to fund this account with:

1. **APT tokens** (for gas fees)
2. **ShelbyUSD tokens** (for upload operations)

### Option 1: Use Shelby Faucet (Recommended)

Visit: https://faucet.shelbynet.shelby.xyz

Enter the address: `0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f`

Request both:
- APT tokens (for transaction fees)
- ShelbyUSD tokens (for upload operations)

### Option 2: Use CLI Faucet Command

```bash
shelby faucet
```

This will open the faucet website in your browser.

## Verify Funding

After funding, verify your balance:

```bash
shelby account balance
```

You should see:
- APT balance > 0
- ShelbyUSD balance > 0

## Test Upload

Once funded, test an upload:

```bash
echo "test content" > test.txt
shelby upload test.txt test_blob_$(date +%s) -e "in 365 days" --assume-yes
```

## Backend Integration

The backend is now configured to use this account for all Shelby uploads. When you upload premium content through the frontend:

1. The backend will use the Shelby CLI
2. Uploads will return **real blob IDs**
3. Explorer links will be **working and clickable**
4. All links will point to: `https://explorer.shelby.xyz/shelbynet/blob/{blob_id}`

## Configuration Location

- Config file: `~/.shelby/config.yaml`
- Account: `default`
- Network: `shelbynet`

## Troubleshooting

If uploads fail with "INSUFFICIENT_BALANCE":
- Check balance: `shelby account balance`
- Fund account via faucet
- Ensure both APT and ShelbyUSD are funded

If you see "No configuration file found":
- Config should be at: `~/.shelby/config.yaml`
- Verify it exists: `cat ~/.shelby/config.yaml`

