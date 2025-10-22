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
  
  
  const { viem } = await network.connect({
    network: networkName,
    chainType: chainType,
  });
  
  // Get wallet client for upgrade
  const walletClients = await viem.getWalletClients();
  
  if (walletClients.length === 0) {
    throw new Error('No wallet clients found. Make sure your private key is configured correctly.');
  }
  
  const senderClient = walletClients[0];
  const owner = senderClient.account.address;
  
  
  // Get the current proxy address from environment
  const proxyAddress = process.env.MEMORY_REGISTRY_CONTRACT_ADDRESS;
  if (!proxyAddress) {
    throw new Error('MEMORY_REGISTRY_CONTRACT_ADDRESS environment variable is required');
  }
  
  
  // Deploy the new implementation
  const newImplementation = await viem.deployContract('RecallOSMemoryRegistry');
  const newImplementationAddress = newImplementation.address;
  
  // Get the proxy admin contract (we need to find the admin address first)
  const proxyContract = await viem.getContractAt('RecallOSProxy', proxyAddress as `0x${string}` );
  const adminAddress = await proxyContract.read.admin();
  
  // Get the proxy admin contract
  const proxyAdminContract = await viem.getContractAt('RecallOSProxyAdmin', adminAddress);
  
  // Upgrade the proxy to point to the new implementation
  const upgradeTx = await proxyAdminContract.write.upgradeAndCall([proxyAddress as `0x${string}`, newImplementationAddress as `0x${string}`, '0x' as `0x${string}`]);

  await new Promise(resolve => setTimeout(resolve, 10000));
  
  
  // Verify the upgrade
  const registry = await viem.getContractAt('RecallOSMemoryRegistry', proxyAddress as `0x${string}`);
  const contractOwner = await registry.read.owner();
  
  // Authorize the relayer (backend wallet)
  const authorizeTx = await registry.write.authorizeRelayer([owner, true]);
  
  // Wait for authorization transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  
  // Verify relayer authorization
  const isAuthorized = await registry.read.isAuthorizedRelayer([owner]);
  
  // Save upgrade info
}

main().catch(error => {
  console.error('Upgrade failed:', error);
  process.exitCode = 1;
});
