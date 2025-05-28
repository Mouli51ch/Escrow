import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Verify environment variables
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "Set" : "Not set");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Set" : "Not set");
console.log("ETHERSCAN_API_KEY:", process.env.ETHERSCAN_API_KEY ? "Set" : "Not set");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};

export default config;
