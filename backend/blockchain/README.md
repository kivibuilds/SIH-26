# VerifyX Blockchain

The `DocumentVerification` contract stores a document SHA-256 hash, timestamp,
registering wallet, and audit status. It also exposes document verification and
revocation operations.

## Local deployment

```powershell
cd D:\SIH-26\backend\blockchain
npm install
npm run compile
```

Start a local chain in one terminal:

```powershell
npm run node
```

Deploy in another terminal:

```powershell
npm run deploy:local
```

Set the printed address in `backend/.env` as
`BLOCKCHAIN_CONTRACT_ADDRESS`. Set `HARDHAT_PRIVATE_KEY` to one of the local
Hardhat account private keys. The Python backend uses `BLOCKCHAIN_RPC_URL` to
connect to the node.