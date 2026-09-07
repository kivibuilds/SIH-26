import os
from pathlib import Path
from dotenv import load_dotenv
try:
    from web3 import Web3
except ImportError:
    Web3 = None

# Load .env from the backend folder
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

# =========================================================
# BLOCKCHAIN CONFIGURATION
# =========================================================

HARDHAT_RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")

CONTRACT_ADDRESS = os.getenv(
    "BLOCKCHAIN_CONTRACT_ADDRESS",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
)
if Web3:
    CONTRACT_ADDRESS = Web3.to_checksum_address(CONTRACT_ADDRESS)


# =========================================================
# CONTRACT ABI
# =========================================================

CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "documentId",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "documentHash",
                "type": "string"
            }
        ],
        "name": "storeDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "documentId", "type": "string"},
            {"internalType": "string", "name": "documentHash", "type": "string"}
        ],
        "name": "verifyDocument",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "documentId", "type": "string"}],
        "name": "revokeDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "documentId",
                "type": "string"
            }
        ],
        "name": "getDocument",
        "outputs": [
            {
                "internalType": "string",
                "name": "documentHash",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "verifiedBy",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]


# =========================================================
# WEB3 CONNECTION
# =========================================================

w3 = Web3(Web3.HTTPProvider(HARDHAT_RPC_URL)) if Web3 else None


# =========================================================
# CONTRACT INSTANCE
# =========================================================

contract = (
    w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
    if w3
    else None
)


# =========================================================
# CHECK CONNECTION
# =========================================================

def blockchain_status():
    return {
        "connected": bool(w3 and w3.is_connected()),
        "rpc_url": HARDHAT_RPC_URL,
        "contract_address": CONTRACT_ADDRESS,
        "chain_id": w3.eth.chain_id if w3 and w3.is_connected() else None
    }


# =========================================================
# RECORD DOCUMENT ON BLOCKCHAIN
# =========================================================

def record_document(
    document_hash: str,
    screening_id: str
):
    if not w3 or not w3.is_connected():
        raise Exception(
            "Could not connect to Hardhat blockchain"
        )

    # Private key of one of the local Hardhat accounts.
    # Store it in your .env file as HARDHAT_PRIVATE_KEY.
    private_key = os.getenv("HARDHAT_PRIVATE_KEY")

    if not private_key:
        raise Exception(
            "HARDHAT_PRIVATE_KEY environment variable is not set"
        )

    account = w3.eth.account.from_key(private_key)

    nonce = w3.eth.get_transaction_count(
        account.address
    )

    # Our Solidity contract expects:
    # storeDocument(documentId, documentHash)
    transaction = contract.functions.storeDocument(
        screening_id,
        document_hash
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
        "chainId": w3.eth.chain_id
    })

    signed_transaction = w3.eth.account.sign_transaction(
        transaction,
        private_key=private_key
    )

    tx_hash = w3.eth.send_raw_transaction(
        signed_transaction.raw_transaction
    )

    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash
    )

    return {
        "transaction_hash": tx_hash.hex(),
        "block_number": receipt["blockNumber"],
        "status": receipt["status"]
    }


# =========================================================
# GET DOCUMENT FROM BLOCKCHAIN
# =========================================================

def get_document(screening_id: str):

    if not w3 or not w3.is_connected():
        raise Exception("Blockchain client is unavailable")

    result = contract.functions.getDocument(
        screening_id
    ).call()

    return {
        "document_hash": result[0],
        "timestamp": result[1],
        "verified_by": result[2]
    }


def _send_contract_transaction(function):
    if not w3 or not w3.is_connected():
        raise Exception("Could not connect to blockchain")

    private_key = os.getenv("HARDHAT_PRIVATE_KEY")
    if not private_key:
        raise Exception("HARDHAT_PRIVATE_KEY environment variable is not set")

    account = w3.eth.account.from_key(private_key)
    transaction = function.build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
        "chainId": w3.eth.chain_id,
    })
    signed = w3.eth.account.sign_transaction(transaction, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return {
        "transaction_hash": tx_hash.hex(),
        "block_number": receipt["blockNumber"],
        "status": receipt["status"],
    }


def verify_document(screening_id: str, document_hash: str):
    return _send_contract_transaction(
        contract.functions.verifyDocument(screening_id, document_hash)
    )


def revoke_document(screening_id: str):
    return _send_contract_transaction(
        contract.functions.revokeDocument(screening_id)
    )