# Shelby Protocol Setup Guide

To enable real Shelby uploads with working links, you need to configure the Shelby CLI.

## Quick Setup

1. **Initialize Shelby CLI:**
   ```bash
   shelby init
   ```

2. **Follow the prompts:**
   - Select network: `shelbynet` (testnet) or `mainnet`
   - The CLI will guide you through account creation or import

3. **Verify configuration:**
   ```bash
   shelby account list
   ```

## Testing Upload

Once configured, test an upload:
```bash
echo "test content" > test.txt
shelby upload test.txt my_test_blob -e "in 365 days" --assume-yes
```

You should see output with a real blob ID like:
```
✅ Uploaded: shelby://0x1234...abcd
Blob ID: 0x1234...abcd
```

## Backend Integration

The backend will automatically:
- Use the configured Shelby CLI
- Parse the real blob ID from CLI output
- Generate working explorer links: `https://explorer.shelby.xyz/shelbynet/blob/{blob_id}`

## Troubleshooting

If you see "No configuration file found":
1. Run `shelby init` in your terminal
2. Restart the backend server
3. Try uploading again

If uploads fail:
- Check your account balance: `shelby account balance`
- Verify network connectivity
- Check backend logs for detailed error messages

## Alternative: Use Node.js SDK

If CLI setup is not possible, you can use the Node.js SDK directly. The backend includes `shelby_upload.js` which uses `@shelby-protocol/sdk/node`.



