from flask import Flask, request, jsonify, redirect, url_for, session
from flask_cors import CORS, cross_origin
import json
import os
import sqlite3
import hashlib
from datetime import datetime
# Aptos SDK imports - optional since tokens are created via Petra wallet from frontend
try:
    from aptos_sdk import account as aptos_account
    from aptos_sdk.account import Account
    APTOS_SDK_AVAILABLE = True
except ImportError:
    APTOS_SDK_AVAILABLE = False
    logger.warning("aptos_sdk not available - token creation will be handled via frontend Petra wallet")
import base64
import traceback
import secrets
import logging
import uuid
from functools import wraps
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import google.auth.exceptions
from dotenv import load_dotenv

# Import bonding curve classes
try:
    from bonding_curve import BondingCurve, BondingCurveState
except ImportError:
    BondingCurve = None
    BondingCurveState = None

# Import web scraper
try:
    from web_scraper import WebScraper
except ImportError:
    WebScraper = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-change-in-production')

# Error handling decorator
def handle_errors(f):
    """Decorator to handle errors in route handlers"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except sqlite3.Error as e:
            logger.error(f"Database error in {f.__name__}: {str(e)}")
            return jsonify({"success": False, "error": "Database error occurred"}), 500
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500
    return decorated_function

# Configure CORS with environment-based origins
allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5180').split(',')
CORS(app, resources={
    r"/*": {
        "origins": allowed_origins if os.getenv('FLASK_ENV') == 'production' else "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type"],
        "max_age": 3600
    }
}, supports_credentials=True)

# Configure Flask session cookies for security
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' if os.getenv('FLASK_ENV') == 'production' else 'None'
app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour

# Security headers middleware
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    # CORS headers for credentials support
    origin = request.headers.get('Origin')
    if origin:
        if origin in allowed_origins or os.getenv('FLASK_ENV') != 'production':
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    if os.getenv('FLASK_ENV') == 'production':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# Aptos configuration
APTOS_NODE_URL = os.getenv('APTOS_NODE_URL', 'https://fullnode.testnet.aptoslabs.com')
APTOS_FAUCET_URL = os.getenv('APTOS_FAUCET_URL', 'https://faucet.testnet.aptoslabs.com')
aptos_client = None  # Will be initialized if SDK is available (not needed for frontend token creation)

# YouTube OAuth configuration
YOUTUBE_CLIENT_ID = os.getenv('YOUTUBE_CLIENT_ID', 'your-youtube-client-id')
YOUTUBE_CLIENT_SECRET = os.getenv('YOUTUBE_CLIENT_SECRET', 'your-youtube-client-secret')
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY', 'AIzaSyCpKxPjhZfHnxf2tk2g8Qu98TmSeNKaCAk')
# Default redirect URI - will be overridden by request origin
DEFAULT_YOUTUBE_REDIRECT_URI = os.getenv('YOUTUBE_REDIRECT_URI', 'http://localhost:5180/auth/youtube/callback')
YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

# YouTube sessions - will be loaded from database
youtube_sessions = {}

def load_youtube_session():
    """Load YouTube session from database"""
    global youtube_sessions
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        cursor.execute('SELECT session_key, credentials, channel_id, channel_title, created_at FROM youtube_sessions ORDER BY created_at DESC LIMIT 1')
        row = cursor.fetchone()
        conn.close()
        
        if row:
            session_key, credentials_json, channel_id, channel_title, created_at = row
            youtube_sessions[session_key] = {
                'credentials': json.loads(credentials_json),
                'channel_id': channel_id,
                'channel_title': channel_title
            }
            logger.info(f"✅ YouTube session loaded from database for channel: {channel_title}")
            return True
    except Exception as e:
        logger.error(f"Error loading YouTube session: {e}")
    return False

def save_youtube_session(session_key, credentials_data, channel_id, channel_title):
    """Save YouTube session to database"""
    global youtube_sessions
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Clear old sessions
        cursor.execute('DELETE FROM youtube_sessions')
        
        # Insert new session
        cursor.execute('''
            INSERT INTO youtube_sessions (session_key, credentials, channel_id, channel_title)
            VALUES (?, ?, ?, ?)
        ''', (session_key, json.dumps(credentials_data), channel_id, channel_title))
        
        conn.commit()
        conn.close()
        
        # Update in-memory cache
        youtube_sessions[session_key] = {
            'credentials': credentials_data,
            'channel_id': channel_id,
            'channel_title': channel_title
        }
        
        logger.info(f"✅ YouTube session saved to database for channel: {channel_title}")
        return True
    except Exception as e:
        logger.error(f"Error saving YouTube session: {e}")
        return False

def get_connected_channel_id():
    """Get the connected channel ID from session"""
    if youtube_sessions:
        session_key = list(youtube_sessions.keys())[0]
        return youtube_sessions[session_key].get('channel_id')
    return None

# Input validation helpers
def validate_aptos_address(address: str) -> bool:
    """Validate Aptos address format"""
    if not address or not isinstance(address, str):
        return False
    # Aptos addresses start with 0x and are 66 characters (0x + 64 hex chars)
    return address.startswith('0x') and len(address) == 66 and all(c in '0123456789abcdefABCDEF' for c in address[2:])

def validate_token_params(token_name: str, token_symbol: str, total_supply: int) -> tuple[bool, str]:
    """Validate token creation parameters"""
    if not token_name or len(token_name) > 32:
        return False, "Token name must be 1-32 characters"
    if not token_symbol or len(token_symbol) > 8:
        return False, "Token symbol must be 1-8 characters"
    if not isinstance(total_supply, int) or total_supply <= 0 or total_supply > 18446744073709551615:
        return False, "Invalid total supply"
    return True, ""

def sanitize_input(text: str, max_length: int = 256) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not text:
        return ""
    # Remove any null bytes and limit length
    sanitized = text.replace('\x00', '')[:max_length]
    return sanitized.strip()

# Creator account for Aptos token creation
# Using provided Petra wallet credentials
CREATOR_MNEMONIC = "visa wonder grass gold below average level clarify execute kiss lumber laptop"
CREATOR_PRIVATE_KEY = os.getenv('APTOS_CREATOR_PRIVATE_KEY', 'ed25519-priv-0x133bbcaac7a4f6e6179f2f909b0e5056df52a97a155631810c65b326c359171c')

# Helper function to get Aptos account from private key
def get_aptos_account():
    """Get Aptos account from private key"""
    if not APTOS_SDK_AVAILABLE:
        logger.warning("Aptos SDK not available - account operations disabled")
        return None
    try:
        # Remove 'ed25519-priv-' prefix if present
        private_key_hex = CREATOR_PRIVATE_KEY.replace('ed25519-priv-', '')
        if not private_key_hex.startswith('0x'):
            private_key_hex = '0x' + private_key_hex
        
        # Load account from private key
        account = Account.load_key(private_key_hex)
        return account
    except Exception as e:
        logger.error(f"Error loading Aptos account: {e}")
        return None

# Initialize database
def init_db():
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()
    
    # Create tokens table - Updated for Aptos (asa_id is now metadata_address as TEXT)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id TEXT UNIQUE,  -- Aptos FA metadata address or token identifier
            creator TEXT NOT NULL,
            token_name TEXT NOT NULL,
            token_symbol TEXT NOT NULL,
            total_supply INTEGER NOT NULL,
            current_price REAL NOT NULL,
            market_cap REAL NOT NULL,
            volume_24h REAL DEFAULT 0,
            holders INTEGER DEFAULT 1,
            price_change_24h REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            youtube_channel_title TEXT,
            youtube_subscribers INTEGER,
            video_id TEXT,
            video_title TEXT,
            platform TEXT,
            content_url TEXT,
            content_id TEXT,
            content_description TEXT,
            content_thumbnail TEXT,
            bonding_curve_config TEXT,
            bonding_curve_state TEXT,
            transaction_id TEXT,
            metadata_address TEXT  -- Aptos FA metadata object address
        )
    ''')
    
    # Migrate existing INTEGER asa_id to TEXT if needed
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN metadata_address TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Update asa_id column type if it's INTEGER (Algorand) to support TEXT (Aptos)
    try:
        # Check if asa_id is INTEGER type
        cursor.execute("PRAGMA table_info(tokens)")
        columns = cursor.fetchall()
        asa_id_type = None
        for col in columns:
            if col[1] == 'asa_id':
                asa_id_type = col[2]
                break
        
        # If asa_id is INTEGER, we need to handle migration
        # For now, we'll keep both - asa_id can be TEXT for Aptos
        if asa_id_type == 'INTEGER':
            # Add new column for Aptos metadata address
            logger.info("Database has INTEGER asa_id (Algorand format). New tokens will use metadata_address.")
    except Exception as e:
        logger.warning(f"Could not check asa_id column type: {e}")
    
    # Create trades table - Updated for Aptos (asa_id is now TEXT)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asa_id TEXT NOT NULL,  -- Changed to TEXT for Aptos metadata address
            trader_address TEXT NOT NULL,
            trade_type TEXT NOT NULL,
            amount REAL NOT NULL,
            price REAL NOT NULL,
            transaction_id TEXT NOT NULL,
            creator_fee REAL DEFAULT 0,
            platform_fee REAL DEFAULT 0,
            total_value REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            referral_code TEXT,
            referral_earnings REAL DEFAULT 0,
            FOREIGN KEY (asa_id) REFERENCES tokens (asa_id)
        )
    ''')
    
    # Add fee columns if they don't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE trades ADD COLUMN creator_fee REAL DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE trades ADD COLUMN platform_fee REAL DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE trades ADD COLUMN total_value REAL DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE trades ADD COLUMN referral_code TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE trades ADD COLUMN referral_earnings REAL DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Create referrals table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_address TEXT NOT NULL,
            referred_address TEXT NOT NULL UNIQUE,
            referral_code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_earnings REAL DEFAULT 0,
            total_trades_count INTEGER DEFAULT 0,
            total_volume REAL DEFAULT 0
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_address)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals (referred_address)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals (referral_code)')
    
    # Create referral_earnings table for detailed tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS referral_earnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_address TEXT NOT NULL,
            referred_address TEXT NOT NULL,
            trade_id INTEGER NOT NULL,
            earnings REAL NOT NULL,
            trade_value REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trade_id) REFERENCES trades (id)
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings (referrer_address)')
    
    # Add bonding curve columns if they don't exist
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN bonding_curve_config TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN bonding_curve_state TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN liquidity_pool_config TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN is_amm_migrated INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN migration_threshold REAL DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN platform TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN content_url TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN content_id TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN content_description TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute('ALTER TABLE tokens ADD COLUMN content_thumbnail TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Create holders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS holders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asa_id TEXT NOT NULL,  -- Changed to TEXT for Aptos metadata address
            holder_address TEXT NOT NULL,
            balance REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asa_id) REFERENCES tokens (asa_id)
        )
    ''')
    
    # Create YouTube sessions table for persistent auth
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS youtube_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_key TEXT UNIQUE NOT NULL,
            credentials TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            channel_title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create YouTube channel cache table to avoid quota issues
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS youtube_channel_cache (
            channel_id TEXT PRIMARY KEY,
            channel_title TEXT,
            channel_data TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create YouTube videos cache table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS youtube_videos_cache (
            channel_id TEXT PRIMARY KEY,
            channel_title TEXT,
            videos_data TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create YouTube video info cache table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS youtube_video_info_cache (
            video_id TEXT PRIMARY KEY,
            video_data TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create predictions table for prediction markets
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT UNIQUE NOT NULL,
            creator_address TEXT NOT NULL,
            content_url TEXT NOT NULL,
            platform TEXT NOT NULL,
            metric_type TEXT NOT NULL,
            target_value REAL NOT NULL,
            timeframe_hours INTEGER NOT NULL,
            end_time TIMESTAMP NOT NULL,
            yes_pool REAL DEFAULT 0,
            no_pool REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            outcome TEXT,
            initial_value REAL,
            final_value REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create prediction_trades table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prediction_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT NOT NULL,
            trader_address TEXT NOT NULL,
            side TEXT NOT NULL,
            amount REAL NOT NULL,
            odds REAL NOT NULL,
            potential_payout REAL NOT NULL,
            transaction_id TEXT,
            status TEXT DEFAULT 'pending',
            payout_amount REAL DEFAULT 0,
            claimed INTEGER DEFAULT 0,
            claim_txid TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prediction_id) REFERENCES predictions (prediction_id)
        )
    ''')
    
    # Migrate prediction_trades table - add claimed columns if they don't exist
    try:
        cursor.execute('PRAGMA table_info(prediction_trades)')
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'claimed' not in columns:
            cursor.execute('ALTER TABLE prediction_trades ADD COLUMN claimed INTEGER DEFAULT 0')
        if 'claim_txid' not in columns:
            cursor.execute('ALTER TABLE prediction_trades ADD COLUMN claim_txid TEXT')
        
        conn.commit()
    except Exception as e:
        logger.warning(f"Migration warning: {e}")

    # Create copy trading profiles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS copy_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            leader_address TEXT NOT NULL,
            follower_address TEXT NOT NULL,
            allocation_percent REAL NOT NULL,
            max_single_trade_algo REAL NOT NULL,
            copy_type TEXT DEFAULT 'proportional',
            risk_level TEXT DEFAULT 'balanced',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_copy_profiles_leader ON copy_profiles (leader_address)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_copy_profiles_follower ON copy_profiles (follower_address)')
    
    # Migrate copy_profiles table - add risk_level column if it doesn't exist
    try:
        cursor.execute('PRAGMA table_info(copy_profiles)')
        columns = [col[1] for col in cursor.fetchall()]
        if 'risk_level' not in columns:
            cursor.execute('ALTER TABLE copy_profiles ADD COLUMN risk_level TEXT DEFAULT "balanced"')
            conn.commit()
    except Exception as e:
        logger.warning(f"Migration warning for copy_profiles: {e}")

    # Create bot strategies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bot_strategies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_address TEXT NOT NULL,
            label TEXT NOT NULL,
            asa_id TEXT,  -- Changed to TEXT for Aptos metadata address
            token_symbol TEXT,
            metric_type TEXT NOT NULL,
            condition TEXT NOT NULL,
            action TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bot_strategies_owner ON bot_strategies (owner_address)')
    
    # Strategy executions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS strategy_executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strategy_id INTEGER NOT NULL,
            trader_address TEXT NOT NULL,
            asa_id TEXT NOT NULL,  -- Changed to TEXT for Aptos metadata address
            trade_type TEXT NOT NULL,
            amount REAL NOT NULL,
            price REAL NOT NULL,
            total_value REAL NOT NULL,
            pnl REAL DEFAULT 0,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (strategy_id) REFERENCES bot_strategies(id)
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_strategy_executions_strategy ON strategy_executions (strategy_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_strategy_executions_trader ON strategy_executions (trader_address)')

    conn.close()
    
    # Load YouTube session from database if exists
    load_youtube_session()
    
    # Initialize bonding curves for existing tokens that don't have them
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT asa_id, total_supply, current_price 
            FROM tokens 
            WHERE bonding_curve_config IS NULL OR bonding_curve_config = ''
        ''')
        
        tokens_to_update = cursor.fetchall()
        
        if tokens_to_update and BondingCurve is not None:
            for asa_id, total_supply, current_price in tokens_to_update:
                initial_price = current_price if current_price > 0 else 0.001
                bonding_curve = BondingCurve(
                    initial_price=initial_price,
                    initial_supply=int(total_supply)
                )
                bonding_curve_state = BondingCurveState(
                    token_supply=0,
                    algo_reserve=0
                )
                bonding_curve_config_json = json.dumps(bonding_curve.to_dict())
                bonding_curve_state_json = json.dumps(bonding_curve_state.to_dict())
                
                cursor.execute('''
                    UPDATE tokens 
                    SET bonding_curve_config = ?, bonding_curve_state = ?
                    WHERE asa_id = ?
                ''', (bonding_curve_config_json, bonding_curve_state_json, asa_id))
            
            conn.commit()
            if tokens_to_update:
                logger.info(f"✅ Initialized bonding curves for {len(tokens_to_update)} existing tokens")
        
        conn.close()
    except Exception as e:
        logger.warning(f"Could not initialize bonding curves for existing tokens: {e}")

# Helper function to deploy Aptos FA token contract
def deploy_fa_token_contract(creator_account: Account) -> str:
    """Deploy the creator_token Move contract to Aptos"""
    try:
        # The contract should be compiled and published using aptos CLI
        # For now, return the account address where the contract will be deployed
        module_address = str(creator_account.address())
        logger.info(f"Contract should be deployed at: {module_address}")
        logger.info("To deploy: cd contracts && aptos move publish --named-addresses creatorvault={}".format(module_address))
        
        return module_address
    except Exception as e:
        logger.error(f"Error getting contract address: {e}")
        raise e

# Helper function to create FA token on Aptos
def create_fa_token(
    creator_account: Account,
    name: str,
    symbol: str,
    decimals: int,
    total_supply: int,
    icon_uri: str = "",
    project_uri: str = ""
) -> dict:
    """Create a Fungible Asset token on Aptos"""
    try:
        # Build the initialize transaction
        module_address = str(creator_account.address())
        
        # Create entry function call
        entry_function = EntryFunction.natural(
            f"{module_address}::creator_token",
            "initialize",
            [],
            [
                TransactionArgument(name.encode('utf-8'), Serializer.sequence_serializer(Serializer.u8)),
                TransactionArgument(symbol.encode('utf-8'), Serializer.sequence_serializer(Serializer.u8)),
                TransactionArgument(decimals, Serializer.u8),
                TransactionArgument(total_supply, Serializer.u64),
                TransactionArgument(icon_uri.encode('utf-8'), Serializer.sequence_serializer(Serializer.u8)),
                TransactionArgument(project_uri.encode('utf-8'), Serializer.sequence_serializer(Serializer.u8)),
            ]
        )
        
        # Create and submit transaction
        transaction = aptos_client.create_bcs_transaction(creator_account, entry_function)
        signed_transaction = aptos_client.sign_transaction(creator_account, transaction)
        tx_hash = aptos_client.submit_transaction(signed_transaction)
        
        # Wait for transaction
        aptos_client.wait_for_transaction(tx_hash)
        
        logger.info(f"✅ FA Token created! Transaction: {tx_hash}")
        
        # Get the metadata object address (would need to parse transaction result)
        # For now, return transaction hash and creator address
        return {
            "transaction_hash": tx_hash,
            "creator_address": str(creator_account.address()),
            "token_name": name,
            "token_symbol": symbol
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating FA token: {e}")
        traceback.print_exc()
        raise e

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "CreatorVault Backend",
        "version": "1.0.0",
        "features": [
            "Aptos FA Token Creation",
            "YouTube OAuth Integration", 
            "Token Trading",
            "Content Tokenization",
            "Petra Wallet Integration"
        ]
    })

@app.route('/auth/youtube', methods=['GET'])
@cross_origin(supports_credentials=True)
def youtube_auth():
    """Initiate YouTube OAuth flow"""
    try:
        # Check if OAuth credentials are configured
        if YOUTUBE_CLIENT_ID == 'your-youtube-client-id' or not YOUTUBE_CLIENT_ID:
            return jsonify({
                "success": False,
                "error": "YouTube OAuth client not configured. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET environment variables."
            }), 500
        # FORCE port 5180 - always use 5180 regardless of what origin is sent
        # This ensures Google OAuth redirects to the correct port
        origin = 'http://localhost:5180'
        
        # Construct redirect URI using port 5180
        redirect_uri = f"{origin}/auth/youtube/callback"
        
        logger.info(f"Using redirect URI: {redirect_uri} (FORCED to port 5180, received Origin: {request.headers.get('Origin')}, Referer: {request.headers.get('Referer')})")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": YOUTUBE_CLIENT_ID,
                    "client_secret": YOUTUBE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri, DEFAULT_YOUTUBE_REDIRECT_URI]  # Support both
                }
            },
            scopes=YOUTUBE_SCOPES,
            redirect_uri=redirect_uri
        )
        
        auth_url, _ = flow.authorization_url(prompt='consent')
        
        return jsonify({
            "success": True,
            "auth_url": auth_url
        })
        
    except Exception as e:
        logger.error(f"❌ YouTube auth error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/auth/youtube/callback', methods=['POST'])
def youtube_callback():
    """Handle YouTube OAuth callback"""
    try:
        data = request.get_json()
        auth_code = data.get('code')
        redirect_uri = data.get('redirect_uri')  # Get redirect URI from request
        
        if not auth_code:
            return jsonify({
                "success": False,
                "error": "No authorization code provided"
            }), 400
        
        # FORCE port 5180 - always use 5180 for callback
        # Use the redirect_uri from request if provided, but ensure it's port 5180
        if redirect_uri:
            # Replace any port with 5180
            if ':5175' in redirect_uri:
                redirect_uri = redirect_uri.replace(':5175', ':5180')
            elif 'localhost' in redirect_uri and ':5180' not in redirect_uri:
                # Extract the path and rebuild with port 5180
                from urllib.parse import urlparse, urlunparse
                parsed = urlparse(redirect_uri)
                redirect_uri = urlunparse((parsed.scheme, 'localhost:5180', parsed.path, parsed.params, parsed.query, parsed.fragment))
        else:
            # Force to 5180
            redirect_uri = DEFAULT_YOUTUBE_REDIRECT_URI
        
        logger.info(f"Using redirect URI for callback: {redirect_uri} (FORCED to port 5180, received from request: {data.get('redirect_uri')})")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": YOUTUBE_CLIENT_ID,
                    "client_secret": YOUTUBE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri, DEFAULT_YOUTUBE_REDIRECT_URI]  # Support both
                }
            },
            scopes=YOUTUBE_SCOPES,
            redirect_uri=redirect_uri
        )
        
        try:
            flow.fetch_token(code=auth_code)
            credentials = flow.credentials
        except Exception as token_error:
            error_msg = str(token_error)
            print(f"❌ Token exchange failed: {token_error}")
            
            # Check for deleted client error
            if 'deleted_client' in error_msg or '401' in error_msg:
                return jsonify({
                    "success": False,
                    "error": "OAuth client was deleted. Please create a new OAuth client in Google Cloud Console and update YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in your environment variables."
                }), 401
            
            return jsonify({
                "success": False,
                "error": f"Token exchange failed: {error_msg}"
            }), 400
        
        # Build YouTube service
        youtube = build('youtube', 'v3', credentials=credentials)
        
        # Get channel information
        channels_response = youtube.channels().list(
            part='snippet,statistics',
            mine=True
        ).execute()
        
        if not channels_response['items']:
            return jsonify({
                "success": False,
                "error": "No YouTube channel found"
            }), 400
        
        channel = channels_response['items'][0]
        channel_id = channel['id']
        channel_title = channel['snippet']['title']
        subscribers = int(channel['statistics'].get('subscriberCount', 0))
        
        # Store credentials in database for persistence across restarts
        session_id = f"yt_session_{secrets.token_hex(8)}"
        credentials_data = {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
            'scopes': list(credentials.scopes) if credentials.scopes else []
        }
        
        # Save to database for persistence
        save_youtube_session(session_id, credentials_data, channel_id, channel_title)
        
        # Cache the channel data immediately to avoid future API calls
        snippet = channel['snippet']
        statistics = channel['statistics']
        channel_data = {
            "id": channel_id,
            "title": channel_title,
            "description": snippet.get('description', ''),
            "thumbnail": snippet['thumbnails']['high']['url'],
            "subscriberCount": subscribers,
            "viewCount": int(statistics.get('viewCount', 0)),
            "videoCount": int(statistics.get('videoCount', 0))
        }
        
        # Save channel data to cache
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO youtube_channel_cache 
            (channel_id, channel_title, channel_data, updated_at)
            VALUES (?, ?, ?, ?)
        ''', (channel_id, channel_title, json.dumps(channel_data), datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
        print(f"✅ YouTube OAuth successful for channel: {channel_title} ({channel_id})")
        print(f"💾 Stored in database - Session ID: {session_id}")
        print(f"💾 Cached channel data to avoid quota issues")
        print(f"📋 Total sessions: {len(youtube_sessions)}")
        
        return jsonify({
            "success": True,
            "channel_id": channel_id,
            "channel_title": channel_title,
            "subscribers": subscribers
        })
        
    except Exception as e:
        print(f"❌ YouTube callback error: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/auth/youtube/status', methods=['GET'])
def youtube_auth_status():
    """Check if user is authenticated with YouTube"""
    try:
        print(f"🔍 Checking YouTube auth status...")
        print(f"📋 In-memory sessions: {list(youtube_sessions.keys())}")
        
        if not youtube_sessions:
            print("❌ No YouTube sessions found")
            return jsonify({
                "success": False,
                "authenticated": False,
                "error": "Not authenticated"
            })
        
        session_key = list(youtube_sessions.keys())[0]
        session_data = youtube_sessions[session_key]
        
        print("✅ YouTube session found")
        
        credentials_data = session_data['credentials']
        credentials = Credentials(
            token=credentials_data['token'],
            refresh_token=credentials_data['refresh_token'],
            token_uri=credentials_data['token_uri'],
            client_id=credentials_data['client_id'],
            client_secret=credentials_data['client_secret'],
            scopes=credentials_data['scopes']
        )
        
        # Test credentials by making a simple API call
        youtube = build('youtube', 'v3', credentials=credentials)
        channels_response = youtube.channels().list(
            part='snippet',
            mine=True
        ).execute()
        
        if channels_response['items']:
            channel = channels_response['items'][0]
            print(f"✅ YouTube API call successful for channel: {channel['snippet']['title']}")
            return jsonify({
                "success": True,
                "authenticated": True,
                "channel_id": channel['id'],
                "channel_title": channel['snippet']['title']
            })
        else:
            print("❌ No channel found in API response")
            return jsonify({
                "success": False,
                "authenticated": False,
                "error": "No channel found"
            })
            
    except Exception as e:
        print(f"❌ YouTube status check error: {e}")
        return jsonify({
            "success": False,
            "authenticated": False,
            "error": str(e)
        }), 500

@app.route('/api/linkedin/profile', methods=['POST'])
@cross_origin(supports_credentials=True)
def get_linkedin_profile():
    """Get LinkedIn profile followers count"""
    try:
        data = request.get_json()
        profile_url = data.get('profile_url')
        
        if not profile_url:
            return jsonify({"success": False, "error": "profile_url is required"}), 400
        
        scraper = WebScraper()
        profile_data = scraper.scrape_linkedin_profile(profile_url)
        
        if profile_data:
            return jsonify({
                "success": True,
                "profile": profile_data
            })
        else:
            return jsonify({
                "success": False,
                "error": "Could not fetch LinkedIn profile data"
            }), 404
            
    except Exception as e:
        logger.error(f"Error fetching LinkedIn profile: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/auth/youtube/channel', methods=['GET'])
def get_youtube_channel():
    """Get full YouTube channel information - uses cached data to avoid quota issues"""
    try:
        if not youtube_sessions:
            return jsonify({
                "success": False,
                "error": "Not authenticated",
                "channel": None
            }), 200  # Return 200 with success: false so frontend can handle gracefully
        
        session_key = list(youtube_sessions.keys())[0]
        session_data = youtube_sessions[session_key]
        channel_id = session_data.get('channel_id')
        channel_title = session_data.get('channel_title')
        
        # First, try to get cached channel data from database
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Check if we have cached channel data
        cursor.execute('''
            SELECT channel_data, updated_at FROM youtube_channel_cache 
            WHERE channel_id = ? 
            ORDER BY updated_at DESC LIMIT 1
        ''', (channel_id,))
        
        cache_row = cursor.fetchone()
        
        # If cache exists and is less than 1 hour old, return cached data
        if cache_row:
            cached_data_json, updated_at = cache_row
            updated_time = datetime.fromisoformat(updated_at)
            time_diff = datetime.now() - updated_time
            
            # Use cache if less than 1 hour old
            if time_diff.total_seconds() < 3600:  # 1 hour
                cached_data = json.loads(cached_data_json)
                conn.close()
                logger.info(f"✅ Returning cached YouTube channel data for {channel_title} (cached {int(time_diff.total_seconds()/60)} minutes ago)")
                return jsonify({
                    "success": True,
                    "channel": cached_data,
                    "cached": True
                })
        
        conn.close()
        
        # If no cache or cache is stale, try to fetch from API
        # But handle quota errors gracefully
        try:
            credentials_data = session_data['credentials']
            credentials = Credentials(
                token=credentials_data['token'],
                refresh_token=credentials_data['refresh_token'],
                token_uri=credentials_data['token_uri'],
                client_id=credentials_data['client_id'],
                client_secret=credentials_data['client_secret'],
                scopes=credentials_data['scopes']
            )
            
            # Refresh token if needed
            if credentials.expired:
                credentials.refresh(Request())
            
            youtube = build('youtube', 'v3', credentials=credentials)
            channels_response = youtube.channels().list(
                part='snippet,statistics',
                mine=True
            ).execute()
            
            if channels_response['items']:
                channel = channels_response['items'][0]
                snippet = channel['snippet']
                statistics = channel['statistics']
                
                channel_data = {
                    "id": channel['id'],
                    "title": snippet['title'],
                    "description": snippet.get('description', ''),
                    "thumbnail": snippet['thumbnails']['high']['url'],
                    "subscriberCount": int(statistics.get('subscriberCount', 0)),
                    "viewCount": int(statistics.get('viewCount', 0)),
                    "videoCount": int(statistics.get('videoCount', 0))
                }
                
                # Save to cache
                conn = sqlite3.connect('creatorvault.db')
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO youtube_channel_cache 
                    (channel_id, channel_title, channel_data, updated_at)
                    VALUES (?, ?, ?, ?)
                ''', (channel_id, channel_title, json.dumps(channel_data), datetime.now().isoformat()))
                conn.commit()
                conn.close()
                
                logger.info(f"✅ Fetched and cached YouTube channel data for {channel_title}")
                return jsonify({
                    "success": True,
                    "channel": channel_data,
                    "cached": False
                })
            else:
                return jsonify({
                    "success": False,
                    "error": "No channel found"
                }), 404
                
        except HttpError as http_err:
            # Handle quota exceeded error
            if http_err.resp.status == 403 and 'quotaExceeded' in str(http_err):
                logger.warning(f"⚠️ YouTube API quota exceeded. Returning cached data if available.")
                
                # Try to return cached data even if stale
                if cache_row:
                    cached_data = json.loads(cached_data_json)
                    return jsonify({
                        "success": True,
                        "channel": cached_data,
                        "cached": True,
                        "warning": "Using cached data due to API quota limit"
                    })
                else:
                    return jsonify({
                        "success": False,
                        "error": "YouTube API quota exceeded. Please try again later.",
                        "quotaExceeded": True
                    }), 429
            else:
                raise
                
    except Exception as e:
        logger.error(f"Error fetching YouTube channel: {e}")
        
        # Try to return cached data as fallback
        if cache_row:
            try:
                cached_data = json.loads(cached_data_json)
                logger.info(f"⚠️ Error occurred, returning cached data as fallback")
                return jsonify({
                    "success": True,
                    "channel": cached_data,
                    "cached": True,
                    "warning": "Using cached data due to error"
                })
            except:
                pass
        
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/test-create-token', methods=['POST'])
def test_create_token():
    """Test endpoint to create a token on Aptos - REMOVED: Use frontend with Petra wallet instead"""
    return jsonify({
        "success": False,
        "error": "Token creation must be done via Petra wallet from frontend. Use /create-creator-token endpoint."
    }), 400

@app.route('/create-creator-token', methods=['POST'])
def create_creator_token():
    """Create a creator token (ASA) with bonding curve - token already created via Pera Wallet"""
    try:
        data = request.get_json()
        
        # Check if asset_id is provided (token already created via Petra Wallet)
        asset_id = data.get('asset_id') or data.get('metadata_address')
        if not asset_id:
            return jsonify({
                "success": False,
                "error": "asset_id or metadata_address is required. Token must be created via Petra Wallet first."
            }), 400
        
        # Get creator address from request (token was created via Petra Wallet on Aptos)
        creator_address = data.get('creator_address')
        if not creator_address:
            return jsonify({
                "success": False,
                "error": "creator_address is required"
            }), 400
        
        # YouTube authentication is optional for multi-platform tokens
        channel_title = data.get('youtube_channel_title', 'Creator')
        subscribers = data.get('youtube_subscribers', 0)
        
        if youtube_sessions:
            try:
                session_key = list(youtube_sessions.keys())[0]
                session_data = youtube_sessions[session_key]
                credentials_data = session_data['credentials']
                credentials = Credentials(
                    token=credentials_data['token'],
                    refresh_token=credentials_data['refresh_token'],
                    token_uri=credentials_data['token_uri'],
                    client_id=credentials_data['client_id'],
                    client_secret=credentials_data['client_secret'],
                    scopes=credentials_data['scopes']
                )
                
                # Get YouTube channel info
                youtube = build('youtube', 'v3', credentials=credentials)
                channels_response = youtube.channels().list(
                    part='snippet,statistics',
                    mine=True
                ).execute()
                
                if channels_response['items']:
                    channel = channels_response['items'][0]
                    channel_title = channel['snippet']['title']
                    subscribers = int(channel['statistics'].get('subscriberCount', 0))
            except Exception as e:
                logger.warning(f"Could not fetch YouTube channel info: {e}")
                # Continue without YouTube data
        
        # Calculate market cap
        initial_price = float(data.get('initial_price', data.get('token_price', 0.001)))
        market_cap = float(data['total_supply']) * initial_price
        
        # Initialize bonding curve
        if BondingCurve is not None:
            bonding_curve = BondingCurve(
                initial_price=initial_price,
                initial_supply=int(data['total_supply'])
            )
            bonding_curve_state = BondingCurveState(
                token_supply=0,  # Start with 0 tokens in circulation
                algo_reserve=0   # Start with 0 APTOS in reserve
            )
            bonding_curve_config_json = json.dumps(bonding_curve.to_dict())
            bonding_curve_state_json = json.dumps(bonding_curve_state.to_dict())
        else:
            bonding_curve_config_json = None
            bonding_curve_state_json = None
        
        # Store in database
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO tokens (asa_id, creator, token_name, token_symbol, total_supply, 
                              current_price, market_cap, youtube_channel_title, youtube_subscribers,
                              bonding_curve_config, bonding_curve_state, platform, content_url,
                              content_id, content_description, content_thumbnail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            asset_id, 
            data.get('creator_address', creator_address),
            data['token_name'], 
            data['token_symbol'], 
            int(data['total_supply']), 
            initial_price, 
            market_cap,
            data.get('youtube_channel_title', channel_title),
            data.get('youtube_subscribers', subscribers),
            bonding_curve_config_json,
            bonding_curve_state_json,
            data.get('platform', 'youtube'),
            data.get('content_url', ''),
            data.get('content_id', ''),
            data.get('description', ''),
            data.get('content_thumbnail', '')
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "data": {
                "asset_id": asset_id,
                "token_name": data['token_name'],
                "token_symbol": data['token_symbol'],
                "total_supply": int(data['total_supply']),
                "current_price": initial_price,
                "market_cap": market_cap,
                "creator": creator_address,
                "transaction_id": f"tx_{asset_id}",
                "youtube_channel": {
                    "title": channel_title,
                    "subscribers": subscribers
                },
                "bonding_curve_initialized": bonding_curve_config_json is not None
            }
        })
        
    except Exception as e:
        print(f"❌ Error creating creator token: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/create-video-token', methods=['POST'])
def create_video_token():
    """Create a video token (ASA)"""
    try:
        data = request.get_json()
        
        # Check YouTube authentication
        if not youtube_sessions:
            return jsonify({
                "success": False,
                "error": "YouTube authentication required. Please connect your YouTube channel first."
            }), 401
        
        session_key = list(youtube_sessions.keys())[0]
        session_data = youtube_sessions[session_key]
        
        credentials_data = session_data['credentials']
        credentials = Credentials(
            token=credentials_data['token'],
            refresh_token=credentials_data['refresh_token'],
            token_uri=credentials_data['token_uri'],
            client_id=credentials_data['client_id'],
            client_secret=credentials_data['client_secret'],
            scopes=credentials_data['scopes']
        )
        
        # Get YouTube channel info
        youtube = build('youtube', 'v3', credentials=credentials)
        channels_response = youtube.channels().list(
            part='snippet,statistics',
            mine=True
        ).execute()
        
        channel = channels_response['items'][0]
        channel_id = channel['id']
        channel_title = channel['snippet']['title']
        subscribers = int(channel['statistics'].get('subscriberCount', 0))
        
        # Get video details
        video_response = youtube.videos().list(
            part='snippet,statistics',
            id=data['video_id']
        ).execute()
        
        if not video_response['items']:
            return jsonify({
                "success": False,
                "error": "Video not found"
            }), 404
        
        video = video_response['items'][0]
        video_title = video['snippet']['title']
        video_views = int(video['statistics'].get('viewCount', 0))
        video_likes = int(video['statistics'].get('likeCount', 0))
        video_comments = int(video['statistics'].get('commentCount', 0))
        
        # Calculate dynamic price based on engagement
        engagement_score = (video_likes * 2 + video_comments * 3) / max(video_views, 1) * 1000
        base_price = float(data['token_price'])
        dynamic_price = base_price + (engagement_score * 0.001)
        
        # Get creator address from request (token was created via Petra Wallet on Aptos)
        creator_address = data.get('creator_address')
        if not creator_address:
            return jsonify({
                "success": False,
                "error": "creator_address is required. Token must be created via Petra Wallet first."
            }), 400
        
        # Get asset_id (metadata address) from request
        asset_id = data.get('asset_id') or data.get('metadata_address')
        if not asset_id:
            return jsonify({
                "success": False,
                "error": "asset_id or metadata_address is required. Token must be created via Petra Wallet first."
            }), 400
        
        # Token was already created on-chain via Petra Wallet
        print(f"✅ Token already created on Aptos with metadata address: {asset_id}")
        
        # Calculate market cap
        market_cap = float(data['total_supply']) * dynamic_price
        
        # Store in database
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO tokens (asa_id, creator, token_name, token_symbol, total_supply, 
                              current_price, market_cap, youtube_channel_title, youtube_subscribers,
                              video_id, video_title)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (asset_id, creator_address, data['token_name'], data['token_symbol'], 
              int(data['total_supply']), dynamic_price, market_cap,
              channel_title, subscribers, data['video_id'], video_title))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "data": {
                "asset_id": asset_id,
                "token_name": data['token_name'],
                "token_symbol": data['token_symbol'],
                "total_supply": int(data['total_supply']),
                "current_price": dynamic_price,
                "market_cap": market_cap,
                "creator": creator_address,
                "transaction_id": f"tx_{asset_id}",
                "video_metrics": {
                    "views": video_views,
                    "likes": video_likes,
                    "comments": video_comments,
                    "engagement_score": engagement_score
                }
            }
        })
        
    except Exception as e:
        print(f"❌ Error creating video token: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/trade-token', methods=['POST'])
def trade_token():
    """Execute a token trade"""
    try:
        data = request.get_json()
        
        # Get trader address from request (user's wallet)
        trader_address = data.get('trader_address')
        if not trader_address:
            return jsonify({
                "success": False,
                "error": "Trader address is required"
            }), 400
        
        # Get creator account for token management
        creator_private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
        creator_address = account.address_from_private_key(creator_private_key)
        
        # Convert amount to token units (assuming 6 decimals for the asset)
        requested_amount = float(data['amount'])
        token_amount = int(requested_amount * 1000000)  # 1 token = 1,000,000 micro-units
        algo_amount = int(float(data['price']) * requested_amount * 1000000)  # APTOS amount in micro-units
        
        # Check if creator has enough tokens for the trade
        try:
            account_info = algod_client.account_info(creator_address)
            assets = account_info.get('assets', [])
            creator_token_balance = 0
            
            for asset in assets:
                if asset['asset-id'] == int(data['asa_id']):
                    creator_token_balance = asset['amount']
                    break
            
            if data['trade_type'] == 'buy' and token_amount > creator_token_balance:
                return jsonify({
                    "success": False,
                    "error": f"Insufficient token balance. Creator has {creator_token_balance/1000000:.6f} tokens, but you're trying to buy {requested_amount:.6f} tokens. Please try a smaller amount or check if this token has enough supply."
                }), 400
                
        except Exception as e:
            print(f"Warning: Could not check creator balance: {e}")
        
        # Get suggested parameters
        sp = algod_client.suggested_params()
        
        if data['trade_type'] == 'buy':
            # For buying: Creator sends tokens to user (simplified demo)
            # In a real system, user would pay APTOS, but for demo we'll simulate it
            asset_txn = transaction.AssetTransferTxn(
                sender=creator_address,
                sp=sp,
                receiver=trader_address,
                amt=token_amount,
                index=int(data['asa_id'])
            )
            
            # Sign and send transaction
            signed_asset = asset_txn.sign(creator_private_key)
            asset_txid = algod_client.send_transaction(signed_asset)
            print(f"📤 Asset transfer sent: {asset_txid}")
            
            # Wait for confirmation
            asset_results = transaction.wait_for_confirmation(algod_client, asset_txid, 4)
            txid = asset_txid
            
        else:
            # For selling: Creator receives tokens from user (simplified demo)
            # In a real system, creator would pay APTOS, but for demo we'll simulate it
            asset_txn = transaction.AssetTransferTxn(
                sender=trader_address,
                sp=sp,
                receiver=creator_address,
                amt=token_amount,
                index=int(data['asa_id'])
            )
            
            # Sign and send transaction
            signed_asset = asset_txn.sign(creator_private_key)  # Simplified: creator signs for user
            asset_txid = algod_client.send_transaction(signed_asset)
            print(f"📤 Asset transfer sent: {asset_txid}")
            
            # Wait for confirmation
            asset_results = transaction.wait_for_confirmation(algod_client, asset_txid, 4)
            txid = asset_txid
        
        # Store trade in database
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO trades (asa_id, trader_address, trade_type, amount, price, transaction_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (int(data['asa_id']), trader_address, data['trade_type'], 
              float(data['amount']), float(data['price']), txid))
        
        conn.commit()
        conn.close()
        
        # Get confirmation round from the asset transaction
        if data['trade_type'] == 'buy':
            confirmed_round = asset_results['confirmed-round']
        else:
            confirmed_round = asset_results['confirmed-round']
        
        return jsonify({
            "success": True,
            "data": {
                "transaction_id": txid,
                "trade_type": data['trade_type'],
                "amount": float(data['amount']),
                "price": float(data['price']),
                "asa_id": int(data['asa_id']),
                "confirmed_round": confirmed_round,
                "algo_amount": algo_amount / 1000000,  # Convert back to APTOS
                "token_amount": token_amount / 1000000  # Convert back to tokens
            }
        })
        
    except Exception as e:
        print(f"❌ Trade error: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/user-balance/<address>', methods=['GET'])
def get_user_balance(address):
    """Get user's APTOS and token balances"""
    try:
        # Get account info
        account_info = algod_client.account_info(address)
        algo_balance = account_info.get('amount', 0) / 1000000  # Convert to APTOS
        
        # Get token balances
        assets = account_info.get('assets', [])
        token_balances = {}
        
        for asset in assets:
            asset_id = asset['asset-id']
            amount = asset['amount']
            token_balances[asset_id] = {
                'balance': amount,
                'balance_tokens': amount / 1000000  # Convert to token units
            }
        
        return jsonify({
            "success": True,
            "address": address,
            "algo_balance": algo_balance,
            "token_balances": token_balances
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/token-info/<int:asa_id>', methods=['GET'])
def get_token_info(asa_id):
    """Get comprehensive token information including max tradeable amount"""
    try:
        # Get creator account
        private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
        creator_address = account.address_from_private_key(private_key)
        
        # Get account info
        account_info = algod_client.account_info(creator_address)
        assets = account_info.get('assets', [])
        
        # Find the specific asset
        token_balance = 0
        for asset in assets:
            if asset['asset-id'] == asa_id:
                token_balance = asset['amount']
                break
        
        # Get asset info for total supply
        try:
            asset_info = algod_client.asset_info(asa_id)
            total_supply = asset_info['params']['total']
            decimals = asset_info['params']['decimals']
            unit_name = asset_info['params']['unit-name']
            asset_name = asset_info['params']['name']
        except:
            total_supply = 0
            decimals = 6
            unit_name = "UNKNOWN"
            asset_name = "Unknown Token"
        
            return jsonify({
            "success": True,
            "asa_id": asa_id,
            "asset_name": asset_name,
            "unit_name": unit_name,
            "decimals": decimals,
            "total_supply": total_supply,
            "total_supply_tokens": total_supply / (10 ** decimals),
            "creator_balance": token_balance,
            "creator_balance_tokens": token_balance / (10 ** decimals),
            "max_tradeable": token_balance / (10 ** decimals),
            "creator_address": creator_address
        })
        
    except Exception as e:
                return jsonify({
                    "success": False,
            "error": str(e)
        }), 500

@app.route('/token-balance/<int:asa_id>', methods=['GET'])
def get_token_balance(asa_id):
    """Get real-time token balance for a specific ASA"""
    try:
        # Get creator account
        private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
        creator_address = account.address_from_private_key(private_key)
        
        # Get account info
        account_info = algod_client.account_info(creator_address)
        assets = account_info.get('assets', [])
        
        # Find the specific asset
        token_balance = 0
        for asset in assets:
            if asset['asset-id'] == asa_id:
                token_balance = asset['amount']
                break
        
        return jsonify({
            "success": True,
            "asa_id": asa_id,
            "balance": token_balance,
            "balance_tokens": token_balance / 1000000,  # Convert to token units
            "creator_address": creator_address
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/tokens', methods=['GET'])
def get_tokens():
    """Get all created tokens"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM tokens ORDER BY created_at DESC
        ''')
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        
        tokens = []
        for row in cursor.fetchall():
            token_dict = dict(zip(columns, row))
            current_price = float(token_dict.get('current_price', 0) or 0)
            total_supply = float(token_dict.get('total_supply', 0) or 0)
            # Always calculate real market cap: current_price * total_supply (real-time, not stored value)
            real_market_cap = current_price * total_supply
            
            tokens.append({
                "asa_id": token_dict.get('asa_id', 0),
                "creator": token_dict.get('creator', ''),
                "creator_address": token_dict.get('creator', ''),
                "token_name": token_dict.get('token_name', ''),
                "token_symbol": token_dict.get('token_symbol', ''),
                "total_supply": total_supply,
                "current_price": current_price,
                "market_cap": real_market_cap,  # Real market cap
                "volume_24h": token_dict.get('volume_24h', 0),
                "holders": token_dict.get('holders', 0),
                "price_change_24h": token_dict.get('price_change_24h', 0),
                "created_at": token_dict.get('created_at', ''),
                "youtube_channel_title": token_dict.get('youtube_channel_title', ''),
                "youtube_subscribers": token_dict.get('youtube_subscribers', 0),
                "video_id": token_dict.get('video_id', ''),
                "video_title": token_dict.get('video_title', ''),
                "platform": token_dict.get('platform', ''),
                "content_url": token_dict.get('content_url', ''),
                "content_id": token_dict.get('content_id', ''),
                "content_description": token_dict.get('content_description', ''),
                "content_thumbnail": token_dict.get('content_thumbnail', '')
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "tokens": tokens
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching tokens: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/trades/<token_identifier>', methods=['GET'])
@handle_errors
def get_trades(token_identifier):
    """Get trade history for a specific token (supports both asa_id int and token_id string)"""
    try:
        timeframe = request.args.get('timeframe', '24h')
        limit = int(request.args.get('limit', 100))
        
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Try to parse as integer (legacy asa_id) or use as string (Aptos token_id)
        try:
            asa_id_int = int(token_identifier)
            # Use asa_id for legacy tokens
            token_query = 'asa_id = ?'
            query_param = asa_id_int
        except ValueError:
            # Use token_id for Aptos tokens (metadata address)
            token_query = 'token_id = ?'
            query_param = token_identifier
        
        # Calculate time filter
        if timeframe == '1h':
            time_filter = "datetime('now', '-1 hour')"
        elif timeframe == '24h':
            time_filter = "datetime('now', '-24 hours')"
        elif timeframe == '7d':
            time_filter = "datetime('now', '-7 days')"
        elif timeframe == '30d':
            time_filter = "datetime('now', '-30 days')"
        else:
            time_filter = "datetime('now', '-1 year')"
        
        # Check if token_id column exists, otherwise fallback to asa_id
        try:
            cursor.execute(f'''
                SELECT trade_type, amount, price, created_at, transaction_id, trader_address
                FROM trades
                WHERE {token_query} AND created_at >= {time_filter}
                ORDER BY created_at DESC
                LIMIT ?
            ''', (query_param, limit))
        except sqlite3.OperationalError:
            # Fallback: if token_id column doesn't exist, try asa_id
            if token_query == 'token_id = ?':
                # Try to find token by token_id in tokens table, then use its asa_id
                cursor.execute('SELECT asa_id FROM tokens WHERE token_id = ?', (token_identifier,))
                token_row = cursor.fetchone()
                if token_row:
                    asa_id_from_token = token_row[0]
                    cursor.execute(f'''
                        SELECT trade_type, amount, price, created_at, transaction_id, trader_address
                        FROM trades
                        WHERE asa_id = ? AND created_at >= {time_filter}
                        ORDER BY created_at DESC
                        LIMIT ?
                    ''', (asa_id_from_token, limit))
                else:
                    # No token found, return empty
                    trades = []
                    conn.close()
                    return jsonify({
                        "success": True,
                        "trades": [],
                        "count": 0
                    })
            else:
                raise
        
        trades = []
        for row in cursor.fetchall():
            trades.append({
                'type': row[0],
                'amount': row[1],
                'price': row[2],
                'timestamp': row[3],
                'transaction_id': row[4],
                'trader_address': row[5]
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "trades": trades,
            "count": len(trades)
        })
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/copy-trading/leaderboard', methods=['GET'])
@handle_errors
def copy_trading_leaderboard():
    """
    Aggregate real trading stats per trader_address from trades table.
    Returns top traders by realized volume with basic performance metrics.
    """
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()

    timeframe = request.args.get('timeframe', '30d')
    limit = int(request.args.get('limit', 20))

    # Time filter
    if timeframe == '7d':
        time_filter = "datetime('now', '-7 days')"
    elif timeframe == '90d':
        time_filter = "datetime('now', '-90 days')"
    elif timeframe == 'all':
        time_filter = "datetime('1970-01-01')"
    else:
        time_filter = "datetime('now', '-30 days')"

    cursor.execute(f'''
        SELECT 
            trader_address,
            COUNT(*) as trade_count,
            SUM(CASE WHEN trade_type = 'buy' THEN total_value ELSE 0 END) as buy_volume,
            SUM(CASE WHEN trade_type = 'sell' THEN total_value ELSE 0 END) as sell_volume,
            COUNT(DISTINCT asa_id) as distinct_tokens,
            MIN(created_at) as first_trade_at,
            MAX(created_at) as last_trade_at
        FROM trades
        WHERE created_at >= {time_filter}
        GROUP BY trader_address
        HAVING trade_count > 0
        ORDER BY sell_volume DESC
        LIMIT ?
    ''', (limit,))

    rows = cursor.fetchall()
    conn.close()

    traders = []
    for row in rows:
        trader_address, trade_count, buy_volume, sell_volume, distinct_tokens, first_trade_at, last_trade_at = row
        buy_volume = buy_volume or 0
        sell_volume = sell_volume or 0
        net_pnl = sell_volume - buy_volume
        roi_pct = (net_pnl / buy_volume * 100) if buy_volume > 0 else 0

        traders.append({
            "trader_address": trader_address,
            "trade_count": trade_count,
            "buy_volume": buy_volume,
            "sell_volume": sell_volume,
            "net_pnl": net_pnl,
            "roi_pct": roi_pct,
            "distinct_tokens": distinct_tokens,
            "first_trade_at": first_trade_at,
            "last_trade_at": last_trade_at
        })

    return jsonify({
        "success": True,
        "traders": traders,
        "count": len(traders)
    })

@app.route('/api/copy-trading/trader/<address>/pnl', methods=['GET'])
@handle_errors
def copy_trading_trader_pnl(address):
    """
    Real P&L over time for a trader based on trades table.
    P&L per day = sells_value - buys_value for that day.
    """
    timeframe = request.args.get('timeframe', '30d')

    if timeframe == '7d':
        time_filter = "datetime('now', '-7 days')"
    elif timeframe == '90d':
        time_filter = "datetime('now', '-90 days')"
    elif timeframe == 'all':
        time_filter = "datetime('1970-01-01')"
    else:
        time_filter = "datetime('now', '-30 days')"

    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()

    cursor.execute(f'''
        SELECT 
            DATE(created_at) as day,
            SUM(CASE WHEN trade_type = 'sell' THEN total_value ELSE 0 END) -
            SUM(CASE WHEN trade_type = 'buy' THEN total_value ELSE 0 END) as pnl
        FROM trades
        WHERE trader_address = ? AND created_at >= {time_filter}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    ''', (address,))

    rows = cursor.fetchall()
    conn.close()

    points = [{"day": day, "pnl": pnl or 0} for (day, pnl) in rows]

    return jsonify({
        "success": True,
        "points": points
    })

@app.route('/api/copy-trading/trader/<address>/analytics', methods=['GET'])
@handle_errors
def copy_trading_trader_analytics(address):
    """
    Comprehensive trader analytics similar to GMGN.AI
    Calculates win rate, P&L distribution, token distribution, etc.
    """
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()

    # Get all trades for this trader
    cursor.execute('''
        SELECT 
            t.trade_type,
            t.amount,
            t.price,
            t.total_value,
            t.created_at,
            t.transaction_id,
            t.asa_id,
            tk.token_name,
            tk.token_symbol,
            tk.current_price,
            tk.market_cap
        FROM trades t
        LEFT JOIN tokens tk ON t.asa_id = tk.asa_id
        WHERE t.trader_address = ?
        ORDER BY t.created_at DESC
    ''', (address,))

    all_trades = cursor.fetchall()
    
    # Calculate 7D metrics
    from datetime import datetime, timedelta
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    trades_7d = []
    for t in all_trades:
        try:
            # Handle different datetime formats
            trade_time_str = t[4]
            if 'T' in trade_time_str:
                # ISO format: 2025-11-27T14:08:30 or 2025-11-27T14:08:30.123456
                trade_time_str = trade_time_str.split('.')[0]  # Remove microseconds
                if '+' not in trade_time_str and 'Z' not in trade_time_str:
                    trade_time_str += '+00:00'
                elif 'Z' in trade_time_str:
                    trade_time_str = trade_time_str.replace('Z', '+00:00')
                trade_time = datetime.fromisoformat(trade_time_str)
            else:
                # SQLite format: 2025-11-27 14:08:30
                trade_time = datetime.strptime(trade_time_str, '%Y-%m-%d %H:%M:%S')
            
            if trade_time >= seven_days_ago:
                trades_7d.append(t)
        except Exception as e:
            logger.warning(f"Could not parse trade time {t[4]}: {e}")
            # Include it anyway if we can't parse
            trades_7d.append(t)
    
    # Calculate realized P&L per token
    token_pnl = {}
    token_buys = {}
    token_sells = {}
    
    for trade in all_trades:
        asa_id = trade[6]
        trade_type = trade[0]
        total_value = trade[3] or 0
        
        if asa_id not in token_pnl:
            token_pnl[asa_id] = 0
            token_buys[asa_id] = 0
            token_sells[asa_id] = 0
        
        if trade_type == 'buy':
            token_buys[asa_id] += total_value
            token_pnl[asa_id] -= total_value
        else:  # sell
            token_sells[asa_id] += total_value
            token_pnl[asa_id] += total_value
    
    # Calculate win rate (tokens with positive P&L)
    winning_tokens = sum(1 for pnl in token_pnl.values() if pnl > 0)
    total_tokens_traded = len(token_pnl)
    win_rate = (winning_tokens / total_tokens_traded * 100) if total_tokens_traded > 0 else 0
    
    # 7D metrics
    buys_7d = sum(t[3] or 0 for t in trades_7d if t[0] == 'buy')
    sells_7d = sum(t[3] or 0 for t in trades_7d if t[0] == 'sell')
    sell_count_7d = len([t for t in trades_7d if t[0] == 'sell'])
    realized_pnl_7d = sells_7d - buys_7d
    pnl_pct_7d = (realized_pnl_7d / buys_7d * 100) if buys_7d > 0 else 0
    
    # Total P&L
    total_buys = sum(token_buys.values())
    total_sells = sum(token_sells.values())
    total_pnl = total_sells - total_buys
    total_pnl_pct = (total_pnl / total_buys * 100) if total_buys > 0 else 0
    
    # Calculate average duration (simplified - time between first buy and last sell per token)
    token_durations = []
    for asa_id in token_pnl.keys():
        token_trades = [t for t in all_trades if t[6] == asa_id]
        if len(token_trades) >= 2:
            first_trade = min(token_trades, key=lambda x: x[4])
            last_trade = max(token_trades, key=lambda x: x[4])
            try:
                first_time = datetime.fromisoformat(first_trade[4].replace('Z', '+00:00').split('.')[0])
                last_time = datetime.fromisoformat(last_trade[4].replace('Z', '+00:00').split('.')[0])
                duration = (last_time - first_time).total_seconds() / 60  # minutes
                token_durations.append(duration)
            except:
                pass
    
    avg_duration_min = sum(token_durations) / len(token_durations) if token_durations else 0
    
    # P&L distribution (calculate ROI per token)
    pnl_distribution = {
        'gt_500': 0,
        '200_500': 0,
        '0_200': 0,
        'neg_50_0': 0,
        'lt_neg_50': 0
    }
    
    for asa_id, pnl in token_pnl.items():
        buy_amount = token_buys.get(asa_id, 0)
        if buy_amount > 0:
            roi_pct = (pnl / buy_amount) * 100
            if roi_pct > 500:
                pnl_distribution['gt_500'] += 1
            elif roi_pct >= 200:
                pnl_distribution['200_500'] += 1
            elif roi_pct > 0:
                pnl_distribution['0_200'] += 1
            elif roi_pct >= -50:
                pnl_distribution['neg_50_0'] += 1
            else:
                pnl_distribution['lt_neg_50'] += 1
    
    # Get actual holdings from Algorand blockchain
    holdings = []
    unrealized_total = 0
    try:
        account_info = algod_client.account_info(address)
        assets = account_info.get('assets', [])
        
        # Get token info from database
        cursor.execute('SELECT asa_id, token_name, token_symbol, current_price, market_cap FROM tokens')
        token_info_map = {row[0]: row for row in cursor.fetchall()}
        
        for asset in assets:
            asa_id = asset['asset-id']
            # Get decimals from asset info or default to 6
            try:
                asset_info = algod_client.asset_info(asa_id)
                decimals = asset_info['params'].get('decimals', 6)
            except:
                decimals = 6
            balance = asset['amount'] / (10 ** decimals)  # Convert to token units
            
            if balance > 0:
                # Get token info from database or use defaults
                if asa_id in token_info_map:
                    token_info = token_info_map[asa_id]
                    current_price = token_info[3] or 0
                    market_cap = token_info[4] or 0
                    token_name = token_info[1] or f"Token {asa_id}"
                    token_symbol = token_info[2] or f"ASA{asa_id}"
                else:
                    # Token not in our database, use defaults
                    current_price = 0
                    market_cap = 0
                    token_name = f"Token {asa_id}"
                    token_symbol = f"ASA{asa_id}"
                
                total_value = balance * current_price
                
                # Calculate average buy price for this token
                token_buy_trades = [t for t in all_trades if t[6] == asa_id and t[0] == 'buy']
                if token_buy_trades and len(token_buy_trades) > 0:
                    total_buy_value = sum(t[3] or 0 for t in token_buy_trades)
                    total_buy_amount = sum(t[1] for t in token_buy_trades)
                    if total_buy_amount > 0 and current_price > 0:
                        avg_buy_price = total_buy_value / total_buy_amount
                        # Only calculate if we have valid prices
                        if avg_buy_price > 0 and current_price > 0:
                            unrealized_pnl = (current_price - avg_buy_price) * balance
                            unrealized_total += unrealized_pnl
                        else:
                            unrealized_pnl = 0
                    else:
                        unrealized_pnl = 0
                else:
                    unrealized_pnl = 0
                
                holdings.append({
                    "asa_id": asa_id,
                    "token_name": token_name,
                    "token_symbol": token_symbol,
                    "current_price": current_price,
                    "market_cap": market_cap,
                    "amount": balance,
                    "total_value": total_value,
                    "unrealized_pnl": unrealized_pnl
                })
    except Exception as e:
        logger.warning(f"Could not fetch on-chain holdings for {address}: {e}")
        # Fallback to trade-based calculation
        for asa_id, pnl in token_pnl.items():
            if token_buys.get(asa_id, 0) > token_sells.get(asa_id, 0):
                token_info = next((t for t in all_trades if t[6] == asa_id), None)
                if token_info:
                    holdings.append({
                        "asa_id": asa_id,
                        "token_name": token_info[7] or f"Token {asa_id}",
                        "token_symbol": token_info[8] or f"ASA{asa_id}",
                        "current_price": token_info[9] or 0,
                        "market_cap": token_info[10] or 0,
                        "amount": (token_buys.get(asa_id, 0) - token_sells.get(asa_id, 0)) / (token_info[9] or 1),
                        "total_value": token_buys.get(asa_id, 0) - token_sells.get(asa_id, 0),
                        "unrealized_pnl": 0
                    })
    
    conn.close()
    
    return jsonify({
        "success": True,
        "analytics": {
            "realized_pnl_7d": realized_pnl_7d,
            "realized_pnl_7d_pct": pnl_pct_7d,
            "win_rate": win_rate,
            "total_pnl": total_pnl,
            "total_pnl_pct": total_pnl_pct,
            "unrealized_profits": unrealized_total,
            "trades_7d": len(trades_7d),
            "tokens_traded_7d": len(set(t[6] for t in trades_7d)),
            "avg_duration_min": avg_duration_min,
            "total_cost_7d": buys_7d,
            "avg_cost": buys_7d / len(trades_7d) if trades_7d and len(trades_7d) > 0 else 0,
            "avg_sold": sells_7d / sell_count_7d if sell_count_7d > 0 else 0,
            "avg_realized_profits": realized_pnl_7d / sell_count_7d if sell_count_7d > 0 else 0,
            "fees_7d": sum(t[3] or 0 for t in trades_7d) * 0.02,  # 2% platform fee estimate
            "volume_7d": buys_7d + sells_7d,
            "total_tokens_traded": total_tokens_traded,
            "pnl_distribution": pnl_distribution,
            "holdings": holdings[:20]  # Top 20 holdings
        }
    })

@app.route('/api/copy-trading/trader/<address>/trades', methods=['GET'])
@handle_errors
def copy_trading_trader_trades(address):
    """
    Detailed trade history for a trader with token metadata.
    Real data from trades + tokens tables.
    """
    limit = int(request.args.get('limit', 100))

    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()

    cursor.execute('''
        SELECT 
            t.trade_type,
            t.amount,
            t.price,
            t.total_value,
            t.created_at,
            t.transaction_id,
            t.asa_id,
            tk.token_name,
            tk.token_symbol
        FROM trades t
        LEFT JOIN tokens tk ON t.asa_id = tk.asa_id
        WHERE t.trader_address = ?
        ORDER BY t.created_at DESC
        LIMIT ?
    ''', (address, limit))

    rows = cursor.fetchall()
    conn.close()

    trades = []
    for row in rows:
        trades.append({
            "trade_type": row[0],
            "amount": row[1],
            "price": row[2],
            "total_value": row[3],
            "created_at": row[4],
            "transaction_id": row[5],
            "asa_id": row[6],
            "token_name": row[7],
            "token_symbol": row[8],
        })

    return jsonify({
        "success": True,
        "trades": trades,
        "count": len(trades)
    })

@app.route('/api/portfolio/<address>', methods=['GET'])
@handle_errors
def get_portfolio(address):
    """
    Aggregate real holdings per token for a wallet based on trades.
    This is a simple on-chain-like portfolio view using our trades ledger.
    """
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()

    # Sum net token amounts per ASA (buys - sells)
    cursor.execute('''
        SELECT 
            t.asa_id,
            tk.token_name,
            tk.token_symbol,
            tk.current_price,
            SUM(CASE WHEN t.trade_type = 'buy' THEN t.amount ELSE -t.amount END) as net_amount
        FROM trades t
        LEFT JOIN tokens tk ON t.asa_id = tk.asa_id
        WHERE t.trader_address = ?
        GROUP BY t.asa_id
        HAVING net_amount > 0
    ''', (address,))

    rows = cursor.fetchall()
    conn.close()

    holdings = []
    total_value = 0
    for row in rows:
        asa_id, token_name, token_symbol, current_price, net_amount = row
        current_price = current_price or 0
        value = (net_amount or 0) * current_price
        total_value += value
        holdings.append({
            "asa_id": asa_id,
            "token_name": token_name,
            "token_symbol": token_symbol,
            "current_price": current_price,
            "balance": net_amount or 0,
            "value": value
        })

    return jsonify({
        "success": True,
        "holdings": holdings,
        "total_value": total_value
    })

@app.route('/api/copy-trading/profiles', methods=['POST', 'GET'])
@handle_errors
def copy_trading_profiles():
    """
    Manage copy trading profiles (real configs, no auto-execution yet).
    POST: create/update profile
    GET: list profiles for follower or leader
    """
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.json or {}
        leader = data.get('leader_address')
        follower = data.get('follower_address')
        allocation = float(data.get('allocation_percent', 0))
        max_single_trade_algo = float(data.get('max_single_trade_algo', 0))
        copy_type = data.get('copy_type', 'proportional')
        risk_level = data.get('risk_level', 'balanced')

        if not leader or not follower:
            return jsonify({"success": False, "error": "leader_address and follower_address are required"}), 400

        cursor.execute('''
            INSERT INTO copy_profiles
            (leader_address, follower_address, allocation_percent, max_single_trade_algo, copy_type, risk_level, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        ''', (leader, follower, allocation, max_single_trade_algo, copy_type, risk_level))

        conn.commit()
        conn.close()

        return jsonify({"success": True})

    # GET
    follower = request.args.get('follower_address')
    leader = request.args.get('leader_address')

    query = 'SELECT leader_address, follower_address, allocation_percent, max_single_trade_algo, copy_type, risk_level, status, created_at FROM copy_profiles WHERE 1=1'
    params = []
    if follower:
        query += ' AND follower_address = ?'
        params.append(follower)
    if leader:
        query += ' AND leader_address = ?'
        params.append(leader)

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    profiles = []
    for row in rows:
        profiles.append({
            "leader_address": row[0],
            "follower_address": row[1],
            "allocation_percent": row[2],
            "max_single_trade_algo": row[3],
            "copy_type": row[4],
            "risk_level": row[5],
            "status": row[6],
            "created_at": row[7]
        })

    return jsonify({
        "success": True,
        "profiles": profiles
    })

@app.route('/api/bot-strategies', methods=['GET', 'POST'])
@handle_errors
def bot_strategies():
    """
    Store and list engagement-based bot strategies.
    Execution is not automatic; these are configs only.
    """
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.json or {}
        owner_address = data.get('owner_address')
        label = data.get('label')
        token_symbol = data.get('token_symbol')
        metric_type = data.get('metric_type', 'likes')
        condition = data.get('condition', '')
        action = data.get('action', '')

        if not owner_address or not label or not condition or not action:
            return jsonify({"success": False, "error": "owner_address, label, condition and action are required"}), 400

        cursor.execute('''
            INSERT INTO bot_strategies
            (owner_address, label, token_symbol, metric_type, condition, action, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        ''', (owner_address, label, token_symbol, metric_type, condition, action))

        conn.commit()
        conn.close()

        return jsonify({"success": True})

    # GET
    owner_address = request.args.get('owner_address')
    cursor.execute('''
        SELECT id, owner_address, label, asa_id, token_symbol, metric_type, condition, action, status, created_at
        FROM bot_strategies
        WHERE (? IS NULL OR owner_address = ?)
        ORDER BY created_at DESC
    ''', (owner_address, owner_address))

    rows = cursor.fetchall()
    conn.close()

    strategies = []
    for row in rows:
        strategies.append({
            "id": row[0],
            "owner_address": row[1],
            "label": row[2],
            "asa_id": row[3],
            "token_symbol": row[4],
            "metric_type": row[5],
            "condition": row[6],
            "action": row[7],
            "status": row[8],
            "created_at": row[9]
        })

    return jsonify({
        "success": True,
        "strategies": strategies
    })

@app.route('/api/bot-strategies/<int:strategy_id>/executions', methods=['GET'])
@handle_errors
def get_strategy_executions(strategy_id):
    """Get all trades executed by a strategy"""
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            se.id,
            se.trader_address,
            se.asa_id,
            se.trade_type,
            se.amount,
            se.price,
            se.total_value,
            se.pnl,
            se.executed_at,
            t.token_name,
            t.token_symbol
        FROM strategy_executions se
        LEFT JOIN tokens t ON se.asa_id = t.asa_id
        WHERE se.strategy_id = ?
        ORDER BY se.executed_at DESC
        LIMIT 100
    ''', (strategy_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    executions = []
    total_pnl = 0
    for row in rows:
        executions.append({
            "id": row[0],
            "trader_address": row[1],
            "asa_id": row[2],
            "trade_type": row[3],
            "amount": row[4],
            "price": row[5],
            "total_value": row[6],
            "pnl": row[7] or 0,
            "executed_at": row[8],
            "token_name": row[9] or f"Token {row[2]}",
            "token_symbol": row[10] or f"ASA{row[2]}"
        })
        total_pnl += row[7] or 0
    
    return jsonify({
        "success": True,
        "executions": executions,
        "total_executions": len(executions),
        "total_pnl": total_pnl
    })

@app.route('/api/bot-strategies/<int:strategy_id>/execute', methods=['POST'])
@cross_origin(supports_credentials=True)
@handle_errors
def execute_strategy(strategy_id):
    """Execute a strategy trade (called from frontend after Pera Wallet confirmation)"""
    data = request.get_json()
    trader_address = data.get('trader_address')
    asa_id = data.get('asa_id')
    trade_type = data.get('trade_type')  # 'buy' or 'sell'
    amount = data.get('amount')
    price = data.get('price')
    total_value = data.get('total_value')
    
    if not all([trader_address, asa_id, trade_type, amount, price, total_value]):
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()
    
    # Record the execution
    cursor.execute('''
        INSERT INTO strategy_executions
        (strategy_id, trader_address, asa_id, trade_type, amount, price, total_value, pnl)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ''', (strategy_id, trader_address, asa_id, trade_type, amount, price, total_value))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "success": True,
        "message": "Strategy execution recorded"
    })

@app.route('/api/referrals/generate-code', methods=['POST'])
@handle_errors
def generate_referral_code():
    """Generate a unique referral code for a user"""
    data = request.get_json()
    referrer_address = data.get('referrer_address')
    
    if not referrer_address:
        return jsonify({"success": False, "error": "referrer_address is required"}), 400
    
    import secrets
    import string
    
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()
    
    # Check if user already has a code
    cursor.execute('SELECT referral_code FROM referrals WHERE referrer_address = ? AND referrer_address = referred_address LIMIT 1', (referrer_address,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return jsonify({
            "success": True,
            "referral_code": existing[0]
        })
    
    # Generate 8-character alphanumeric code
    code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    # Check if code already exists
    cursor.execute('SELECT id FROM referrals WHERE referral_code = ?', (code,))
    while cursor.fetchone():
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        cursor.execute('SELECT id FROM referrals WHERE referral_code = ?', (code,))
    
    # Create self-referral entry for code generation
    cursor.execute('''
        INSERT INTO referrals (referrer_address, referred_address, referral_code, total_earnings, total_trades_count, total_volume)
        VALUES (?, ?, ?, 0, 0, 0)
    ''', (referrer_address, referrer_address, code))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "success": True,
        "referral_code": code
    })

@app.route('/api/referrals/register', methods=['POST'])
@handle_errors
def register_referral():
    """Register a new referral relationship"""
    data = request.get_json()
    referral_code = data.get('referral_code')
    referred_address = data.get('referred_address')
    
    if not referral_code or not referred_address:
        return jsonify({"success": False, "error": "referral_code and referred_address are required"}), 400
    
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()
    
    # Check if already referred
    cursor.execute('SELECT id FROM referrals WHERE referred_address = ?', (referred_address,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "error": "Address already has a referrer"}), 400
    
    # Find referrer by code (look for someone who has this code as their own)
    cursor.execute('SELECT referrer_address FROM referrals WHERE referral_code = ? AND referrer_address = referred_address LIMIT 1', (referral_code,))
    referrer_row = cursor.fetchone()
    
    if not referrer_row:
        conn.close()
        return jsonify({"success": False, "error": "Invalid referral code"}), 400
    
    referrer_address = referrer_row[0]
    
    # Don't allow self-referral
    if referrer_address == referred_address:
        conn.close()
        return jsonify({"success": False, "error": "Cannot refer yourself"}), 400
    
    # Register the referral
    cursor.execute('''
        INSERT INTO referrals (referrer_address, referred_address, referral_code, total_earnings, total_trades_count, total_volume)
        VALUES (?, ?, ?, 0, 0, 0)
    ''', (referrer_address, referred_address, referral_code))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "success": True,
        "referrer_address": referrer_address,
        "message": "Referral registered successfully"
    })

@app.route('/api/referrals/earnings/<address>', methods=['GET'])
@handle_errors
def get_referral_earnings(address):
    """Get referral earnings for a referrer"""
    conn = sqlite3.connect('creatorvault.db')
    cursor = conn.cursor()
    
    # Get total earnings from referral_earnings table (more accurate)
    cursor.execute('''
        SELECT 
            COALESCE(SUM(earnings), 0) as total_earnings,
            COUNT(DISTINCT trade_id) as total_trades,
            COALESCE(SUM(trade_value), 0) as total_volume,
            COUNT(DISTINCT referred_address) as total_referrals
        FROM referral_earnings
        WHERE referrer_address = ?
    ''', (address,))
    
    row = cursor.fetchone()
    total_earnings = row[0] or 0
    total_trades = row[1] or 0
    total_volume = row[2] or 0
    total_referrals = row[3] or 0
    
    # Get referral code (where user is the referrer and has their own code)
    cursor.execute('SELECT referral_code FROM referrals WHERE referrer_address = ? AND referrer_address = referred_address LIMIT 1', (address,))
    code_row = cursor.fetchone()
    referral_code = code_row[0] if code_row else None
    
    # Get detailed earnings
    cursor.execute('''
        SELECT 
            re.referred_address,
            re.earnings,
            re.trade_value,
            re.created_at,
            COALESCE(tokens.token_symbol, 'N/A') as token_symbol,
            COALESCE(t.trade_type, 'N/A') as trade_type
        FROM referral_earnings re
        LEFT JOIN trades t ON re.trade_id = t.id
        LEFT JOIN tokens ON t.asa_id = tokens.asa_id
        WHERE re.referrer_address = ?
        ORDER BY re.created_at DESC
        LIMIT 100
    ''', (address,))
    
    earnings_history = []
    for row in cursor.fetchall():
        earnings_history.append({
            "referred_address": row[0],
            "earnings": row[1] or 0,
            "trade_value": row[2] or 0,
            "created_at": row[3],
            "token_symbol": row[4] or "N/A",
            "trade_type": row[5] or "N/A"
        })
    
    # Get list of referrals with aggregated stats from referral_earnings
    cursor.execute('''
        SELECT 
            re.referred_address,
            COALESCE(SUM(re.earnings), 0) as total_earnings,
            COUNT(DISTINCT re.trade_id) as total_trades,
            COALESCE(SUM(re.trade_value), 0) as total_volume,
            MIN(re.created_at) as joined_at
        FROM referral_earnings re
        WHERE re.referrer_address = ?
        GROUP BY re.referred_address
        ORDER BY joined_at DESC
    ''', (address,))
    
    referrals_list = []
    for row in cursor.fetchall():
        referrals_list.append({
            "referred_address": row[0],
            "total_earnings": row[1] or 0,
            "total_trades": row[2] or 0,
            "total_volume": row[3] or 0,
            "joined_at": row[4]
        })
    
    # If no referrals from earnings table, check referrals table for registered users
    if not referrals_list:
        cursor.execute('''
            SELECT 
                referred_address,
                COALESCE(total_earnings, 0) as total_earnings,
                COALESCE(total_trades_count, 0) as total_trades,
                COALESCE(total_volume, 0) as total_volume,
                created_at as joined_at
            FROM referrals
            WHERE referrer_address = ? AND referred_address != referrer_address
            ORDER BY created_at DESC
        ''', (address,))
        
        for row in cursor.fetchall():
            referrals_list.append({
                "referred_address": row[0],
                "total_earnings": row[1] or 0,
                "total_trades": row[2] or 0,
                "total_volume": row[3] or 0,
                "joined_at": row[4]
            })
    
    conn.close()
    
    return jsonify({
        "success": True,
        "referral_code": referral_code,
        "total_earnings": total_earnings,
        "total_trades": total_trades,
        "total_volume": total_volume,
        "total_referrals": total_referrals,
        "earnings_history": earnings_history,
        "referrals": referrals_list
    })

@app.route('/api/token/<int:asa_id>', methods=['GET'])
@handle_errors
def get_token_details(asa_id):
    """Get detailed token information including bonding curve state"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM tokens WHERE asa_id = ?', (asa_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"success": False, "error": "Token not found"}), 404
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        token_dict = dict(zip(columns, row))
        
        # Parse bonding curve if available
        bonding_curve_config = None
        bonding_curve_state = None
        if token_dict.get('bonding_curve_config'):
            try:
                bonding_curve_config = json.loads(token_dict['bonding_curve_config'])
            except:
                pass
        if token_dict.get('bonding_curve_state'):
            try:
                bonding_curve_state = json.loads(token_dict['bonding_curve_state'])
            except:
                pass
        
        # Get recent trades count
        cursor.execute('SELECT COUNT(*) FROM trades WHERE asa_id = ?', (asa_id,))
        trade_count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            "success": True,
            "token": {
                **token_dict,
                "bonding_curve_config": bonding_curve_config,
                "bonding_curve_state": bonding_curve_state,
                "trade_count": trade_count
            }
        })
    except Exception as e:
        logger.error(f"Error fetching token details: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/user-tokens/<address>', methods=['GET'])
@handle_errors
def get_user_tokens(address):
    """Get all tokens created by a specific wallet address"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM tokens WHERE creator = ? ORDER BY created_at DESC
        ''', (address,))
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        
        tokens = []
        for row in cursor.fetchall():
            token_dict = dict(zip(columns, row))
            tokens.append({
                "asa_id": token_dict.get('asa_id', 0),
                "token_name": token_dict.get('token_name', ''),
                "token_symbol": token_dict.get('token_symbol', ''),
                "total_supply": token_dict.get('total_supply', 0),
                "current_price": token_dict.get('current_price', 0),
                "market_cap": token_dict.get('market_cap', 0),
                "volume_24h": token_dict.get('volume_24h', 0),
                "holders": token_dict.get('holders', 0),
                "price_change_24h": token_dict.get('price_change_24h', 0),
                "created_at": token_dict.get('created_at', ''),
                "platform": token_dict.get('platform', ''),
                "content_url": token_dict.get('content_url', ''),
                "content_thumbnail": token_dict.get('content_thumbnail', ''),
                "youtube_channel_title": token_dict.get('youtube_channel_title', '')
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "tokens": tokens
        })
    except Exception as e:
        logger.error(f"Error fetching user tokens: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/creator-earnings/<address>', methods=['GET'])
@handle_errors
def get_creator_earnings(address):
    """Get total earnings for a creator from trading fees"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()

        # Get all tokens created by this address
        cursor.execute('SELECT asa_id, token_name, token_symbol FROM tokens WHERE creator = ?', (address,))
        creator_tokens = cursor.fetchall()
        
        total_earnings = 0
        earnings_by_token = []

        for asa_id, token_name, token_symbol in creator_tokens:
            # Sum creator fees for this token
            cursor.execute('SELECT SUM(creator_fee) FROM trades WHERE asa_id = ?', (asa_id,))
            token_fee_sum = cursor.fetchone()[0] or 0
            total_earnings += token_fee_sum
            earnings_by_token.append({
                "asa_id": asa_id,
                "token_name": token_name,
                "token_symbol": token_symbol,
                "earned_algo": token_fee_sum
            })
        
        conn.close()

        return jsonify({
            "success": True,
            "total_earnings": total_earnings,
            "earnings_by_token": earnings_by_token,
            "creator_fee_rate": 0.05,  # 5%
            "platform_fee_rate": 0.02  # 2%
        })
    except Exception as e:
        logger.error(f"Error fetching creator earnings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bonding-curve/buy', methods=['POST'])
@handle_errors
def bonding_curve_buy():
    """Buy tokens using bonding curve"""
    if BondingCurve is None:
        return jsonify({"success": False, "error": "Bonding curve not available"}), 500
    
    try:
        data = request.get_json()
        asa_id = data.get('asa_id')
        token_amount = float(data.get('token_amount', 0))
        trader_address = data.get('trader_address')
        
        if not asa_id or not token_amount or not trader_address:
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT bonding_curve_config, bonding_curve_state, current_price FROM tokens WHERE asa_id = ?', (asa_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"success": False, "error": "Token not found"}), 404
        
        bonding_curve_config_json, bonding_curve_state_json, current_price = row
        
        if not bonding_curve_config_json or not bonding_curve_state_json:
            return jsonify({"success": False, "error": "Bonding curve not initialized"}), 400
        
        curve = BondingCurve.from_dict(json.loads(bonding_curve_config_json))
        state = BondingCurveState.from_dict(json.loads(bonding_curve_state_json))
        
        result = curve.calculate_buy_price(state.token_supply, state.algo_reserve, token_amount)
        new_state = BondingCurveState(token_supply=result['new_supply'], algo_reserve=result['new_algo_reserve'])
        
        # Calculate trading fees (5% creator fee, 2% platform fee)
        CREATOR_FEE_RATE = 0.05  # 5%
        PLATFORM_FEE_RATE = 0.02  # 2%
        REFERRAL_FEE_RATE = 0.0001  # 0.01%
        total_value = result['algo_cost']
        creator_fee = total_value * CREATOR_FEE_RATE
        platform_fee = total_value * PLATFORM_FEE_RATE
        
        # Check for referral and calculate referral earnings
        referral_earnings = 0
        referral_code = None
        cursor.execute('SELECT referrer_address, referral_code FROM referrals WHERE referred_address = ?', (trader_address,))
        referral_row = cursor.fetchone()
        if referral_row:
            referrer_address, referral_code = referral_row
            referral_earnings = total_value * REFERRAL_FEE_RATE
            # Update referral stats
            cursor.execute('''
                UPDATE referrals 
                SET total_earnings = total_earnings + ?,
                    total_trades_count = total_trades_count + 1,
                    total_volume = total_volume + ?
                WHERE referred_address = ?
            ''', (referral_earnings, total_value, trader_address))
        
        # Get creator address from token
        cursor.execute('SELECT creator FROM tokens WHERE asa_id = ?', (asa_id,))
        creator_row = cursor.fetchone()
        creator_address = creator_row[0] if creator_row else None
        
        # Transfer tokens from creator to buyer
        # NOTE: This only works if the token creator is the backend wallet
        # For user-created tokens, the creator needs to manually transfer or use a smart contract
        token_transfer_txid = None
        if creator_address:
            try:
                # Use creator's private key to transfer tokens
                creator_private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
                creator_wallet_address = account.address_from_private_key(creator_private_key)
                
                # Only transfer if creator wallet matches token creator
                if creator_wallet_address == creator_address:
                    sp = algod_client.suggested_params()
                    # Convert token amount to integer (no decimals)
                    token_amount_int = int(token_amount)
                    
                    # Create asset transfer transaction
                    asset_txn = transaction.AssetTransferTxn(
                        sender=creator_address,
                        sp=sp,
                        receiver=trader_address,
                        amt=token_amount_int,
                        index=int(asa_id)
                    )
                    
                    # Sign and send
                    signed_asset = asset_txn.sign(creator_private_key)
                    token_transfer_txid = algod_client.send_transaction(signed_asset)
                    logger.info(f"✅ Token transfer sent: {token_transfer_txid} (ASA {asa_id}, {token_amount_int} tokens to {trader_address})")
                else:
                    logger.warning(f"⚠️ Token creator ({creator_address}) doesn't match backend wallet ({creator_wallet_address}). Creator must manually transfer tokens or use smart contract.")
            except Exception as e:
                logger.error(f"Error transferring tokens: {e}")
                # Continue even if transfer fails - user already paid APTOS
        
        cursor.execute('UPDATE tokens SET bonding_curve_state = ?, current_price = ?, market_cap = ? WHERE asa_id = ?',
                      (json.dumps(new_state.to_dict()), result['new_price'], result['new_supply'] * result['new_price'], asa_id))
        cursor.execute('INSERT INTO trades (asa_id, trader_address, trade_type, amount, price, transaction_id, creator_fee, platform_fee, total_value, referral_code, referral_earnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      (asa_id, trader_address, 'buy', token_amount, result['new_price'], data.get('transaction_id', ''), creator_fee, platform_fee, total_value, referral_code, referral_earnings))
        
        # Record referral earnings if applicable
        if referral_row and referral_earnings > 0:
            trade_id = cursor.lastrowid
            cursor.execute('''
                INSERT INTO referral_earnings (referrer_address, referred_address, trade_id, earnings, trade_value)
                VALUES (?, ?, ?, ?, ?)
            ''', (referrer_address, trader_address, trade_id, referral_earnings, total_value))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "algo_cost": result['algo_cost'],
            "token_amount": token_amount,
            "new_price": result['new_price'],
            "price_impact": ((result['new_price'] - current_price) / current_price) * 100 if current_price > 0 else 0,
            "token_transfer_txid": token_transfer_txid
        })
    except Exception as e:
        logger.error(f"Error in bonding curve buy: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bonding-curve/sell', methods=['POST'])
@handle_errors
def bonding_curve_sell():
    """Sell tokens using bonding curve"""
    if BondingCurve is None:
        return jsonify({"success": False, "error": "Bonding curve not available"}), 500
    
    try:
        data = request.get_json()
        asa_id = data.get('asa_id')
        token_amount = float(data.get('token_amount', 0))
        trader_address = data.get('trader_address')
        
        if not asa_id or not token_amount or not trader_address:
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT bonding_curve_config, bonding_curve_state, current_price FROM tokens WHERE asa_id = ?', (asa_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"success": False, "error": "Token not found"}), 404
        
        bonding_curve_config_json, bonding_curve_state_json, current_price = row
        
        if not bonding_curve_config_json or not bonding_curve_state_json:
            return jsonify({"success": False, "error": "Bonding curve not initialized"}), 400
        
        curve = BondingCurve.from_dict(json.loads(bonding_curve_config_json))
        state = BondingCurveState.from_dict(json.loads(bonding_curve_state_json))
        
        result = curve.calculate_sell_price(state.token_supply, state.algo_reserve, token_amount)
        new_state = BondingCurveState(token_supply=result['new_supply'], algo_reserve=result['new_algo_reserve'])
        
        # Calculate trading fees (5% creator fee, 2% platform fee)
        CREATOR_FEE_RATE = 0.05  # 5%
        PLATFORM_FEE_RATE = 0.02  # 2%
        total_value = result['algo_received']
        creator_fee = total_value * CREATOR_FEE_RATE
        platform_fee = total_value * PLATFORM_FEE_RATE
        
        # Check for referral and calculate referral earnings
        referral_earnings = 0
        referral_code = None
        cursor.execute('SELECT referrer_address, referral_code FROM referrals WHERE referred_address = ?', (trader_address,))
        referral_row = cursor.fetchone()
        if referral_row:
            referrer_address, referral_code = referral_row
            REFERRAL_FEE_RATE = 0.0001  # 0.01%
            referral_earnings = total_value * REFERRAL_FEE_RATE
            cursor.execute('''
                UPDATE referrals 
                SET total_earnings = total_earnings + ?,
                    total_trades_count = total_trades_count + 1,
                    total_volume = total_volume + ?
                WHERE referred_address = ?
            ''', (referral_earnings, total_value, trader_address))
        
        cursor.execute('UPDATE tokens SET bonding_curve_state = ?, current_price = ?, market_cap = ? WHERE asa_id = ?',
                      (json.dumps(new_state.to_dict()), result['new_price'], result['new_supply'] * result['new_price'], asa_id))
        cursor.execute('INSERT INTO trades (asa_id, trader_address, trade_type, amount, price, transaction_id, creator_fee, platform_fee, total_value, referral_code, referral_earnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      (asa_id, trader_address, 'sell', token_amount, result['new_price'], data.get('transaction_id', ''), creator_fee, platform_fee, total_value, referral_code, referral_earnings))
        
        # Record referral earnings if applicable
        if referral_row and referral_earnings > 0:
            trade_id = cursor.lastrowid
            cursor.execute('''
                INSERT INTO referral_earnings (referrer_address, referred_address, trade_id, earnings, trade_value)
                VALUES (?, ?, ?, ?, ?)
            ''', (referrer_address, trader_address, trade_id, referral_earnings, total_value))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "algo_received": result['algo_received'],
            "token_amount": token_amount,
            "new_price": result['new_price'],
            "price_impact": ((current_price - result['new_price']) / current_price) * 100 if current_price > 0 else 0
        })
    except Exception as e:
        logger.error(f"Error in bonding curve sell: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bonding-curve/estimate', methods=['POST'])
@handle_errors
def bonding_curve_estimate():
    """Estimate trade without executing"""
    if BondingCurve is None:
        return jsonify({"success": False, "error": "Bonding curve not available"}), 500
    
    try:
        data = request.get_json()
        asa_id = data.get('asa_id')
        token_amount = float(data.get('token_amount', 0))
        trade_type = data.get('trade_type', 'buy')
        
        if not asa_id:
            return jsonify({"success": False, "error": "Missing asa_id"}), 400
        
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT bonding_curve_config, bonding_curve_state, current_price, total_supply FROM tokens WHERE asa_id = ?', (asa_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "Token not found"}), 404
        
        bonding_curve_config_json, bonding_curve_state_json, current_price, total_supply = row
        
        # Initialize bonding curve if missing or empty
        if (not bonding_curve_config_json or not bonding_curve_state_json or 
            (isinstance(bonding_curve_config_json, str) and bonding_curve_config_json.strip() == '') or
            (isinstance(bonding_curve_state_json, str) and bonding_curve_state_json.strip() == '')):
            logger.warning(f"Bonding curve not initialized for token {asa_id}, initializing now...")
            initial_price = current_price if current_price and current_price > 0 else 0.001
            bonding_curve = BondingCurve(
                initial_price=initial_price,
                initial_supply=int(total_supply) if total_supply else 1000000
            )
            bonding_curve_state = BondingCurveState(
                token_supply=0,
                algo_reserve=0
            )
            bonding_curve_config_json = json.dumps(bonding_curve.to_dict())
            bonding_curve_state_json = json.dumps(bonding_curve_state.to_dict())
            
            # Update database
            cursor.execute('''
                UPDATE tokens 
                SET bonding_curve_config = ?, bonding_curve_state = ?
                WHERE asa_id = ?
            ''', (bonding_curve_config_json, bonding_curve_state_json, asa_id))
            conn.commit()
            logger.info(f"✅ Initialized bonding curve for token {asa_id}")
        
        curve = BondingCurve.from_dict(json.loads(bonding_curve_config_json))
        state = BondingCurveState.from_dict(json.loads(bonding_curve_state_json))
        
        if trade_type == 'buy':
            result = curve.calculate_buy_price(state.token_supply, state.algo_reserve, token_amount)
            return jsonify({
                "success": True,
                "algo_cost": result['algo_cost'],
                "new_price": result['new_price'],
                "price_impact": ((result['new_price'] - current_price) / current_price) * 100 if current_price > 0 else 0
            })
        else:
            result = curve.calculate_sell_price(state.token_supply, state.algo_reserve, token_amount)
            return jsonify({
                "success": True,
                "algo_received": result['algo_received'],
                "new_price": result['new_price'],
                "price_impact": ((current_price - result['new_price']) / current_price) * 100 if current_price > 0 else 0
            })
    except Exception as e:
        logger.error(f"Error in bonding curve estimate: {e}")
        try:
            conn.close()
        except:
            pass
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except:
            pass

@app.route('/api/scrape-content', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@handle_errors
def scrape_content():
    """Scrape content from Instagram, Twitter, or LinkedIn URLs"""
    if WebScraper is None:
        return jsonify({"success": False, "error": "Web scraper not available"}), 500
    
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        platform = data.get('platform', '').lower()
        username = data.get('username', '').strip()
        
        if not url:
            return jsonify({"success": False, "error": "URL is required"}), 400
        
        # Detect platform from URL if not provided
        if not platform:
            if 'instagram.com' in url or 'instagr.am' in url:
                platform = 'instagram'
            elif 'twitter.com' in url or 'x.com' in url:
                platform = 'twitter'
            elif 'linkedin.com' in url:
                platform = 'linkedin'
            else:
                return jsonify({"success": False, "error": "Unsupported platform. Use Instagram, Twitter/X, or LinkedIn."}), 400
        
        scraper = WebScraper()
        result = None
        
        if platform == 'instagram':
            result = scraper.scrape_instagram_reel(url)
        elif platform == 'twitter':
            result = scraper.scrape_twitter_tweet(url)
        elif platform == 'linkedin':
            result = scraper.scrape_linkedin_post(url)
        else:
            return jsonify({"success": False, "error": f"Unsupported platform: {platform}"}), 400
        
        if result:
            return jsonify({
                "success": True,
                "content": result,
                "platform": platform
            })
        else:
            return jsonify({
                "success": False,
                "error": "Could not scrape content. Please check the URL and try again."
            }), 404
            
    except Exception as e:
        logger.error(f"Error scraping content: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/verify-ownership', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def verify_ownership():
    """Verify ownership of a URL for Instagram, Twitter, or LinkedIn"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 200
    
    try:
        if WebScraper is None:
            return jsonify({"success": False, "error": "Web scraper not available"}), 500
        
        data = request.get_json()
        url = data.get('url', '').strip()
        platform = data.get('platform', '').lower()
        username = data.get('username', '').strip()
        
        if not url:
            return jsonify({"success": False, "error": "URL is required"}), 400
        
        if not platform:
            # Auto-detect platform
            if 'instagram.com' in url or 'instagr.am' in url:
                platform = 'instagram'
            elif 'twitter.com' in url or 'x.com' in url:
                platform = 'twitter'
            elif 'linkedin.com' in url:
                platform = 'linkedin'
            elif 'youtube.com' in url or 'youtu.be' in url:
                # YouTube doesn't need ownership verification (uses API)
                return jsonify({
                    "success": True,
                    "verified": True,
                    "message": "YouTube content is already verified via API"
                })
            else:
                return jsonify({"success": False, "error": "Unsupported platform"}), 400
        
        # YouTube doesn't need ownership verification
        if platform == 'youtube':
            return jsonify({
                "success": True,
                "verified": True,
                "message": "YouTube content is already verified via API"
            })
        
        # Get additional verification parameters
        wallet_address = data.get('wallet_address', '').strip()
        verification_code = data.get('verification_code', '').strip()
        
        scraper = WebScraper()
        verification_result = scraper.verify_url_ownership(
            url=url, 
            platform=platform, 
            claimed_username=username,
            wallet_address=wallet_address,
            verification_code=verification_code
        )
        
        return jsonify({
            "success": True,
            "verified": verification_result.get('verified', False),
            "message": verification_result.get('message', 'Verification completed'),
            "requires_bio_verification": verification_result.get('requires_bio_verification', False),
            "verification_code": verification_result.get('verification_code', ''),
            "url_username": verification_result.get('url_username', ''),
            "verified_username": verification_result.get('verified_username', '')
        })
        
    except Exception as e:
        logger.error(f"Error verifying ownership: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/youtube/videos', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@handle_errors
def get_youtube_videos():
    """Get all YouTube videos with tokenization status - uses API key and caching"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 200
    
    try:
        if not youtube_sessions:
            return jsonify({
                "success": False,
                "error": "YouTube authentication required"
            }), 401
        
        session_key = list(youtube_sessions.keys())[0]
        session_data = youtube_sessions[session_key]
        channel_id = session_data.get('channel_id')
        channel_title = session_data.get('channel_title')
        
        if not channel_id:
            return jsonify({"success": False, "error": "No channel ID found"}), 404
        
        # First, try to get cached videos
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT videos_data, updated_at FROM youtube_videos_cache 
            WHERE channel_id = ? 
            ORDER BY updated_at DESC LIMIT 1
        ''', (channel_id,))
        
        cache_row = cursor.fetchone()
        
        # If cache exists and is less than 30 minutes old, return cached data
        if cache_row:
            cached_videos_json, updated_at = cache_row
            cached_video_json = cached_videos_json  # Alias for consistency
            updated_time = datetime.fromisoformat(updated_at)
            time_diff = datetime.now() - updated_time
            
            # Use cache if less than 30 minutes old
            if time_diff.total_seconds() < 1800:  # 30 minutes
                cached_data = json.loads(cached_videos_json)
                conn.close()
                logger.info(f"✅ Returning cached YouTube videos for {channel_title} (cached {int(time_diff.total_seconds()/60)} minutes ago)")
                
                # Get channel info from cache or channel cache
                conn2 = sqlite3.connect('creatorvault.db')
                cursor2 = conn2.cursor()
                cursor2.execute('''
                    SELECT channel_data FROM youtube_channel_cache 
                    WHERE channel_id = ? 
                    ORDER BY updated_at DESC LIMIT 1
                ''', (channel_id,))
                channel_cache = cursor2.fetchone()
                conn2.close()
                
                channel_info = None
                if channel_cache:
                    channel_data = json.loads(channel_cache[0])
                    channel_info = {
                        "id": channel_id,
                        "title": channel_data.get('title', channel_title),
                        "subscriberCount": channel_data.get('subscriberCount', 0)
                    }
                
                response = jsonify({
                    "success": True,
                    "videos": cached_data.get('videos', []),
                    "channel": channel_info or {"id": channel_id, "title": channel_title, "subscriberCount": 0},
                    "cached": True
                })
                return response
        
        conn.close()
        
        # If no cache or cache is stale, try to fetch from API using API KEY (not OAuth)
        try:
            # Use API key for public data requests (much higher quota)
            youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
            
            # Get all videos using API key (public data)
            videos_response = youtube.search().list(
                part='snippet',
                channelId=channel_id,
                type='video',
                maxResults=50,
                order='date',
                key=YOUTUBE_API_KEY
            ).execute()
            
            # Get channel info using API key
            channels_response = youtube.channels().list(
                part='snippet,statistics',
                id=channel_id,
                key=YOUTUBE_API_KEY
            ).execute()
            
            if not channels_response.get('items'):
                # Fall back to cached channel data
                conn = sqlite3.connect('creatorvault.db')
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT channel_data FROM youtube_channel_cache 
                    WHERE channel_id = ? 
                    ORDER BY updated_at DESC LIMIT 1
                ''', (channel_id,))
                channel_cache = cursor.fetchone()
                conn.close()
                
                if channel_cache:
                    channel_data = json.loads(channel_cache[0])
                    channel = {
                        'id': channel_id,
                        'snippet': {'title': channel_data.get('title', channel_title)},
                        'statistics': {'subscriberCount': channel_data.get('subscriberCount', 0)}
                    }
                else:
                    channel = {'id': channel_id, 'snippet': {'title': channel_title}, 'statistics': {'subscriberCount': 0}}
            else:
                channel = channels_response['items'][0]
            
            # Get tokenized videos from database
            init_db()
            conn = sqlite3.connect('creatorvault.db')
            cursor = conn.cursor()
            
            tokenized_videos = {}
            try:
                # Check both content_id and content_url for YouTube videos
                cursor.execute('''
                    SELECT content_id, content_url, token_id, token_name, token_symbol 
                    FROM tokens 
                    WHERE platform = ? AND (content_id IS NOT NULL OR content_url IS NOT NULL)
                ''', ('youtube',))
                
                for row in cursor.fetchall():
                    content_id, content_url, token_id, token_name, token_symbol = row
                    # Extract video ID from content_id or content_url
                    video_id = None
                    if content_id:
                        video_id = content_id
                    elif content_url:
                        # Extract video ID from YouTube URL
                        import re
                        match = re.search(r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})', content_url)
                        if match:
                            video_id = match.group(1)
                    
                    if video_id:
                        tokenized_videos[video_id] = {
                            'token_id': token_id,
                            'token_name': token_name,
                            'token_symbol': token_symbol
                        }
            except sqlite3.OperationalError as e:
                # Table doesn't exist yet or database is empty - this is fine
                logger.info(f"No tokenized videos found (database may be empty): {e}")
                tokenized_videos = {}
            finally:
                conn.close()
            
            # Format videos with tokenization status
            videos = []
            for item in videos_response.get('items', []):
                video_id = item['id']['videoId']
                video_data = {
                    'id': video_id,
                    'title': item['snippet']['title'],
                    'description': item['snippet']['description'],
                    'thumbnail': item['snippet']['thumbnails']['high']['url'],
                    'publishedAt': item['snippet']['publishedAt'],
                    'url': f"https://www.youtube.com/watch?v={video_id}",
                    'isTokenized': video_id in tokenized_videos,
                    'tokenInfo': tokenized_videos.get(video_id)
                }
                videos.append(video_data)
            
            # Cache the videos
            conn = sqlite3.connect('creatorvault.db')
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO youtube_videos_cache 
                (channel_id, channel_title, videos_data, updated_at)
                VALUES (?, ?, ?, ?)
            ''', (channel_id, channel_title, json.dumps({'videos': videos}), datetime.now().isoformat()))
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Fetched and cached {len(videos)} YouTube videos for {channel_title}")
            
            return jsonify({
                "success": True,
                "videos": videos,
                "channel": {
                    "id": channel_id,
                    "title": channel['snippet']['title'],
                    "subscriberCount": int(channel['statistics'].get('subscriberCount', 0))
                },
                "cached": False
            })
            
        except HttpError as http_err:
            # Handle quota exceeded - return cached data if available
            if http_err.resp.status == 403 and 'quotaExceeded' in str(http_err):
                logger.warning(f"⚠️ YouTube API quota exceeded. Returning cached videos if available.")
                
                if cache_row:
                    cached_data = json.loads(cached_videos_json)
                    conn = sqlite3.connect('creatorvault.db')
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT channel_data FROM youtube_channel_cache 
                        WHERE channel_id = ? 
                        ORDER BY updated_at DESC LIMIT 1
                    ''', (channel_id,))
                    channel_cache = cursor.fetchone()
                    conn.close()
                    
                    channel_info = None
                    if channel_cache:
                        channel_data = json.loads(channel_cache[0])
                        channel_info = {
                            "id": channel_id,
                            "title": channel_data.get('title', channel_title),
                            "subscriberCount": channel_data.get('subscriberCount', 0)
                        }
                    
                    return jsonify({
                        "success": True,
                        "videos": cached_data.get('videos', []),
                        "channel": channel_info or {"id": channel_id, "title": channel_title, "subscriberCount": 0},
                        "cached": True,
                        "warning": "Using cached data due to API quota limit"
                    })
                else:
                    return jsonify({
                        "success": False,
                        "error": "YouTube API quota exceeded. Please try again later.",
                        "quotaExceeded": True
                    }), 429
            else:
                raise
        
    except Exception as e:
        logger.error(f"Error fetching YouTube videos: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
        
    except Exception as e:
        logger.error(f"Error fetching YouTube videos: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/youtube/video-info', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def get_youtube_video_info():
    """Get YouTube video info directly from API (no scraping needed)"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 200
    
    # Use handle_errors only for POST requests
    try:
        if not youtube_sessions:
            return jsonify({
                "success": False,
                "error": "YouTube authentication required"
            }), 401
        
        data = request.get_json()
        video_url = data.get('url', '').strip()
        
        if not video_url:
            return jsonify({"success": False, "error": "Video URL is required"}), 400
        
        # Extract video ID from URL
        import re
        video_id_match = re.search(r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})', video_url)
        if not video_id_match:
            return jsonify({"success": False, "error": "Invalid YouTube URL"}), 400
        
        video_id = video_id_match.group(1)
        
        session_key = list(youtube_sessions.keys())[0]
        session_data = youtube_sessions[session_key]
        
        # Get connected channel ID for ownership verification
        connected_channel_id = session_data.get('channel_id')
        
        # First, try to get cached video info
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT video_data, updated_at FROM youtube_video_info_cache 
            WHERE video_id = ? 
            ORDER BY updated_at DESC LIMIT 1
        ''', (video_id,))
        
        cache_row = cursor.fetchone()
        
        # If cache exists and is less than 1 hour old, use it
        if cache_row:
            cached_video_json, updated_at = cache_row
            updated_time = datetime.fromisoformat(updated_at)
            time_diff = datetime.now() - updated_time
            
            if time_diff.total_seconds() < 3600:  # 1 hour
                cached_video = json.loads(cached_video_json)
                conn.close()
                logger.info(f"✅ Returning cached YouTube video info for {video_id} (cached {int(time_diff.total_seconds()/60)} minutes ago)")
                
                # Verify ownership using cached data
                video_channel_id = cached_video.get('channelId')
                is_owned = (video_channel_id == connected_channel_id) if connected_channel_id else False
                
                # Check if already tokenized
                conn2 = sqlite3.connect('creatorvault.db')
                cursor2 = conn2.cursor()
                # Try token_id first, fallback to asa_id for old schema
                try:
                    cursor2.execute('SELECT token_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                                  (video_id, f'%{video_id}%', 'youtube'))
                    existing_token = cursor2.fetchone()
                except sqlite3.OperationalError:
                    # Old schema uses asa_id
                    cursor2.execute('SELECT asa_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                                  (video_id, f'%{video_id}%', 'youtube'))
                    existing_token = cursor2.fetchone()
                conn2.close()
                
                cached_video['isOwned'] = is_owned
                cached_video['connectedChannelId'] = connected_channel_id
                cached_video['ownershipMessage'] = 'You own this video and can tokenize it.' if is_owned else 'This video belongs to another channel. You can only tokenize your own content.'
                cached_video['isTokenized'] = existing_token is not None
                cached_video['tokenInfo'] = {
                    'token_id': existing_token[0],
                    'token_name': existing_token[1],
                    'token_symbol': existing_token[2]
                } if existing_token else None
                cached_video['cached'] = True
                
                return jsonify({
                    "success": True,
                    "content": cached_video,
                    "verified": is_owned
                })
        
        conn.close()
        
        # If no cache or cache is stale, fetch from API using API KEY (not OAuth)
        try:
            # Use API key for public video data (much higher quota)
            youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
            
            video_response = youtube.videos().list(
                part='snippet,statistics,contentDetails',
                id=video_id,
                key=YOUTUBE_API_KEY
            ).execute()
            
            if not video_response.get('items'):
                # Try to return cached data even if stale
                if cache_row:
                    cached_video = json.loads(cached_video_json)
                    video_channel_id = cached_video.get('channelId')
                    is_owned = (video_channel_id == connected_channel_id) if connected_channel_id else False
                    
                    conn2 = sqlite3.connect('creatorvault.db')
                    cursor2 = conn2.cursor()
                    cursor2.execute('SELECT token_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                                  (video_id, f'%{video_id}%', 'youtube'))
                    # Fallback to asa_id if token_id doesn't exist (old schema)
                    if not cursor2.fetchone():
                        cursor2.execute('SELECT asa_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                                      (video_id, f'%{video_id}%', 'youtube'))
                        existing_token = cursor2.fetchone()
                    else:
                        existing_token = cursor2.fetchone()
                    existing_token = cursor2.fetchone()
                    conn2.close()
                    
                    cached_video['isOwned'] = is_owned
                    cached_video['connectedChannelId'] = connected_channel_id
                    cached_video['ownershipMessage'] = 'You own this video and can tokenize it.' if is_owned else 'This video belongs to another channel. You can only tokenize your own content.'
                    cached_video['isTokenized'] = existing_token is not None
                    cached_video['tokenInfo'] = {
                        'token_id': existing_token[0],
                        'token_name': existing_token[1],
                        'token_symbol': existing_token[2]
                    } if existing_token else None
                    cached_video['cached'] = True
                    cached_video['warning'] = 'Using cached data - video not found in API'
                    return jsonify({
                        "success": True,
                        "content": cached_video,
                        "verified": is_owned
                    })
                return jsonify({"success": False, "error": "Video not found or not accessible"}), 404
            
            video = video_response['items'][0]
            video_channel_id = video['snippet']['channelId']
            
            # CRITICAL: Verify the video belongs to the connected channel
            is_owned = (video_channel_id == connected_channel_id) if connected_channel_id else False
            
            if not is_owned and connected_channel_id:
                logger.warning(f"⚠️ User tried to tokenize video from another channel. Video channel: {video_channel_id}, Connected channel: {connected_channel_id}")
            
            # Check if already tokenized
            conn = sqlite3.connect('creatorvault.db')
            cursor = conn.cursor()
            # Try token_id first, fallback to asa_id for old schema
            try:
                cursor.execute('SELECT token_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                              (video_id, f'%{video_id}%', 'youtube'))
                existing_token = cursor.fetchone()
            except sqlite3.OperationalError:
                # Old schema uses asa_id
                cursor.execute('SELECT asa_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                              (video_id, f'%{video_id}%', 'youtube'))
                existing_token = cursor.fetchone()
            existing_token = cursor.fetchone()
            
            video_data = {
                'id': video_id,
                'title': video['snippet']['title'],
                'description': video['snippet']['description'],
                'thumbnail': video['snippet']['thumbnails']['high']['url'],
                'publishedAt': video['snippet']['publishedAt'],
                'viewCount': int(video['statistics'].get('viewCount', 0)),
                'likeCount': int(video['statistics'].get('likeCount', 0)),
                'commentCount': int(video['statistics'].get('commentCount', 0)),
                'channelId': video_channel_id,
                'channelTitle': video['snippet']['channelTitle'],
                'url': f"https://www.youtube.com/watch?v={video_id}",
                'platform': 'youtube',
                'isTokenized': existing_token is not None,
                'tokenInfo': {
                    'token_id': existing_token[0],
                    'token_name': existing_token[1],
                    'token_symbol': existing_token[2]
                } if existing_token else None,
                # NEW: Add ownership verification
                'isOwned': is_owned,
                'connectedChannelId': connected_channel_id,
                'ownershipMessage': 'You own this video and can tokenize it.' if is_owned else 'This video belongs to another channel. You can only tokenize your own content.',
                'cached': False
            }
            
            # Cache the video info
            cursor.execute('''
                INSERT OR REPLACE INTO youtube_video_info_cache 
                (video_id, video_data, updated_at)
                VALUES (?, ?, ?)
            ''', (video_id, json.dumps(video_data), datetime.now().isoformat()))
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Fetched and cached YouTube video info for {video_id}")
            
            return jsonify({
                "success": True,
                "content": video_data,
                "verified": is_owned
            })
            
        except HttpError as http_err:
            # Handle quota exceeded - return cached data if available
            if http_err.resp.status == 403 and 'quotaExceeded' in str(http_err):
                logger.warning(f"⚠️ YouTube API quota exceeded. Returning cached video info if available.")
                
                if cache_row:
                    cached_video = json.loads(cached_video_json)
                    video_channel_id = cached_video.get('channelId')
                    is_owned = (video_channel_id == connected_channel_id) if connected_channel_id else False
                    
                    # Check if already tokenized
                    conn = sqlite3.connect('creatorvault.db')
                    cursor = conn.cursor()
                    # Try token_id first, fallback to asa_id for old schema
                    try:
                        cursor.execute('SELECT token_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                                      (video_id, f'%{video_id}%', 'youtube'))
                        existing_token = cursor.fetchone()
                    except sqlite3.OperationalError:
                        # Old schema uses asa_id
                        cursor.execute('SELECT asa_id, token_name, token_symbol FROM tokens WHERE (content_id = ? OR content_url LIKE ?) AND platform = ?', 
                                      (video_id, f'%{video_id}%', 'youtube'))
                        existing_token = cursor.fetchone()
                    conn.close()
                    
                    cached_video['isOwned'] = is_owned
                    cached_video['connectedChannelId'] = connected_channel_id
                    cached_video['ownershipMessage'] = 'You own this video and can tokenize it.' if is_owned else 'This video belongs to another channel. You can only tokenize your own content.'
                    cached_video['isTokenized'] = existing_token is not None
                    cached_video['tokenInfo'] = {
                        'token_id': existing_token[0],
                        'token_name': existing_token[1],
                        'token_symbol': existing_token[2]
                    } if existing_token else None
                    cached_video['cached'] = True
                    cached_video['warning'] = 'Using cached data due to API quota limit'
                    
                    return jsonify({
                        "success": True,
                        "content": cached_video,
                        "verified": is_owned
                    })
                else:
                    return jsonify({
                        "success": False,
                        "error": "YouTube API quota exceeded. Please try again later.",
                        "quotaExceeded": True
                    }), 429
            else:
                raise
        
    except Exception as e:
        logger.error(f"Error fetching YouTube video info: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==================== PREDICTION MARKET ENDPOINTS ====================

@app.route('/api/predictions/create', methods=['POST'])
@cross_origin(supports_credentials=True)
def create_prediction():
    """Create a new prediction market"""
    try:
        data = request.get_json()
        creator_address = data.get('creator_address', '').strip()
        content_url = data.get('content_url', '').strip()
        platform = data.get('platform', '').lower()
        metric_type = data.get('metric_type', '').lower()  # likes, comments, views, shares, reposts
        target_value = float(data.get('target_value', 0))
        timeframe_hours = int(data.get('timeframe_hours', 24))
        
        if not all([creator_address, content_url, platform, metric_type, target_value > 0, timeframe_hours > 0]):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        # Generate unique prediction ID
        import hashlib
        import time
        prediction_id = hashlib.sha256(
            f"{creator_address}:{content_url}:{time.time()}".encode()
        ).hexdigest()[:16].upper()
        
        # Calculate end time
        from datetime import datetime, timedelta
        end_time = datetime.now() + timedelta(hours=timeframe_hours)
        
        # Get initial metric value
        initial_value = 0
        try:
            scraper = WebScraper()
            if platform == 'youtube':
                # Use YouTube API
                video_id = content_url.split('v=')[-1].split('&')[0]
                if youtube_sessions:
                    session_key = list(youtube_sessions.keys())[0]
                    session_data = youtube_sessions[session_key]
                    credentials_data = session_data['credentials']
                    credentials = Credentials(
                        token=credentials_data['token'],
                        refresh_token=credentials_data['refresh_token'],
                        token_uri=credentials_data['token_uri'],
                        client_id=credentials_data['client_id'],
                        client_secret=credentials_data['client_secret'],
                        scopes=credentials_data['scopes']
                    )
                    youtube = build('youtube', 'v3', credentials=credentials)
                    video_response = youtube.videos().list(part='statistics', id=video_id).execute()
                    if video_response.get('items'):
                        stats = video_response['items'][0]['statistics']
                        if metric_type == 'views':
                            initial_value = int(stats.get('viewCount', 0))
                        elif metric_type == 'likes':
                            initial_value = int(stats.get('likeCount', 0))
                        elif metric_type == 'comments':
                            initial_value = int(stats.get('commentCount', 0))
            else:
                # Use platform-specific scraping methods
                scraped = None
                if platform == 'instagram':
                    scraped = scraper.scrape_instagram_reel(content_url)
                elif platform == 'twitter':
                    scraped = scraper.scrape_twitter_tweet(content_url)
                elif platform == 'linkedin':
                    scraped = scraper.scrape_linkedin_post(content_url)
                
                if scraped and scraped.get('engagement'):
                    engagement = scraped['engagement']
                    # Get the specific metric or fallback to likes
                    if metric_type == 'likes':
                        initial_value = engagement.get('likes', 0) or engagement.get('reactions', 0) or 0
                    elif metric_type == 'comments':
                        initial_value = engagement.get('comments', 0) or engagement.get('replies', 0) or 0
                    elif metric_type == 'views':
                        initial_value = engagement.get('views', 0) or 0
                    elif metric_type == 'shares' or metric_type == 'reposts':
                        initial_value = engagement.get('shares', 0) or engagement.get('reposts', 0) or engagement.get('retweets', 0) or 0
                    else:
                        initial_value = engagement.get(metric_type, 0) or engagement.get('likes', 0) or 0
        except Exception as e:
            logger.warning(f"Could not fetch initial value: {e}")
        
        # Save to database
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO predictions 
            (prediction_id, creator_address, content_url, platform, metric_type, 
             target_value, timeframe_hours, end_time, initial_value, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ''', (prediction_id, creator_address, content_url, platform, metric_type,
              target_value, timeframe_hours, end_time.isoformat(), initial_value))
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Prediction created: {prediction_id} by {creator_address}")
        
        return jsonify({
            "success": True,
            "prediction": {
                "prediction_id": prediction_id,
                "creator_address": creator_address,
                "content_url": content_url,
                "platform": platform,
                "metric_type": metric_type,
                "target_value": target_value,
                "timeframe_hours": timeframe_hours,
                "end_time": end_time.isoformat(),
                "initial_value": initial_value,
                "yes_pool": 0,
                "no_pool": 0,
                "status": "active"
            }
        })
        
    except Exception as e:
        logger.error(f"Error creating prediction: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/predictions', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_predictions():
    """Get all predictions"""
    try:
        status_filter = request.args.get('status', 'active')  # active, resolved, all
        
        # Initialize database if it doesn't exist
        init_db()
        
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        predictions = []
        try:
            if status_filter == 'all':
                cursor.execute('''
                    SELECT prediction_id, creator_address, content_url, platform, metric_type,
                           target_value, timeframe_hours, end_time, yes_pool, no_pool,
                           status, outcome, initial_value, final_value, created_at
                    FROM predictions
                    ORDER BY created_at DESC
                ''')
            else:
                cursor.execute('''
                    SELECT prediction_id, creator_address, content_url, platform, metric_type,
                           target_value, timeframe_hours, end_time, yes_pool, no_pool,
                           status, outcome, initial_value, final_value, created_at
                    FROM predictions
                    WHERE status = ?
                    ORDER BY created_at DESC
                ''', (status_filter,))
            
            rows = cursor.fetchall()
            
            for row in rows:
                predictions.append({
                    "prediction_id": row[0],
                    "creator_address": row[1],
                    "content_url": row[2],
                    "platform": row[3],
                    "metric_type": row[4],
                    "target_value": row[5],
                    "timeframe_hours": row[6],
                    "end_time": row[7],
                    "yes_pool": row[8],
                    "no_pool": row[9],
                    "status": row[10],
                    "outcome": row[11],
                    "initial_value": row[12],
                    "final_value": row[13],
                    "created_at": row[14]
                })
        except sqlite3.OperationalError as e:
            # Table doesn't exist yet or database is empty - return empty list
            logger.info(f"No predictions found (database may be empty): {e}")
            predictions = []
        finally:
            conn.close()
        
        return jsonify({
            "success": True,
            "predictions": predictions
        })
        
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/predictions/<prediction_id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_prediction(prediction_id):
    """Get prediction details with real-time odds"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT prediction_id, creator_address, content_url, platform, metric_type,
                   target_value, timeframe_hours, end_time, yes_pool, no_pool,
                   status, outcome, initial_value, final_value, created_at
            FROM predictions
            WHERE prediction_id = ?
        ''', (prediction_id,))
        
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Prediction not found"}), 404
        
        # Get current metric value
        current_value = row[12]  # initial_value
        try:
            scraper = WebScraper()
            if row[3] == 'youtube':  # platform
                video_id = row[2].split('v=')[-1].split('&')[0]  # content_url
                if youtube_sessions:
                    session_key = list(youtube_sessions.keys())[0]
                    session_data = youtube_sessions[session_key]
                    credentials_data = session_data['credentials']
                    credentials = Credentials(
                        token=credentials_data['token'],
                        refresh_token=credentials_data['refresh_token'],
                        token_uri=credentials_data['token_uri'],
                        client_id=credentials_data['client_id'],
                        client_secret=credentials_data['client_secret'],
                        scopes=credentials_data['scopes']
                    )
                    youtube = build('youtube', 'v3', credentials=credentials)
                    video_response = youtube.videos().list(part='statistics', id=video_id).execute()
                    if video_response.get('items'):
                        stats = video_response['items'][0]['statistics']
                        if row[4] == 'views':  # metric_type
                            current_value = int(stats.get('viewCount', 0))
                        elif row[4] == 'likes':
                            current_value = int(stats.get('likeCount', 0))
                        elif row[4] == 'comments':
                            current_value = int(stats.get('commentCount', 0))
            else:
                # Use platform-specific scraping methods
                content_url = row[2]
                platform = row[3]
                scraped = None
                
                if platform == 'instagram':
                    scraped = scraper.scrape_instagram_reel(content_url)
                elif platform == 'twitter':
                    scraped = scraper.scrape_twitter_tweet(content_url)
                elif platform == 'linkedin':
                    scraped = scraper.scrape_linkedin_post(content_url)
                
                if scraped and scraped.get('engagement'):
                    engagement = scraped['engagement']
                    metric_type = row[4]  # likes, comments, views, shares, reposts
                    # Get the specific metric or fallback to likes
                    if metric_type == 'likes':
                        current_value = engagement.get('likes', 0) or engagement.get('reactions', 0) or 0
                    elif metric_type == 'comments':
                        current_value = engagement.get('comments', 0) or engagement.get('replies', 0) or 0
                    elif metric_type == 'views':
                        current_value = engagement.get('views', 0) or 0
                    elif metric_type == 'shares' or metric_type == 'reposts':
                        current_value = engagement.get('shares', 0) or engagement.get('reposts', 0) or engagement.get('retweets', 0) or 0
                    else:
                        current_value = engagement.get(metric_type, 0) or engagement.get('likes', 0) or 0
        except Exception as e:
            logger.warning(f"Could not fetch current value: {e}")
        
        # Auto-resolve if target is met
        target_value = row[5]
        status = row[10]
        if status == 'active' and current_value >= target_value:
            logger.info(f"🎯 Target reached for {prediction_id}! Current: {current_value}, Target: {target_value}")
            # Mark as resolving - frontend will call resolve endpoint
            try:
                cursor.execute('''
                    UPDATE predictions SET status = 'resolving' WHERE prediction_id = ?
                ''', (prediction_id,))
                conn.commit()
                status = 'resolving'
            except Exception as e:
                logger.error(f"Error marking as resolving: {e}")
        
        # Calculate odds
        yes_pool = row[8] or 0.01  # Prevent division by zero
        no_pool = row[9] or 0.01
        total_pool = yes_pool + no_pool
        
        yes_odds = (total_pool / yes_pool) if yes_pool > 0 else 1.0
        no_odds = (total_pool / no_pool) if no_pool > 0 else 1.0
        
        # Calculate time remaining
        from datetime import datetime
        end_time = datetime.fromisoformat(row[7])
        time_remaining = (end_time - datetime.now()).total_seconds() / 3600  # hours
        
        conn.close()
        
        return jsonify({
            "success": True,
            "prediction": {
                "prediction_id": row[0],
                "creator_address": row[1],
                "content_url": row[2],
                "platform": row[3],
                "metric_type": row[4],
                "target_value": row[5],
                "timeframe_hours": row[6],
                "end_time": row[7],
                "yes_pool": yes_pool,
                "no_pool": no_pool,
                "status": status,
                "outcome": row[11],
                "initial_value": row[12],
                "final_value": row[13],
                "created_at": row[14],
                "current_value": current_value,
                "yes_odds": round(yes_odds, 2),
                "no_odds": round(no_odds, 2),
                "time_remaining_hours": round(time_remaining, 2)
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching prediction: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/predictions/<prediction_id>/trade', methods=['POST'])
@cross_origin(supports_credentials=True)
def trade_prediction(prediction_id):
    """Trade on a prediction (YES or NO)"""
    try:
        data = request.get_json()
        trader_address = data.get('trader_address', '').strip()
        side = data.get('side', '').upper()  # YES or NO
        amount = float(data.get('amount', 0))  # APTOS amount
        
        if side not in ['YES', 'NO']:
            return jsonify({"success": False, "error": "Side must be YES or NO"}), 400
        
        if amount <= 0:
            return jsonify({"success": False, "error": "Amount must be greater than 0"}), 400
        
        # Get prediction
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT yes_pool, no_pool, status, end_time
            FROM predictions
            WHERE prediction_id = ?
        ''', (prediction_id,))
        
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Prediction not found"}), 404
        
        yes_pool, no_pool, status, end_time = row
        
        if status != 'active':
            return jsonify({"success": False, "error": "Prediction is not active"}), 400
        
        # Check if expired
        from datetime import datetime
        if datetime.fromisoformat(end_time) < datetime.now():
            return jsonify({"success": False, "error": "Prediction has expired"}), 400
        
        # Calculate odds
        yes_pool = yes_pool or 0.01
        no_pool = no_pool or 0.01
        total_pool = yes_pool + no_pool
        
        if side == 'YES':
            new_yes_pool = yes_pool + amount
            new_total = new_yes_pool + no_pool
            odds = new_total / new_yes_pool
            potential_payout = amount * odds
            cursor.execute('''
                UPDATE predictions SET yes_pool = ? WHERE prediction_id = ?
            ''', (new_yes_pool, prediction_id))
        else:
            new_no_pool = no_pool + amount
            new_total = yes_pool + new_no_pool
            odds = new_total / new_no_pool
            potential_payout = amount * odds
            cursor.execute('''
                UPDATE predictions SET no_pool = ? WHERE prediction_id = ?
            ''', (new_no_pool, prediction_id))
        
        # Record trade
        import uuid
        trade_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO prediction_trades
            (prediction_id, trader_address, side, amount, odds, potential_payout, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        ''', (prediction_id, trader_address, side, amount, odds, potential_payout))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Prediction trade: {side} {amount} APTOS on {prediction_id} by {trader_address}")
        
        return jsonify({
            "success": True,
            "trade": {
                "trade_id": trade_id,
                "prediction_id": prediction_id,
                "side": side,
                "amount": amount,
                "odds": round(odds, 2),
                "potential_payout": round(potential_payout, 2)
            }
        })
        
    except Exception as e:
        logger.error(f"Error trading prediction: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/predictions/<prediction_id>/resolve', methods=['POST'])
@cross_origin(supports_credentials=True)
def resolve_prediction(prediction_id):
    """Resolve a prediction and payout winners"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT content_url, platform, metric_type, target_value, yes_pool, no_pool, status
            FROM predictions
            WHERE prediction_id = ?
        ''', (prediction_id,))
        
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Prediction not found"}), 404
        
        content_url, platform, metric_type, target_value, yes_pool, no_pool, status = row
        
        if status not in ['active', 'resolving']:
            return jsonify({"success": False, "error": "Prediction already resolved"}), 400
        
        # Get final metric value
        final_value = 0
        try:
            scraper = WebScraper()
            if platform == 'youtube':
                video_id = content_url.split('v=')[-1].split('&')[0]
                if youtube_sessions:
                    session_key = list(youtube_sessions.keys())[0]
                    session_data = youtube_sessions[session_key]
                    credentials_data = session_data['credentials']
                    credentials = Credentials(
                        token=credentials_data['token'],
                        refresh_token=credentials_data['refresh_token'],
                        token_uri=credentials_data['token_uri'],
                        client_id=credentials_data['client_id'],
                        client_secret=credentials_data['client_secret'],
                        scopes=credentials_data['scopes']
                    )
                    youtube = build('youtube', 'v3', credentials=credentials)
                    video_response = youtube.videos().list(part='statistics', id=video_id).execute()
                    if video_response.get('items'):
                        stats = video_response['items'][0]['statistics']
                        if metric_type == 'views':
                            final_value = int(stats.get('viewCount', 0))
                        elif metric_type == 'likes':
                            final_value = int(stats.get('likeCount', 0))
                        elif metric_type == 'comments':
                            final_value = int(stats.get('commentCount', 0))
            else:
                # Use platform-specific scraping methods
                scraped = None
                if platform == 'instagram':
                    scraped = scraper.scrape_instagram_reel(content_url)
                elif platform == 'twitter':
                    scraped = scraper.scrape_twitter_tweet(content_url)
                elif platform == 'linkedin':
                    scraped = scraper.scrape_linkedin_post(content_url)
                
                if scraped and scraped.get('engagement'):
                    engagement = scraped['engagement']
                    # Get the specific metric or fallback to likes
                    if metric_type == 'likes':
                        final_value = engagement.get('likes', 0) or engagement.get('reactions', 0) or 0
                    elif metric_type == 'comments':
                        final_value = engagement.get('comments', 0) or engagement.get('replies', 0) or 0
                    elif metric_type == 'views':
                        final_value = engagement.get('views', 0) or 0
                    elif metric_type == 'shares' or metric_type == 'reposts':
                        final_value = engagement.get('shares', 0) or engagement.get('reposts', 0) or engagement.get('retweets', 0) or 0
                    else:
                        final_value = engagement.get(metric_type, 0) or engagement.get('likes', 0) or 0
        except Exception as e:
            logger.error(f"Error fetching final value: {e}")
            return jsonify({"success": False, "error": f"Could not fetch final metric: {e}"}), 500
        
        # Determine outcome
        outcome = 'YES' if final_value >= target_value else 'NO'
        total_pool = yes_pool + no_pool
        
        # Update prediction
        cursor.execute('''
            UPDATE predictions
            SET status = 'resolved', outcome = ?, final_value = ?
            WHERE prediction_id = ?
        ''', (outcome, final_value, prediction_id))
        
        # Get winning trades and calculate payouts
        cursor.execute('''
            SELECT id, trader_address, amount, odds, potential_payout
            FROM prediction_trades
            WHERE prediction_id = ? AND side = ? AND status = 'pending'
        ''', (prediction_id, outcome))
        
        winning_trades = cursor.fetchall()
        
        # Calculate payout per trade (proportional to pool)
        for trade_id, trader_address, amount, odds, potential_payout in winning_trades:
            # Actual payout based on pool size
            actual_payout = potential_payout if total_pool >= potential_payout else total_pool * (amount / (yes_pool if outcome == 'YES' else no_pool))
            
            cursor.execute('''
                UPDATE prediction_trades
                SET status = 'won', payout_amount = ?
                WHERE id = ?
            ''', (actual_payout, trade_id))
            
            logger.info(f"💰 Payout: {trader_address} wins {actual_payout} APTOS on {prediction_id}")
        
        # Mark losing trades
        cursor.execute('''
            UPDATE prediction_trades
            SET status = 'lost', payout_amount = 0
            WHERE prediction_id = ? AND side != ? AND status = 'pending'
        ''', (prediction_id, outcome))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "prediction": {
                "prediction_id": prediction_id,
                "outcome": outcome,
                "final_value": final_value,
                "target_value": target_value,
                "winners": len(winning_trades)
            }
        })
        
    except Exception as e:
        logger.error(f"Error resolving prediction: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/predictions/auto-resolve', methods=['POST'])
@cross_origin(supports_credentials=True)
def auto_resolve_expired():
    """Auto-resolve all expired predictions"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Find expired active predictions
        cursor.execute('''
            SELECT prediction_id
            FROM predictions
            WHERE status = 'active' AND end_time < ?
        ''', (datetime.now().isoformat(),))
        
        expired = cursor.fetchall()
        resolved_count = 0
        
        for (prediction_id,) in expired:
            try:
                # Get prediction data
                cursor.execute('''
                    SELECT content_url, platform, metric_type, target_value, yes_pool, no_pool
                    FROM predictions
                    WHERE prediction_id = ?
                ''', (prediction_id,))
                
                row = cursor.fetchone()
                if row:
                    content_url, platform, metric_type, target_value, yes_pool, no_pool = row
                    
                    # Get final value (same logic as resolve_prediction)
                    final_value = 0
                    try:
                        scraper = WebScraper()
                        if platform == 'youtube':
                            video_id = content_url.split('v=')[-1].split('&')[0]
                            if youtube_sessions:
                                session_key = list(youtube_sessions.keys())[0]
                                session_data = youtube_sessions[session_key]
                                credentials_data = session_data['credentials']
                                credentials = Credentials(
                                    token=credentials_data['token'],
                                    refresh_token=credentials_data['refresh_token'],
                                    token_uri=credentials_data['token_uri'],
                                    client_id=credentials_data['client_id'],
                                    client_secret=credentials_data['client_secret'],
                                    scopes=credentials_data['scopes']
                                )
                                youtube = build('youtube', 'v3', credentials=credentials)
                                video_response = youtube.videos().list(part='statistics', id=video_id).execute()
                                if video_response.get('items'):
                                    stats = video_response['items'][0]['statistics']
                                    if metric_type == 'views':
                                        final_value = int(stats.get('viewCount', 0))
                                    elif metric_type == 'likes':
                                        final_value = int(stats.get('likeCount', 0))
                                    elif metric_type == 'comments':
                                        final_value = int(stats.get('commentCount', 0))
                        else:
                            # Use platform-specific scraping methods
                            scraped = None
                            if platform == 'instagram':
                                scraped = scraper.scrape_instagram_reel(content_url)
                            elif platform == 'twitter':
                                scraped = scraper.scrape_twitter_tweet(content_url)
                            elif platform == 'linkedin':
                                scraped = scraper.scrape_linkedin_post(content_url)
                            
                            if scraped and scraped.get('engagement'):
                                engagement = scraped['engagement']
                                # Get the specific metric or fallback to likes
                                if metric_type == 'likes':
                                    final_value = engagement.get('likes', 0) or engagement.get('reactions', 0) or 0
                                elif metric_type == 'comments':
                                    final_value = engagement.get('comments', 0) or engagement.get('replies', 0) or 0
                                elif metric_type == 'views':
                                    final_value = engagement.get('views', 0) or 0
                                elif metric_type == 'shares' or metric_type == 'reposts':
                                    final_value = engagement.get('shares', 0) or engagement.get('reposts', 0) or engagement.get('retweets', 0) or 0
                                else:
                                    final_value = engagement.get(metric_type, 0) or engagement.get('likes', 0) or 0
                    except Exception as e:
                        logger.error(f"Error fetching final value for {prediction_id}: {e}")
                        continue
                    
                    outcome = 'YES' if final_value >= target_value else 'NO'
                    total_pool = yes_pool + no_pool
                    
                    # Update prediction
                    cursor.execute('''
                        UPDATE predictions
                        SET status = 'resolved', outcome = ?, final_value = ?
                        WHERE prediction_id = ?
                    ''', (outcome, final_value, prediction_id))
                    
                    # Update trades
                    cursor.execute('''
                        UPDATE prediction_trades
                        SET status = CASE 
                            WHEN side = ? THEN 'won'
                            ELSE 'lost'
                        END,
                        payout_amount = CASE
                            WHEN side = ? THEN potential_payout
                            ELSE 0
                        END
                        WHERE prediction_id = ? AND status = 'pending'
                    ''', (outcome, outcome, prediction_id))
                    
                    resolved_count += 1
                    logger.info(f"✅ Auto-resolved prediction {prediction_id}: {outcome} (final: {final_value})")
            except Exception as e:
                logger.error(f"Error auto-resolving {prediction_id}: {e}")
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "resolved_count": resolved_count
        })
        
    except Exception as e:
        logger.error(f"Error auto-resolving predictions: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/predictions/winnings/<address>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_user_winnings(address):
    """Get user's pending winnings from predictions"""
    try:
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Get all won trades with pending payouts (not yet claimed)
        cursor.execute('''
            SELECT pt.id, pt.prediction_id, pt.payout_amount, pt.status, pt.claimed,
                   p.content_url, p.platform, p.metric_type, p.outcome
            FROM prediction_trades pt
            JOIN predictions p ON pt.prediction_id = p.prediction_id
            WHERE pt.trader_address = ? AND pt.status = 'won' AND pt.payout_amount > 0 AND (pt.claimed IS NULL OR pt.claimed = 0)
        ''', (address,))
        
        winnings = cursor.fetchall()
        total_pending = sum(win[2] for win in winnings)  # payout_amount
        
        result = []
        for win in winnings:
            trade_id, pred_id, payout, status, claimed, content_url, platform, metric, outcome = win
            result.append({
                'trade_id': trade_id,
                'prediction_id': pred_id,
                'payout_amount': payout,
                'status': status,
                'claimed': claimed,
                'content_url': content_url,
                'platform': platform,
                'metric_type': metric,
                'outcome': outcome
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "winnings": result,
            "total_pending": total_pending
        })
        
    except Exception as e:
        logger.error(f"Error fetching winnings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/predictions/claim/<trade_id>', methods=['POST'])
@cross_origin(supports_credentials=True)
def claim_winnings(trade_id):
    """Claim winnings - send payment from creator wallet to winner"""
    try:
        data = request.get_json()
        winner_address = data.get('winner_address', '').strip()
        
        if not winner_address:
            return jsonify({"success": False, "error": "Winner address required"}), 400
        
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Get trade details
        cursor.execute('''
            SELECT trader_address, payout_amount, claimed
            FROM prediction_trades
            WHERE id = ?
        ''', (trade_id,))
        
        trade = cursor.fetchone()
        if not trade:
            return jsonify({"success": False, "error": "Trade not found"}), 404
        
        trader_address, payout_amount, claimed = trade
        
        if trader_address != winner_address:
            return jsonify({"success": False, "error": "Unauthorized"}), 403
        
        if claimed:
            return jsonify({"success": False, "error": "Already claimed"}), 400
        
        # Send payment from creator wallet to winner
        try:
            creator_private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
            creator_address = account.address_from_private_key(creator_private_key)
            
            # Get transaction params
            params = algod_client.get_transaction_params()
            
            # Convert APTOS to microAlgos
            microalgos = int(payout_amount * 1_000_000)
            
            # Create payment transaction
            txn = transaction.PaymentTxn(
                sender=creator_address,
                sp=params,
                receiver=winner_address,
                amt=microalgos,
                note=f"Prediction winnings payout - Trade {trade_id}".encode()
            )
            
            # Sign and send
            signed_txn = txn.sign(creator_private_key)
            txid = algod_client.send_transaction(signed_txn)
            
            # Wait for confirmation
            wait_for_confirmation(algod_client, txid, 4)
            
            # Mark as claimed
            cursor.execute('''
                UPDATE prediction_trades
                SET claimed = 1, claim_txid = ?
                WHERE id = ?
            ''', (txid, trade_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Paid {payout_amount} APTOS to {winner_address} for trade {trade_id}")
            
            return jsonify({
                "success": True,
                "txid": txid,
                "payout_amount": payout_amount
            })
            
        except Exception as e:
            logger.error(f"Error sending payment: {e}")
            conn.close()
            return jsonify({"success": False, "error": f"Payment failed: {str(e)}"}), 500
        
    except Exception as e:
        logger.error(f"Error claiming winnings: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting CreatorVault backend server...")
    print(f"📡 Aptos Testnet: {APTOS_NODE_URL}")
    print("🔑 Using Aptos creator account")
    print("📺 YouTube OAuth enabled")
    
    # Initialize database
    init_db()
    print("💾 SQLite database initialized")
    
    print("🌐 Server running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)