# Deployment Guide

## 🔐 Setting Up Your Private Key

### 1. Create Environment File

Create a `.env` file in the contract directory:

```bash
# Create the .env file
touch .env
```

### 2. Add Your Configuration

Add the following to your `.env` file:

```bash
# Sepolia Testnet (Recommended for testing)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Ethereum Mainnet (For production)
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
MAINNET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# OP Mainnet (For Optimism)
OP_MAINNET_RPC_URL=https://mainnet.optimism.io
OP_MAINNET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# OP Sepolia (For Optimism testnet)
OP_SEPOLIA_RPC_URL=https://sepolia.optimism.io
OP_SEPOLIA_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### 3. Get RPC URLs

#### Option A: Infura (Recommended)
1. Go to [infura.io](https://infura.io)
2. Create an account and project
3. Copy your project ID
4. Use: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

#### Option B: Alchemy
1. Go to [alchemy.com](https://alchemy.com)
2. Create an account and app
3. Copy your API key
4. Use: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

#### Option C: Public RPCs (Not recommended for production)
- Sepolia: `https://rpc.sepolia.org`
- Mainnet: `https://eth.llamarpc.com`

### 4. Get Your Private Key

#### From MetaMask:
1. Open MetaMask
2. Click on account details
3. Click "Export Private Key"
4. Enter your password
5. Copy the private key (starts with 0x)

#### From Hardware Wallet:
- Use a tool like `ethers` or `web3` to export
- **Never share your private key with anyone!**

## 🚀 Deployment Commands

### Deploy to Sepolia (Recommended for testing)
```bash
npm run deploy:sepolia
```

### Deploy to Ethereum Mainnet
```bash
npm run deploy:mainnet
```

### Deploy to Optimism Mainnet
```bash
npm run deploy:op
```

### Deploy to Local Network (for testing)
```bash
npm run deploy
```

## 🔄 Upgrade Commands

### Upgrade on Sepolia
```bash
CONTRACT_ADDRESS=0x... npm run upgrade:sepolia
```

### Upgrade on Mainnet
```bash
CONTRACT_ADDRESS=0x... npm run upgrade:mainnet
```

### Upgrade on Optimism
```bash
CONTRACT_ADDRESS=0x... npm run upgrade:op
```

## 💰 Gas and Fees

### Sepolia Testnet
- **Free**: Get testnet ETH from faucets
- **Faucets**: 
  - [sepoliafaucet.com](https://sepoliafaucet.com)
  - [faucet.sepolia.dev](https://faucet.sepolia.dev)

### Mainnet Costs
- **Ethereum**: ~$50-200 depending on gas prices
- **Optimism**: ~$5-20 (much cheaper)

## 🔍 Verification

After deployment, verify your contract:

1. **Copy the contract address** from deployment output
2. **Go to the block explorer**:
   - Ethereum: [etherscan.io](https://etherscan.io)
   - Optimism: [optimistic.etherscan.io](https://optimistic.etherscan.io)
3. **Search for your contract address**
4. **Verify the deployment**

## 🛡️ Security Best Practices

### 1. Private Key Security
- ✅ **Never commit** `.env` to git
- ✅ **Use hardware wallets** for mainnet
- ✅ **Test on testnets first**
- ❌ **Never share** your private key

### 2. Deployment Process
- ✅ **Test thoroughly** on testnets
- ✅ **Verify contracts** after deployment
- ✅ **Keep deployment records**
- ✅ **Monitor gas prices**

### 3. Network Selection
- 🧪 **Sepolia**: For testing and development
- 🚀 **Mainnet**: For production (expensive)
- ⚡ **Optimism**: For production (cheaper)

## 📋 Pre-Deployment Checklist

- [ ] Private key configured in `.env`
- [ ] RPC URL configured
- [ ] Sufficient ETH for gas fees
- [ ] Contract compiled successfully
- [ ] Tests passing
- [ ] Network selected (testnet first!)

## 🆘 Troubleshooting

### "Insufficient funds"
- Add more ETH to your account
- Check gas price estimates

### "Invalid private key"
- Ensure private key starts with `0x`
- Check for extra spaces or characters

### "Network error"
- Verify RPC URL is correct
- Check network connectivity
- Try a different RPC provider

### "Contract verification failed"
- Ensure contract is deployed
- Check contract address
- Verify network matches

## 📞 Support

If you encounter issues:
1. Check the error message carefully
2. Verify your `.env` configuration
3. Test on Sepolia first
4. Check gas prices and network status
