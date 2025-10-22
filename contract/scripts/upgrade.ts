import { network } from 'hardhat';
import 'dotenv/config';

async function main() {
  const PROXY_ADDRESS = process.env.CONTRACT_ADDRESS;
  if (!PROXY_ADDRESS) {
    throw new Error('Please set CONTRACT_ADDRESS (proxy address) in your .env file');
  }

  // Get the network name from command line arguments
  const args = process.argv;
  const networkIndex = args.indexOf('--network');
  const networkName = networkIndex !== -1 && args[networkIndex + 1] ? args[networkIndex + 1] : 'hardhatMainnet';
  
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

  // Get the current proxy instance
  const proxy = await viem.getContractAt('RecallOSProxy', PROXY_ADDRESS as `0x${string}`);
  
  // Get current implementation and admin
  const currentImplementation = await proxy.read.implementation();
  const currentAdmin = await proxy.read.admin();
  
  
  // Get the ProxyAdmin contract instance
  const proxyAdmin = await viem.getContractAt('RecallOSProxyAdmin', currentAdmin);
  
  // Check if the caller is the owner of the ProxyAdmin
  const proxyAdminOwner = await proxyAdmin.read.owner();
  
  if (proxyAdminOwner.toLowerCase() !== owner.toLowerCase()) {
    throw new Error(`Only the ProxyAdmin owner (${proxyAdminOwner}) can upgrade the contract. Current caller: ${owner}`);
  }

  // Deploy new implementation
  const newImplementation = await viem.deployContract('RecallOSMemoryRegistry');
  const newImplementationAddress = newImplementation.address;

  // Upgrade the proxy to point to the new implementation using ProxyAdmin
  try {
    const txHash = await proxyAdmin.write.upgradeAndCall([
      PROXY_ADDRESS as `0x${string}`,
      newImplementationAddress,
      '0x' // Empty data
    ], {
      account: owner,
    });
    
    // Wait for transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify the upgrade
    const updatedImplementation = await proxy.read.implementation();
    
    if (updatedImplementation.toLowerCase() === newImplementationAddress.toLowerCase()) {
    } else {
    }
    
  } catch (error) {
    throw error;
  }

  // Get the contract instance through proxy to verify it still works
  const contract = await viem.getContractAt('RecallOSMemoryRegistry', PROXY_ADDRESS as `0x${string}`);
  const contractOwner = await contract.read.owner();
  
}

main().catch(error => {
  console.error('Upgrade failed:', error);
  process.exitCode = 1;
});
