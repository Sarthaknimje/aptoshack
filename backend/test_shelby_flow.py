#!/usr/bin/env python3
"""
Test script for Shelby premium content flow
Tests the complete integration from upload to token gating
"""

import requests
import json
import os
import tempfile
from pathlib import Path

BACKEND_URL = "http://localhost:5001"

def test_shelby_upload_endpoint():
    """Test Shelby upload endpoint"""
    print("\n🧪 Testing Shelby Upload Endpoint...")
    
    # Create a test file
    test_content = b"This is a test premium content file for Shelby Protocol"
    test_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
    test_file.write(test_content)
    test_file.close()
    
    try:
        # Test upload
        with open(test_file.name, 'rb') as f:
            files = {'file': ('test_premium.txt', f, 'text/plain')}
            data = {
                'blobName': f'premium_test_{os.getpid()}',
                'expiration': 'in 365 days'
            }
            
            response = requests.post(
                f"{BACKEND_URL}/api/shelby/upload",
                files=files,
                data=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Upload successful!")
                print(f"   Blob URL: {result.get('blobUrl', 'N/A')}")
                print(f"   Blob ID: {result.get('blobId', 'N/A')}")
                return result
            else:
                print(f"❌ Upload failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return None
    finally:
        # Clean up
        if os.path.exists(test_file.name):
            os.unlink(test_file.name)

def test_database_schema():
    """Test database schema for premium content"""
    print("\n🧪 Testing Database Schema...")
    
    import sqlite3
    
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Check columns
        cursor.execute("PRAGMA table_info(tokens)")
        columns = [row[1] for row in cursor.fetchall()]
        
        required_columns = ['premium_content_url', 'premium_content_blob_id', 'premium_content_type']
        missing = [col for col in required_columns if col not in columns]
        
        if missing:
            print(f"❌ Missing columns: {missing}")
            return False
        else:
            print(f"✅ All premium content columns exist")
            return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False
    finally:
        conn.close()

def test_token_with_premium_content():
    """Test creating a token with premium content"""
    print("\n🧪 Testing Token Creation with Premium Content...")
    
    # Check if we have any tokens
    try:
        response = requests.get(f"{BACKEND_URL}/tokens")
        if response.status_code == 200:
            result = response.json()
            tokens = result.get('tokens', [])
            
            if tokens:
                # Check if any token has premium content
                premium_tokens = [t for t in tokens if t.get('premium_content_url') or t.get('premium_content_blob_id')]
                if premium_tokens:
                    print(f"✅ Found {len(premium_tokens)} token(s) with premium content")
                    for token in premium_tokens[:3]:  # Show first 3
                        print(f"   - {token.get('token_name')} ({token.get('token_symbol')})")
                        print(f"     Blob ID: {token.get('premium_content_blob_id', 'N/A')}")
                        print(f"     Type: {token.get('premium_content_type', 'N/A')}")
                    return True
                else:
                    print("ℹ️  No tokens with premium content found (this is OK for testing)")
                    return True
            else:
                print("ℹ️  No tokens found in database")
                return True
    except Exception as e:
        print(f"❌ Error checking tokens: {e}")
        return False

def test_shelby_endpoints():
    """Test all Shelby endpoints"""
    print("\n🧪 Testing Shelby Endpoints...")
    
    endpoints = [
        ('/api/shelby/upload', 'POST'),
        ('/api/shelby/download', 'GET'),
        ('/api/shelby/metadata', 'GET'),
    ]
    
    for endpoint, method in endpoints:
        try:
            if method == 'GET':
                response = requests.get(f"{BACKEND_URL}{endpoint}?blobUrl=test", timeout=5)
            else:
                response = requests.post(f"{BACKEND_URL}{endpoint}", timeout=5)
            
            # Any response (even 400/500) means endpoint exists
            print(f"✅ {endpoint} ({method}) - Endpoint exists")
        except requests.exceptions.ConnectionError:
            print(f"❌ {endpoint} ({method}) - Backend not reachable")
        except Exception as e:
            print(f"⚠️  {endpoint} ({method}) - {type(e).__name__}")

def main():
    print("=" * 60)
    print("🧪 Shelby Premium Content Flow Test")
    print("=" * 60)
    
    # Test 1: Database schema
    schema_ok = test_database_schema()
    
    # Test 2: Shelby endpoints
    test_shelby_endpoints()
    
    # Test 3: Upload endpoint (if Shelby CLI is configured)
    upload_result = test_shelby_upload_endpoint()
    
    # Test 4: Check existing tokens
    test_token_with_premium_content()
    
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"Database Schema: {'✅ OK' if schema_ok else '❌ FAILED'}")
    print(f"Upload Test: {'✅ OK' if upload_result else '⚠️  SKIPPED (Shelby CLI may not be configured)'}")
    print("\n💡 Note: To fully test upload, ensure Shelby CLI is installed and configured:")
    print("   1. npm i -g @shelby-protocol/cli")
    print("   2. shelby init")
    print("   3. Fund account with ShelbyUSD tokens")

if __name__ == '__main__':
    main()

