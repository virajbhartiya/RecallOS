import { network } from 'hardhat';
import 'dotenv/config';

async function main() {
  // Get the network name from command line arguments
  // In Hardhat 3, we need to check process.argv for the network
  const args = process.argv;
  const networkIndex = args.indexOf('--network');
  const networkName = networkIndex !== -1 && args[networkIndex + 1] ? args[networkIndex + 1] : 'hardhatMainnet';
  
  // Determine chain type based on network
  let chainType = 'l1';
  if (networkName.includes('op') || networkName.includes('optimism')) {
    chainType = 'op';
  }
  
  
  const { viem } = await network.connect({
    network: networkName,
    chainType: chainType,
  });
  


  // Deploy the implementation contract first
  const implementation = await viem.deployContract('RecallOSMemoryRegistry');
  const implementationAddress = implementation.address;
  
  // Get wallet client for deployment
  const walletClients = await viem.getWalletClients();
  
  if (walletClients.length === 0) {
    throw new Error('No wallet clients found. Make sure your private key is configured correctly.');
  }
  
  const senderClient = walletClients[0];
  const owner = senderClient.account.address;
  
  
  // Get the contract ABI to encode the initialize function call
  const contractArtifact = await viem.getContractAt('RecallOSMemoryRegistry', implementationAddress);
  
  // Encode the initialize function call manually
  // The initialize function has no parameters, so we just need the function selector
  const initializeData = '0x8129fc1c'; // This is the function selector for initialize()
  
  
  // Deploy RecallOSProxy with initialization data and admin
  const proxy = await viem.deployContract('RecallOSProxy', [
    implementationAddress,
    owner, // Admin address
    initializeData
  ]);
  const proxyAddress = proxy.address;
  
  // Wait for deployment to be mined
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get contract instance through proxy
  const registry = await viem.getContractAt('RecallOSMemoryRegistry', proxyAddress);
  
  // Verify deployment
  const contractOwner = await registry.read.owner();
  
  // Get proxy instance to verify admin
  const proxyContract = await viem.getContractAt('RecallOSProxy', proxyAddress);
  const adminAddress = await proxyContract.read.admin();
  
  // Save deployment info
}

main().catch(error => {
  console.error('Deployment failed:', error);
  process.exitCode = 1;
});
