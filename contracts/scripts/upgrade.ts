import { ethers, upgrades } from "hardhat";
async function main() {
  const PROXY_ADDRESS = process.env.PROXY_CONTRACT_ADDRESS;
  if (!PROXY_ADDRESS) {
    throw new Error("Please set PROXY_CONTRACT_ADDRESS in your .env file");
  }
  const RecallOSMemoryRegistryV2 = await ethers.getContractFactory("RecallOSMemoryRegistry");
  console.log("Upgrading RecallOSMemoryRegistry...");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, RecallOSMemoryRegistryV2);
  console.log("RecallOSMemoryRegistry upgraded successfully!");
  console.log("Proxy address:", PROXY_ADDRESS);
  console.log("Implementation address:", await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});