#!/usr/bin/env node
/**
 * Shelby Upload Script
 * Uses Shelby SDK to upload files and return real blob IDs
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(JSON.stringify({
    success: false,
    error: 'Usage: node shelby_upload.js <file_path> <blob_name> <expiration_days>'
  }));
  process.exit(1);
}

const filePath = args[0];
const blobName = args[1];
const expirationDays = parseInt(args[2]) || 365;

async function uploadToShelby() {
  try {
    // Import Shelby SDK from node_modules using the correct export path
    const shelbyModule = await import('@shelby-protocol/sdk/node');
    const Shelby = shelbyModule.default || shelbyModule.Shelby || shelbyModule;
    
    // Read file
    const fileBuffer = readFileSync(filePath);
    
    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    
    // Initialize Shelby client - check SDK API
    let shelby;
    if (typeof Shelby === 'function') {
      // If it's a class constructor
      shelby = new Shelby({
        network: 'shelbynet',
        rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby'
      });
    } else if (Shelby && typeof Shelby.create === 'function') {
      // If it has a create method
      shelby = Shelby.create({
        network: 'shelbynet',
        rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby'
      });
    } else {
      // Use as-is
      shelby = Shelby;
    }
    
    // Upload file - try different API patterns
    let result;
    if (typeof shelby.upload === 'function') {
      result = await shelby.upload({
        data: fileBuffer,
        name: blobName,
        expiration: expirationDate
      });
    } else if (typeof shelby.uploadBlob === 'function') {
      result = await shelby.uploadBlob(fileBuffer, {
        name: blobName,
        expiration: expirationDate
      });
    } else {
      throw new Error('Shelby SDK upload method not found. Available methods: ' + Object.keys(shelby).join(', '));
    }
    
    // Extract blob ID from result
    // The SDK should return a blob ID or transaction hash
    const blobId = result.blobId || result.id || result.hash || result.blob_id || result.transactionHash || blobName;
    const blobUrl = `shelby://${blobId}`;
    
    console.log(JSON.stringify({
      success: true,
      blobUrl: blobUrl,
      blobId: blobId,
      expirationDate: expirationDate.toISOString(),
      network: 'shelbynet',
      explorerUrl: `https://explorer.shelby.xyz/shelbynet/blob/${blobId}`,
      rawResult: result // Include for debugging
    }));
    
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message || String(error),
      stack: error.stack,
      name: error.name
    }));
    process.exit(1);
  }
}

uploadToShelby();

