import { ethers, upgrades } from "hardhat";
async function main() {
  const RecallOSMemoryRegistry = await ethers.getContractFactory("RecallOSMemoryRegistry");
  const registry = await upgrades.deployProxy(RecallOSMemoryRegistry, [], { 
    initializer: "initialize", 
    kind: "uups" 
  });
  await registry.waitForDeployment();
  console.log("RecallOSMemoryRegistry deployed at:", await registry.getAddress());
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});