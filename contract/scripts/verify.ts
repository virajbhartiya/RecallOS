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

  console.log('🔍 Verifying RecallOSMemoryRegistry Proxy...');
  console.log('Proxy address:', PROXY_ADDRESS);
  console.log('Network:', networkName);

  try {
    // Get the proxy instance
    const proxy = await viem.getContractAt('RecallOSProxy', PROXY_ADDRESS as `0x${string}`);
    
    // Get proxy information
    const implementation = await proxy.read.implementation();
    const admin = await proxy.read.admin();
    
    console.log('\nProxy Information:');
    console.log('==================');
    console.log('Implementation address:', implementation);
    console.log('Admin address:', admin);
    
    // Get the contract instance through proxy
    const contract = await viem.getContractAt('RecallOSMemoryRegistry', PROXY_ADDRESS as `0x${string}`);
    
    // Verify contract functionality
    const owner = await contract.read.owner();
    console.log('Contract owner:', owner);
    
    // Test a simple read function
    const testAddress = '0x0000000000000000000000000000000000000000';
    const memoryCount = await contract.read.getUserMemoryCount([testAddress]);
    console.log('Test memory count for zero address:', memoryCount.toString());
    
    console.log('\n✅ Contract verification successful!');
    console.log('The proxy is properly configured and the contract is functional.');
    
    console.log('\nContract Summary:');
    console.log('=================');
    console.log('Proxy Address (use this):', PROXY_ADDRESS);
    console.log('Implementation Address:', implementation);
    console.log('Admin:', admin);
    console.log('Owner:', owner);
    console.log('Network:', networkName);
    
  } catch (error) {
    console.log('❌ Contract verification failed:', (error as Error).message);
    console.log('Error details:', error);
    throw error;
  }
}

main().catch(error => {
  console.error('Verification failed:', error);
  process.exitCode = 1;
});

