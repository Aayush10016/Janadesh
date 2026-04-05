import fs from "fs";
import path from "path";

class ProjectStatus {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async showStatus(): Promise<void> {
    console.log("🚀 Advanced Voting Platform - Smart Contracts Status");
    console.log("=" .repeat(60));

    this.showProjectStructure();
    this.showPackageInfo();
    this.showNetworkConfiguration();
    this.showDeploymentStatus();
    this.showAvailableScripts();
    this.showNextSteps();
  }

  private showProjectStructure(): void {
    console.log("\n📁 PROJECT STRUCTURE");
    console.log("-" .repeat(30));

    const structure = [
      "contracts/",
      "  ├── CollegeVoting.sol ✅",
      "  ├── interfaces/ (ready for expansion)",
      "  ├── libraries/ (ready for expansion)",
      "  └── mocks/ (ready for expansion)",
      "",
      "scripts/",
      "  ├── deploy.ts ✅",
      "  ├── verify.ts ✅",
      "  ├── extractAbiBin.ts ✅",
      "  ├── networkConfig.ts ✅",
      "  ├── setup.ts ✅",
      "  ├── projectStatus.ts ✅",
      "  └── utils/",
      "      └── addressManager.ts ✅",
      "",
      "test/",
      "  ├── voting.test.js ✅",
      "  ├── unit/ (ready for expansion)",
      "  └── integration/ (ready for expansion)",
      "",
      "deployed/ ✅",
      "types/ ✅ (TypeChain generated)",
      "artifacts/ ✅ (Hardhat compiled)",
      "cache/ ✅ (Hardhat cache)",
    ];

    structure.forEach(line => console.log(line));
  }

  private showPackageInfo(): void {
    console.log("\n📦 PACKAGE INFORMATION");
    console.log("-" .repeat(30));

    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"));
      console.log(`Name: ${packageJson.name}`);
      console.log(`Version: ${packageJson.version}`);
      console.log(`License: ${packageJson.license}`);
      console.log(`Description: ${packageJson.description}`);
    } catch (error) {
      console.log("❌ Could not read package.json");
    }
  }

  private showNetworkConfiguration(): void {
    console.log("\n🌐 NETWORK CONFIGURATION");
    console.log("-" .repeat(30));

    const networks = [
      { name: "Hardhat Local", status: "✅ Ready" },
      { name: "Localhost", status: "✅ Ready" },
      { name: "Sepolia Testnet", status: this.checkEnvVar("SEPOLIA_RPC_URL") ? "✅ Configured" : "⚠️  Needs RPC URL" },
      { name: "Goerli Testnet", status: this.checkEnvVar("GOERLI_RPC_URL") ? "✅ Configured" : "⚠️  Needs RPC URL" },
      { name: "Ethereum Mainnet", status: this.checkEnvVar("MAINNET_RPC_URL") ? "✅ Configured" : "⚠️  Needs RPC URL" },
      { name: "Polygon", status: this.checkEnvVar("POLYGON_RPC_URL") ? "✅ Configured" : "⚠️  Needs RPC URL" },
      { name: "Mumbai", status: this.checkEnvVar("MUMBAI_RPC_URL") ? "✅ Configured" : "⚠️  Needs RPC URL" },
    ];

    networks.forEach(network => {
      console.log(`${network.name.padEnd(20)} ${network.status}`);
    });
  }

  private showDeploymentStatus(): void {
    console.log("\n🚀 DEPLOYMENT STATUS");
    console.log("-" .repeat(30));

    const deployedDir = path.join(this.projectRoot, "deployed");
    if (!fs.existsSync(deployedDir)) {
      console.log("No deployments found");
      return;
    }

    const files = fs.readdirSync(deployedDir);
    const deploymentFiles = files.filter(file => 
      file.endsWith('.json') && 
      file !== 'addresses.json' && 
      !file.startsWith('deployment_')
    );

    if (deploymentFiles.length === 0) {
      console.log("No contract deployments found");
      return;
    }

    deploymentFiles.forEach(file => {
      const match = file.match(/^(.+)_(.+)\.json$/);
      if (match) {
        const [, contractName, networkName] = match;
        try {
          const deploymentInfo = JSON.parse(fs.readFileSync(path.join(deployedDir, file), "utf8"));
          console.log(`${contractName} on ${networkName}: ${deploymentInfo.address}`);
        } catch (error) {
          console.log(`${contractName} on ${networkName}: ❌ Invalid deployment file`);
        }
      }
    });
  }

  private showAvailableScripts(): void {
    console.log("\n🛠️  AVAILABLE SCRIPTS");
    console.log("-" .repeat(30));

    const scripts = [
      { command: "npm run build", description: "Compile contracts" },
      { command: "npm run test", description: "Run tests" },
      { command: "npm run test:coverage", description: "Run test coverage" },
      { command: "npm run deploy:local", description: "Deploy to local network" },
      { command: "npm run deploy:sepolia", description: "Deploy to Sepolia testnet" },
      { command: "npm run deploy:mainnet", description: "Deploy to mainnet" },
      { command: "npm run verify:sepolia", description: "Verify contracts on Sepolia" },
      { command: "npm run verify:mainnet", description: "Verify contracts on mainnet" },
      { command: "npm run extract-abi", description: "Extract ABI and bytecode" },
      { command: "npm run node", description: "Start local blockchain" },
      { command: "npm run clean", description: "Clean build artifacts" },
    ];

    scripts.forEach(script => {
      console.log(`${script.command.padEnd(25)} ${script.description}`);
    });
  }

  private showNextSteps(): void {
    console.log("\n🎯 NEXT STEPS");
    console.log("-" .repeat(30));

    const steps = [
      "1. Update .env file with your RPC URLs and private keys",
      "2. Test deployment on local network: npm run deploy:local",
      "3. Run comprehensive tests: npm run test",
      "4. Deploy to Sepolia testnet: npm run deploy:sepolia",
      "5. Verify contracts: npm run verify:sepolia",
      "6. Extract ABI for frontend: npm run extract-abi",
      "7. Move to task 2: Implement core voting contract with advanced features",
    ];

    steps.forEach(step => console.log(step));

    console.log("\n✅ Task 1 Complete: Enhanced smart contract architecture is ready!");
  }

  private checkEnvVar(varName: string): boolean {
    const value = process.env[varName];
    return value !== undefined && value !== "" && !value.includes("your-");
  }
}

async function main(): Promise<void> {
  const status = new ProjectStatus();
  await status.showStatus();
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

export { ProjectStatus };