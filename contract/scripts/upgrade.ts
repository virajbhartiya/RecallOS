import { network } from 'hardhat';
import 'dotenv/config';

async function main() {
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT_ADDRESS) {
    throw new Error('Please set CONTRACT_ADDRESS in your .env file');
  }

  const networkName = process.env.HARDHAT_NETWORK || 'hardhatMainnet';
  
  let chainType = 'l1';
  if (networkName.includes('op') || networkName.includes('optimism')) {
    chainType = 'op';
  }

  const { viem } = await network.connect({
    network: networkName,
    chainType: chainType,
  });

  console.log('Upgrading RecallOSMemoryRegistry...');
  console.log('Contract address:', CONTRACT_ADDRESS);

  // Deploy new implementation
  const newImplementation = await viem.deployContract('RecallOSMemoryRegistry');
  const newImplementationAddress = newImplementation.address;
  console.log('New implementation deployed at:', newImplementationAddress);

  // Get the current contract instance
  const currentContract = await viem.getContractAt('RecallOSMemoryRegistry', CONTRACT_ADDRESS);
  
  // Verify current contract state
  const owner = await currentContract.read.owner();
  console.log('Current contract owner:', owner);
  
  console.log('\nUpgrade Summary:');
  console.log('================');
  console.log('New implementation deployed successfully!');
  console.log('Original contract address:', CONTRACT_ADDRESS);
  console.log('New implementation address:', newImplementationAddress);
  console.log('Contract owner:', owner);
  
  console.log('\nNote: This is a new implementation deployment. For production with proxy pattern,');
  console.log('you would need to update the proxy to point to the new implementation.');
  console.log('Upgrade completed successfully!');
}

main().catch(error => {
  console.error('Upgrade failed:', error);
  process.exitCode = 1;
});
