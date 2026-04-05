import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface ContractAddresses {
  [contractName: string]: {
    [networkName: string]: string;
  };
}

interface DeploymentInfo {
  address: string;
  transactionHash: string;
  blockNumber: number;
  deployedAt: string;
  network: string;
}

class AddressManager {
  private addressesFile: string;
  private deployedDir: string;

  constructor() {
    this.deployedDir = path.join(process.cwd(), "deployed");
    this.addressesFile = path.join(this.deployedDir, "addresses.json");
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.deployedDir)) {
      fs.mkdirSync(this.deployedDir, { recursive: true });
    }
  }

  private loadAddresses(): ContractAddresses {
    if (!fs.existsSync(this.addressesFile)) {
      return {};
    }

    try {
      const content = fs.readFileSync(this.addressesFile, "utf8");
      return JSON.parse(content);
    } catch (error) {
      console.warn("Warning: Could not parse addresses.json, starting fresh");
      return {};
    }
  }

  private saveAddresses(addresses: ContractAddresses): void {
    fs.writeFileSync(this.addressesFile, JSON.stringify(addresses, null, 2));
  }

  setAddress(contractName: string, networkName: string, address: string): void {
    const addresses = this.loadAddresses();
    
    if (!addresses[contractName]) {
      addresses[contractName] = {};
    }
    
    addresses[contractName][networkName] = address;
    this.saveAddresses(addresses);
    
    console.log(`📝 Updated ${contractName} address for ${networkName}: ${address}`);
  }

  getAddress(contractName: string, networkName: string): string | null {
    const addresses = this.loadAddresses();
    return addresses[contractName]?.[networkName] || null;
  }

  getAllAddresses(): ContractAddresses {
    return this.loadAddresses();
  }

  getNetworkAddresses(networkName: string): Record<string, string> {
    const addresses = this.loadAddresses();
    const networkAddresses: Record<string, string> = {};
    
    Object.entries(addresses).forEach(([contractName, networks]) => {
      if (networks[networkName]) {
        networkAddresses[contractName] = networks[networkName];
      }
    });
    
    return networkAddresses;
  }

  removeAddress(contractName: string, networkName: string): void {
    const addresses = this.loadAddresses();
    
    if (addresses[contractName]?.[networkName]) {
      delete addresses[contractName][networkName];
      
      // Remove contract entry if no networks left
      if (Object.keys(addresses[contractName]).length === 0) {
        delete addresses[contractName];
      }
      
      this.saveAddresses(addresses);
      console.log(`🗑️  Removed ${contractName} address for ${networkName}`);
    }
  }

  updateFromDeploymentFile(contractName: string, networkName: string): boolean {
    const deploymentFile = path.join(this.deployedDir, `${contractName}_${networkName}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
      console.warn(`Deployment file not found: ${deploymentFile}`);
      return false;
    }

    try {
      const deploymentInfo: DeploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      this.setAddress(contractName, networkName, deploymentInfo.address);
      return true;
    } catch (error) {
      console.error(`Error reading deployment file ${deploymentFile}:`, error);
      return false;
    }
  }

  syncAllDeployments(): void {
    console.log("🔄 Syncing addresses from deployment files...");
    
    if (!fs.existsSync(this.deployedDir)) {
      console.log("No deployed directory found");
      return;
    }

    const files = fs.readdirSync(this.deployedDir);
    const deploymentFiles = files.filter(file => 
      file.endsWith('.json') && 
      file !== 'addresses.json' && 
      !file.startsWith('deployment_')
    );

    let syncCount = 0;
    deploymentFiles.forEach(file => {
      const match = file.match(/^(.+)_(.+)\.json$/);
      if (match) {
        const [, contractName, networkName] = match;
        if (this.updateFromDeploymentFile(contractName, networkName)) {
          syncCount++;
        }
      }
    });

    console.log(`✅ Synced ${syncCount} contract addresses`);
  }

  printAddresses(): void {
    const addresses = this.loadAddresses();
    
    console.log("\n📋 CONTRACT ADDRESSES");
    console.log("=" .repeat(60));
    
    if (Object.keys(addresses).length === 0) {
      console.log("No contract addresses found");
      return;
    }

    Object.entries(addresses).forEach(([contractName, networks]) => {
      console.log(`\n📄 ${contractName}:`);
      Object.entries(networks).forEach(([networkName, address]) => {
        const networkLabel = networkName.padEnd(12);
        console.log(`  ${networkLabel} ${address}`);
      });
    });
    
    console.log("=" .repeat(60));
  }

  exportForFrontend(outputPath?: string): void {
    const addresses = this.loadAddresses();
    const frontendConfig = {
      contracts: addresses,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
    };

    const outputFile = outputPath || path.join(process.cwd(), "contract-addresses.json");
    fs.writeFileSync(outputFile, JSON.stringify(frontendConfig, null, 2));
    
    console.log(`📤 Exported addresses for frontend: ${outputFile}`);
  }

  validateAddresses(): boolean {
    const addresses = this.loadAddresses();
    let isValid = true;

    console.log("🔍 Validating contract addresses...");

    Object.entries(addresses).forEach(([contractName, networks]) => {
      Object.entries(networks).forEach(([networkName, address]) => {
        // Basic Ethereum address validation
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          console.error(`❌ Invalid address for ${contractName} on ${networkName}: ${address}`);
          isValid = false;
        }
      });
    });

    if (isValid) {
      console.log("✅ All addresses are valid");
    }

    return isValid;
  }
}

async function main(): Promise<void> {
  const manager = new AddressManager();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "sync":
      manager.syncAllDeployments();
      break;
    case "list":
      manager.printAddresses();
      break;
    case "validate":
      manager.validateAddresses();
      break;
    case "export":
      const outputPath = args[1];
      manager.exportForFrontend(outputPath);
      break;
    default:
      console.log("📋 Address Manager Commands:");
      console.log("  sync     - Sync addresses from deployment files");
      console.log("  list     - List all contract addresses");
      console.log("  validate - Validate address formats");
      console.log("  export   - Export addresses for frontend");
      break;
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

export { AddressManager };