import { network, ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

interface NetworkInfo {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

class NetworkManager {
  private static readonly NETWORK_CONFIGS: Record<string, NetworkInfo> = {
    hardhat: {
      name: "Hardhat Local",
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
      blockExplorer: "N/A",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isTestnet: true,
    },
    localhost: {
      name: "Localhost",
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
      blockExplorer: "N/A",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isTestnet: true,
    },
    sepolia: {
      name: "Sepolia Testnet",
      chainId: 11155111,
      rpcUrl: process.env.SEPOLIA_RPC_URL || "",
      blockExplorer: "https://sepolia.etherscan.io",
      nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
      isTestnet: true,
    },
    goerli: {
      name: "Goerli Testnet",
      chainId: 5,
      rpcUrl: process.env.GOERLI_RPC_URL || "",
      blockExplorer: "https://goerli.etherscan.io",
      nativeCurrency: { name: "Goerli Ether", symbol: "GOR", decimals: 18 },
      isTestnet: true,
    },
    mainnet: {
      name: "Ethereum Mainnet",
      chainId: 1,
      rpcUrl: process.env.MAINNET_RPC_URL || "",
      blockExplorer: "https://etherscan.io",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isTestnet: false,
    },
    polygon: {
      name: "Polygon Mainnet",
      chainId: 137,
      rpcUrl: process.env.POLYGON_RPC_URL || "",
      blockExplorer: "https://polygonscan.com",
      nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      isTestnet: false,
    },
    mumbai: {
      name: "Polygon Mumbai",
      chainId: 80001,
      rpcUrl: process.env.MUMBAI_RPC_URL || "",
      blockExplorer: "https://mumbai.polygonscan.com",
      nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      isTestnet: true,
    },
  };

  static getCurrentNetworkInfo(): NetworkInfo {
    const currentNetwork = network.name;
    const networkInfo = this.NETWORK_CONFIGS[currentNetwork];
    
    if (!networkInfo) {
      throw new Error(`Unsupported network: ${currentNetwork}`);
    }
    
    return networkInfo;
  }

  static getAllNetworks(): Record<string, NetworkInfo> {
    return this.NETWORK_CONFIGS;
  }

  static getTestnetNetworks(): Record<string, NetworkInfo> {
    return Object.fromEntries(
      Object.entries(this.NETWORK_CONFIGS).filter(([_, info]) => info.isTestnet)
    );
  }

  static getMainnetNetworks(): Record<string, NetworkInfo> {
    return Object.fromEntries(
      Object.entries(this.NETWORK_CONFIGS).filter(([_, info]) => !info.isTestnet)
    );
  }

  static async getNetworkStatus(): Promise<void> {
    const networkInfo = this.getCurrentNetworkInfo();
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.getBalance();
    const gasPrice = await ethers.provider.getGasPrice();
    const blockNumber = await ethers.provider.getBlockNumber();

    console.log("🌐 NETWORK STATUS");
    console.log("=" .repeat(50));
    console.log(`Network: ${networkInfo.name}`);
    console.log(`Chain ID: ${networkInfo.chainId}`);
    console.log(`RPC URL: ${networkInfo.rpcUrl}`);
    console.log(`Block Explorer: ${networkInfo.blockExplorer}`);
    console.log(`Is Testnet: ${networkInfo.isTestnet ? "Yes" : "No"}`);
    console.log(`Current Block: ${blockNumber}`);
    console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ${networkInfo.nativeCurrency.symbol}`);
    console.log("=" .repeat(50));
  }

  static validateNetworkConfig(): boolean {
    const networkInfo = this.getCurrentNetworkInfo();
    const currentNetwork = network.name;

    console.log(`🔍 Validating configuration for ${networkInfo.name}...`);

    // Check if RPC URL is configured for non-local networks
    if (!["hardhat", "localhost"].includes(currentNetwork)) {
      if (!networkInfo.rpcUrl || networkInfo.rpcUrl.includes("your-")) {
        console.error(`❌ RPC URL not configured for ${currentNetwork}`);
        return false;
      }
    }

    // Check if private key is configured for non-local networks
    if (!["hardhat", "localhost"].includes(currentNetwork)) {
      const privateKeyEnvVar = `${currentNetwork.toUpperCase()}_PRIVATE_KEY`;
      if (!process.env[privateKeyEnvVar]) {
        console.error(`❌ Private key not configured: ${privateKeyEnvVar}`);
        return false;
      }
    }

    console.log(`✅ Network configuration is valid`);
    return true;
  }
}

async function main(): Promise<void> {
  console.log("🔧 Network Configuration Tool\n");

  try {
    // Validate current network configuration
    const isValid = NetworkManager.validateNetworkConfig();
    
    if (!isValid) {
      console.log("\n⚠️  Please update your .env file with the correct configuration");
      process.exit(1);
    }

    // Display network status
    await NetworkManager.getNetworkStatus();

    // Display available networks
    console.log("\n📋 AVAILABLE NETWORKS");
    console.log("=" .repeat(50));
    
    const allNetworks = NetworkManager.getAllNetworks();
    Object.entries(allNetworks).forEach(([key, info]) => {
      const status = info.isTestnet ? "🧪 Testnet" : "🌐 Mainnet";
      console.log(`${key.padEnd(12)} - ${info.name} ${status}`);
    });

  } catch (error) {
    console.error("❌ Network configuration error:", error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { NetworkManager, NetworkInfo };