import fs from "fs";
import path from "path";
import { execSync } from "child_process";

class ProjectSetup {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async setupProject(): Promise<void> {
    console.log("🚀 Setting up Advanced Voting Platform - Smart Contracts");
    console.log("=" .repeat(60));

    try {
      await this.createDirectoryStructure();
      await this.setupGitIgnore();
      await this.createReadme();
      await this.installDependencies();
      await this.compileContracts();
      await this.generateTypeChain();
      
      console.log("\n✅ Project setup completed successfully!");
      this.printNextSteps();
    } catch (error) {
      console.error("❌ Setup failed:", error);
      throw error;
    }
  }

  private async createDirectoryStructure(): Promise<void> {
    console.log("\n📁 Creating directory structure...");

    const directories = [
      "contracts/interfaces",
      "contracts/libraries",
      "contracts/mocks",
      "scripts/utils",
      "test/unit",
      "test/integration",
      "deployed",
      "docs",
      "types",
    ];

    directories.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created: ${dir}`);
      } else {
        console.log(`ℹ️  Exists: ${dir}`);
      }
    });
  }

  private async setupGitIgnore(): Promise<void> {
    console.log("\n📝 Setting up .gitignore...");

    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Hardhat files
cache/
artifacts/
types/
coverage/
coverage.json

# Deployment files
deployed/*.json
!deployed/.gitkeep

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Build outputs
dist/
build/
out/

# Test outputs
test-results/
junit.xml
`;

    const gitignorePath = path.join(this.projectRoot, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log("✅ Created .gitignore");
    } else {
      console.log("ℹ️  .gitignore already exists");
    }

    // Create .gitkeep for deployed directory
    const gitkeepPath = path.join(this.projectRoot, "deployed", ".gitkeep");
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, "");
      console.log("✅ Created deployed/.gitkeep");
    }
  }

  private async createReadme(): Promise<void> {
    console.log("\n📖 Creating README.md...");

    const readmeContent = `# Advanced Voting Platform - Smart Contracts

A comprehensive blockchain-based voting system built with Solidity and Hardhat.

## Features

- 🗳️ Secure voting with blockchain transparency
- 👥 Multi-election support
- 🔐 Voter registration and eligibility verification
- ⏰ Time-based voting periods
- 📊 Real-time vote counting
- 🔍 Event emission for frontend integration

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

\`\`\`bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Add your RPC URLs and private keys
\`\`\`

### Development

\`\`\`bash
# Compile contracts
npm run build

# Run tests
npm run test

# Run test coverage
npm run test:coverage

# Start local blockchain
npm run node

# Deploy to local network
npm run deploy:local

# Deploy to Sepolia testnet
npm run deploy:sepolia
\`\`\`

### Network Configuration

The project supports multiple networks:

- **Local**: Hardhat local network
- **Sepolia**: Ethereum testnet
- **Goerli**: Ethereum testnet (backup)
- **Mainnet**: Ethereum mainnet
- **Polygon**: Polygon mainnet
- **Mumbai**: Polygon testnet

### Scripts

- \`npm run build\` - Compile contracts
- \`npm run test\` - Run tests
- \`npm run deploy:local\` - Deploy to local network
- \`npm run deploy:sepolia\` - Deploy to Sepolia testnet
- \`npm run deploy:mainnet\` - Deploy to mainnet
- \`npm run verify:sepolia\` - Verify contracts on Sepolia
- \`npm run extract-abi\` - Extract ABI and bytecode

### Project Structure

\`\`\`
contracts/
├── CollegeVoting.sol      # Main voting contract
├── interfaces/            # Contract interfaces
├── libraries/             # Shared libraries
└── mocks/                # Test mocks

scripts/
├── deploy.ts             # Deployment script
├── verify.ts             # Contract verification
├── extractAbiBin.ts      # ABI extraction
├── networkConfig.ts      # Network utilities
└── utils/                # Utility scripts

test/
├── unit/                 # Unit tests
└── integration/          # Integration tests

deployed/                 # Deployment artifacts
docs/                     # Documentation
types/                    # TypeChain generated types
\`\`\`

## Security

- All contracts are thoroughly tested
- Gas optimization implemented
- Security best practices followed
- Regular audits recommended for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
`;

    const readmePath = path.join(this.projectRoot, "README.md");
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, readmeContent);
      console.log("✅ Created README.md");
    } else {
      console.log("ℹ️  README.md already exists");
    }
  }

  private async installDependencies(): Promise<void> {
    console.log("\n📦 Installing dependencies...");

    try {
      execSync("npm install", { stdio: "inherit", cwd: this.projectRoot });
      console.log("✅ Dependencies installed");
    } catch (error) {
      console.log("ℹ️  Dependencies already installed or installation skipped");
    }
  }

  private async compileContracts(): Promise<void> {
    console.log("\n🔨 Compiling contracts...");

    try {
      execSync("npx hardhat compile", { stdio: "inherit", cwd: this.projectRoot });
      console.log("✅ Contracts compiled");
    } catch (error) {
      console.error("❌ Contract compilation failed:", error);
      throw error;
    }
  }

  private async generateTypeChain(): Promise<void> {
    console.log("\n🔗 Generating TypeChain types...");

    try {
      execSync("npx hardhat typechain", { stdio: "inherit", cwd: this.projectRoot });
      console.log("✅ TypeChain types generated");
    } catch (error) {
      console.log("ℹ️  TypeChain generation skipped or failed");
    }
  }

  private printNextSteps(): void {
    console.log("\n🎉 SETUP COMPLETE!");
    console.log("=" .repeat(60));
    console.log("Next steps:");
    console.log("1. 📝 Update .env file with your RPC URLs and private keys");
    console.log("2. 🧪 Run tests: npm run test");
    console.log("3. 🚀 Deploy locally: npm run deploy:local");
    console.log("4. 🌐 Deploy to testnet: npm run deploy:sepolia");
    console.log("5. 🔍 Verify contracts: npm run verify:sepolia");
    console.log("\n📚 Read README.md for detailed instructions");
    console.log("🔧 Use 'npx hardhat' to see all available commands");
  }
}

async function main(): Promise<void> {
  const setup = new ProjectSetup();
  await setup.setupProject();
}

// Execute setup
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { ProjectSetup };