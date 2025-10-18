import { network } from 'hardhat';
import 'dotenv/config';

async function main() {
  // Get the network name from command line arguments
  const args = process.argv;
  const networkIndex = args.indexOf('--network');
  const networkName = networkIndex !== -1 && args[networkIndex + 1] ? args[networkIndex + 1] : 'hardhatMainnet';
  
  // Determine chain type based on network
  let chainType = 'l1';
  if (networkName.includes('op') || networkName.includes('optimism')) {
    chainType = 'op';
  }
  
  console.log('Upgrading contract on network:', networkName);
  
  const { viem } = await network.connect({
    network: networkName,
    chainType: chainType,
  });
  
  // Get wallet client for upgrade
  const walletClients = await viem.getWalletClients();
  console.log('Available wallet clients:', walletClients.length);
  
  if (walletClients.length === 0) {
    throw new Error('No wallet clients found. Make sure your private key is configured correctly.');
  }
  
  const senderClient = walletClients[0];
  const owner = senderClient.account.address;
  
  console.log('Upgrading with owner:', owner);
  
  // Get the current proxy address from environment
  const proxyAddress = process.env.MEMORY_REGISTRY_CONTRACT_ADDRESS;
  if (!proxyAddress) {
    throw new Error('MEMORY_REGISTRY_CONTRACT_ADDRESS environment variable is required');
  }
  
  console.log('Current proxy address:', proxyAddress);
  
  // Deploy the new implementation
  console.log('Deploying new implementation...');
  const newImplementation = await viem.deployContract('RecallOSMemoryRegistry');
  const newImplementationAddress = newImplementation.address;
  console.log('New implementation deployed at:', newImplementationAddress);
  
  // Get the proxy admin contract (we need to find the admin address first)
  const proxyContract = await viem.getContractAt('RecallOSProxy', proxyAddress as `0x${string}` );
  const adminAddress = await proxyContract.read.admin();
  console.log('Proxy admin address:', adminAddress);
  
  // Get the proxy admin contract
  const proxyAdminContract = await viem.getContractAt('RecallOSProxyAdmin', adminAddress);
  
  // Upgrade the proxy to point to the new implementation
  console.log('Upgrading proxy to new implementation...');
  const upgradeTx = await proxyAdminContract.write.upgradeAndCall([proxyAddress as `0x${string}`, newImplementationAddress as `0x${string}`, '0x' as `0x${string}`]);
  console.log('Upgrade transaction hash:', upgradeTx);

  console.log('Waiting for upgrade transaction to be mined...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('Upgrade transaction hash:', upgradeTx);
  
  // Verify the upgrade
  const registry = await viem.getContractAt('RecallOSMemoryRegistry', proxyAddress as `0x${string}`);
  const contractOwner = await registry.read.owner();
  console.log('Contract owner after upgrade:', contractOwner);
  
  // Authorize the relayer (backend wallet)
  console.log('Authorizing relayer...');
  const authorizeTx = await registry.write.authorizeRelayer([owner, true]);
  console.log('Relayer authorization transaction hash:', authorizeTx);
  
  // Wait for authorization transaction to be mined
  console.log('Waiting for authorization transaction to be mined...');
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  
  // Verify relayer authorization
  const isAuthorized = await registry.read.isAuthorizedRelayer([owner]);
  console.log('Relayer authorized:', isAuthorized);
  
  // Save upgrade info
  console.log('\nUpgrade Summary:');
  console.log('================');
  console.log('Proxy Address:', proxyAddress);
  console.log('New Implementation Address:', newImplementationAddress);
  console.log('Owner:', contractOwner);
  console.log('Relayer (Authorized):', owner);
  console.log('Network:', networkName);
  console.log('\nUpgrade completed successfully!');
  console.log('The contract now supports user gas deposits and relayer authorization.');
}

main().catch(error => {
  console.error('Upgrade failed:', error);
  process.exitCode = 1;
});
