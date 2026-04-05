import { run, network } from "hardhat";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface ContractVerificationInfo {
  name: string;
  address: string;
  constructorArguments: any[];
}

class ContractVerifier {
  private networkName: string;

  constructor() {
    this.networkName = network.name;
  }

  async verifyContracts(): Promise<void> {
    console.log("🔍 Starting contract verification process...");
    console.log(`📡 Network: ${this.networkName}`);

    if (this.networkName === "hardhat" || this.networkName === "localhost") {
      console.log("⚠️  Skipping verification for local network");
      return;
    }

    try {
      const contracts = await this.loadDeploymentInfo();
      
      for (const contract of contracts) {
        await this.verifyContract(contract);
      }

      console.log("✅ Contract verification completed!");
    } catch (error) {
      console.error("❌ Verification failed:", error);
      throw error;
    }
  }

  private async loadDeploymentInfo(): Promise<ContractVerificationInfo[]> {
    const deployedDir = path.join(process.cwd(), "deployed");
    const contracts: ContractVerificationInfo[] = [];

    // Load CollegeVoting contract info
    const votingContractFile = path.join(deployedDir, `CollegeVoting_${this.networkName}.json`);
    if (fs.existsSync(votingContractFile)) {
      const votingInfo = JSON.parse(fs.readFileSync(votingContractFile, "utf8"));
      contracts.push({
        name: "CollegeVoting",
        address: votingInfo.address,
        constructorArguments: votingInfo.deploymentArgs || [],
      });
    }

    if (contracts.length === 0) {
      throw new Error(`No deployment info found for network: ${this.networkName}`);
    }

    return contracts;
  }

  private async verifyContract(contract: ContractVerificationInfo): Promise<void> {
    console.log(`\n🔍 Verifying ${contract.name} at ${contract.address}...`);

    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
      });
      console.log(`✅ ${contract.name} verified successfully!`);
    } catch (error: any) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log(`ℹ️  ${contract.name} is already verified`);
      } else {
        console.error(`❌ Failed to verify ${contract.name}:`, error.message);
        throw error;
      }
    }
  }
}

async function main(): Promise<void> {
  const verifier = new ContractVerifier();
  await verifier.verifyContracts();
}

// Execute verification
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { ContractVerifier };