import { ethers, network, artifacts } from "hardhat";
import { Contract } from "ethers";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface DeploymentConfig {
  networkName: string;
  createDefaultElection: boolean;
  defaultElectionName: string;
  defaultCandidateCount: number;
  verifyContracts: boolean;
  saveDeployment: boolean;
}

interface DeploymentResult {
  contractName: string;
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deploymentArgs: any[];
}

class ContractDeployer {
  private config: DeploymentConfig;
  private deploymentResults: DeploymentResult[] = [];

  constructor() {
    this.config = {
      networkName: network.name,
      createDefaultElection: process.env.DEPLOY_CREATE_DEFAULT_ELECTION === "true",
      defaultElectionName: process.env.DEFAULT_ELECTION_NAME || "General Election",
      defaultCandidateCount: parseInt(process.env.DEFAULT_CANDIDATE_COUNT || "2"),
      verifyContracts: process.env.DEPLOY_VERIFY_CONTRACTS === "true",
      saveDeployment: true,
    };
  }

  async deploy(): Promise<void> {
    console.log("🚀 Starting deployment process...");
    console.log(`📡 Network: ${this.config.networkName}`);
    console.log(`⛽ Gas Price: ${await this.getGasPrice()}`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deploying with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

    try {
      // Deploy ElectionFactory contract first
      const factoryContract = await this.deployElectionFactory(deployer);
      
      // Deploy main voting contract (for backward compatibility)
      const votingContract = await this.deployVotingContract(deployer);
      
      // Create default election if configured
      if (this.config.createDefaultElection) {
        await this.createDefaultElection(votingContract);
      }

      // Save deployment information
      if (this.config.saveDeployment) {
        await this.saveDeploymentInfo();
      }

      console.log("✅ Deployment completed successfully!");
      this.printDeploymentSummary();

    } catch (error) {
      console.error("❌ Deployment failed:", error);
      throw error;
    }
  }

  private async deployElectionFactory(deployer: any): Promise<Contract> {
    console.log("\n🏭 Deploying ElectionFactory contract...");
    
    const ElectionFactory = await ethers.getContractFactory("ElectionFactory", deployer);
    
    // Estimate gas for deployment
    const deploymentData = ElectionFactory.getDeployTransaction();
    const gasEstimate = await deployer.estimateGas(deploymentData);
    console.log(`⛽ Estimated gas for deployment: ${gasEstimate.toString()}`);

    const contract = await ElectionFactory.deploy();
    const deploymentTx = await contract.deployTransaction.wait();

    console.log(`✅ ElectionFactory deployed to: ${contract.address}`);
    console.log(`🔗 Transaction hash: ${deploymentTx.transactionHash}`);
    console.log(`📦 Block number: ${deploymentTx.blockNumber}`);
    console.log(`⛽ Gas used: ${deploymentTx.gasUsed.toString()}`);

    this.deploymentResults.push({
      contractName: "ElectionFactory",
      address: contract.address,
      transactionHash: deploymentTx.transactionHash,
      blockNumber: deploymentTx.blockNumber,
      gasUsed: deploymentTx.gasUsed.toString(),
      deploymentArgs: [],
    });

    return contract;
  }

  private async deployVotingContract(deployer: any): Promise<Contract> {
    console.log("\n📄 Deploying CollegeVoting contract...");
    
    const CollegeVoting = await ethers.getContractFactory("CollegeVoting", deployer);
    
    // Estimate gas for deployment
    const deploymentData = CollegeVoting.getDeployTransaction();
    const gasEstimate = await deployer.estimateGas(deploymentData);
    console.log(`⛽ Estimated gas for deployment: ${gasEstimate.toString()}`);

    const contract = await CollegeVoting.deploy();
    const deploymentTx = await contract.deployTransaction.wait();

    console.log(`✅ CollegeVoting deployed to: ${contract.address}`);
    console.log(`🔗 Transaction hash: ${deploymentTx.transactionHash}`);
    console.log(`📦 Block number: ${deploymentTx.blockNumber}`);
    console.log(`⛽ Gas used: ${deploymentTx.gasUsed.toString()}`);

    this.deploymentResults.push({
      contractName: "CollegeVoting",
      address: contract.address,
      transactionHash: deploymentTx.transactionHash,
      blockNumber: deploymentTx.blockNumber,
      gasUsed: deploymentTx.gasUsed.toString(),
      deploymentArgs: [],
    });

    return contract;
  }

  private async createDefaultElection(contract: Contract): Promise<void> {
    console.log("\n🗳️  Creating default election...");
    
    // The new createElection function requires different parameters
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime + 300; // Start in 5 minutes
    const endTime = startTime + 3600; // Run for 1 hour
    
    const tx = await contract.createElection(
      this.config.defaultElectionName,
      "Default election description",
      startTime,
      endTime,
      0, // ElectionType.SINGLE_CHOICE
      true, // isPublic
      1 // maxChoices
    );
    const receipt = await tx.wait();

    console.log(`✅ Election created: "${this.config.defaultElectionName}"`);
    console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
  }

  private async saveDeploymentInfo(): Promise<void> {
    console.log("\n💾 Saving deployment information...");

    // Ensure deployed directory exists
    const deployedDir = path.join(process.cwd(), "deployed");
    if (!fs.existsSync(deployedDir)) {
      fs.mkdirSync(deployedDir, { recursive: true });
    }

    // Save individual contract deployment info
    for (const result of this.deploymentResults) {
      const artifact = await artifacts.readArtifact(result.contractName);
      const deploymentInfo = {
        network: this.config.networkName,
        address: result.address,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        deploymentArgs: result.deploymentArgs,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        deployedAt: new Date().toISOString(),
      };

      const filename = `${result.contractName}_${this.config.networkName}.json`;
      const filepath = path.join(deployedDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
      console.log(`📄 Saved ${filename}`);
    }

    // Save network-specific deployment summary
    const summaryFilename = `deployment_${this.config.networkName}_${Date.now()}.json`;
    const summaryFilepath = path.join(deployedDir, summaryFilename);
    const summary = {
      network: this.config.networkName,
      deployedAt: new Date().toISOString(),
      deployer: (await ethers.getSigners())[0].address,
      contracts: this.deploymentResults,
      config: this.config,
    };
    fs.writeFileSync(summaryFilepath, JSON.stringify(summary, null, 2));
    console.log(`📄 Saved deployment summary: ${summaryFilename}`);
  }

  private async getGasPrice(): Promise<string> {
    const gasPrice = await ethers.provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, "gwei") + " gwei";
  }

  private printDeploymentSummary(): void {
    console.log("\n📋 DEPLOYMENT SUMMARY");
    console.log("=" .repeat(50));
    console.log(`Network: ${this.config.networkName}`);
    console.log(`Deployer: ${this.deploymentResults.length > 0 ? "✅" : "❌"}`);
    
    this.deploymentResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.contractName}`);
      console.log(`   Address: ${result.address}`);
      console.log(`   Gas Used: ${result.gasUsed}`);
      console.log(`   Block: ${result.blockNumber}`);
    });
    
    console.log("\n🎉 All contracts deployed successfully!");
    
    if (this.config.networkName !== "hardhat" && this.config.networkName !== "localhost") {
      console.log("\n⚠️  Remember to:");
      console.log("1. Update your .env file with the deployed contract addresses");
      console.log("2. Verify contracts on Etherscan if needed");
      console.log("3. Update your frontend configuration with new addresses");
    }
  }
}

async function main(): Promise<void> {
  const deployer = new ContractDeployer();
  await deployer.deploy();
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { ContractDeployer };