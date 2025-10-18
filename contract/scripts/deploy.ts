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
  
  console.log('Deploying to network:', networkName);
  
  const { viem } = await network.connect({
    network: networkName,
    chainType: chainType,
  });
  
  console.log('Viem client methods:', Object.getOwnPropertyNames(viem).filter(name => typeof viem[name] === 'function'));

  console.log('Deploying RecallOSMemoryRegistry...');

  // Deploy the implementation contract first
  const implementation = await viem.deployContract('RecallOSMemoryRegistry');
  const implementationAddress = implementation.address;
  console.log('Implementation deployed at:', implementationAddress);
  
  // Get wallet client for deployment
  const walletClients = await viem.getWalletClients();
  console.log('Available wallet clients:', walletClients.length);
  
  if (walletClients.length === 0) {
    throw new Error('No wallet clients found. Make sure your private key is configured correctly.');
  }
  
  const senderClient = walletClients[0];
  const owner = senderClient.account.address;
  
  console.log('Deploying proxy with owner:', owner);
  
  // Get the contract ABI to encode the initialize function call
  const contractArtifact = await viem.getContractAt('RecallOSMemoryRegistry', implementationAddress);
  
  // Encode the initialize function call manually
  // The initialize function has no parameters, so we just need the function selector
  const initializeData = '0x8129fc1c'; // This is the function selector for initialize()
  
  console.log('Initialize data:', initializeData);
  
  // Deploy RecallOSProxy with initialization data
  const proxy = await viem.deployContract('RecallOSProxy', [
    implementationAddress,
    initializeData
  ]);
  const proxyAddress = proxy.address;
  console.log('Proxy deployed at:', proxyAddress);
  
  // Get contract instance through proxy
  const registry = await viem.getContractAt('RecallOSMemoryRegistry', proxyAddress);
  
  // Wait for deployment to be mined
  console.log('Waiting for deployment to be mined...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Verify deployment
  const contractOwner = await registry.read.owner();
  console.log('Contract owner:', contractOwner);
  
  // Save deployment info
  console.log('\nDeployment Summary:');
  console.log('==================');
  console.log('Proxy Address:', proxyAddress);
  console.log('Implementation Address:', implementationAddress);
  console.log('Owner:', contractOwner);
  console.log('Network:', networkName);
  console.log('\nNote: This is a proxy deployment. The proxy address is the main contract address to use.');
}

main().catch(error => {
  console.error('Deployment failed:', error);
  process.exitCode = 1;
});
