import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  console.log("MockUSDC deployed to:", await mockUSDC.getAddress());

  // Deploy TuitionEscrow
  const TuitionEscrow = await ethers.getContractFactory("TuitionEscrow");
  const tuitionEscrow = await TuitionEscrow.deploy();
  await tuitionEscrow.waitForDeployment();
  console.log("TuitionEscrow deployed to:", await tuitionEscrow.getAddress());

  // Write TuitionEscrow ABI to a JSON file
  const abiPath = path.join(__dirname, "../frontend/src/lib/contracts.json");
  const abi = TuitionEscrow.interface.formatJson();
  fs.writeFileSync(abiPath, abi);
  console.log("TuitionEscrow ABI written to:", abiPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 