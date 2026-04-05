import { artifacts } from "hardhat";
import fs from "fs";
import path from "path";

interface ContractArtifact {
  contractName: string;
  abi: any[];
  bytecode: string;
  deployedBytecode: string;
  sourceName: string;
}

class ArtifactExtractor {
  private outputDir: string;

  constructor(outputDir: string = process.cwd()) {
    this.outputDir = outputDir;
  }

  async extractArtifacts(): Promise<void> {
    console.log("📦 Extracting contract artifacts...");

    try {
      // List of contracts to extract
      const contractNames = ["CollegeVoting"];

      for (const contractName of contractNames) {
        await this.extractContractArtifact(contractName);
      }

      console.log("✅ Artifact extraction completed!");
    } catch (error) {
      console.error("❌ Artifact extraction failed:", error);
      throw error;
    }
  }

  private async extractContractArtifact(contractName: string): Promise<void> {
    console.log(`\n📄 Extracting ${contractName} artifacts...`);

    try {
      const artifact = await artifacts.readArtifact(contractName);
      
      const contractArtifact: ContractArtifact = {
        contractName: artifact.contractName,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        deployedBytecode: artifact.deployedBytecode,
        sourceName: artifact.sourceName,
      };

      // Save individual files
      await this.saveABI(contractName, artifact.abi);
      await this.saveBytecode(contractName, artifact.bytecode);
      await this.saveFullArtifact(contractName, contractArtifact);

      console.log(`✅ ${contractName} artifacts extracted successfully`);
    } catch (error) {
      console.error(`❌ Failed to extract ${contractName} artifacts:`, error);
      throw error;
    }
  }

  private async saveABI(contractName: string, abi: any[]): Promise<void> {
    const filename = `${contractName}ABI.json`;
    const filepath = path.join(this.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(abi, null, 2));
    console.log(`📄 Saved ABI: ${filename}`);
  }

  private async saveBytecode(contractName: string, bytecode: string): Promise<void> {
    const filename = `${contractName}Bytecode.json`;
    const filepath = path.join(this.outputDir, filename);
    
    const bytecodeData = {
      bytecode: bytecode,
      extractedAt: new Date().toISOString(),
    };
    
    fs.writeFileSync(filepath, JSON.stringify(bytecodeData, null, 2));
    console.log(`📄 Saved Bytecode: ${filename}`);
  }

  private async saveFullArtifact(contractName: string, artifact: ContractArtifact): Promise<void> {
    const filename = `${contractName}Artifact.json`;
    const filepath = path.join(this.outputDir, filename);
    
    const fullArtifact = {
      ...artifact,
      extractedAt: new Date().toISOString(),
      version: "1.0.0",
    };
    
    fs.writeFileSync(filepath, JSON.stringify(fullArtifact, null, 2));
    console.log(`📄 Saved Full Artifact: ${filename}`);
  }
}

async function main(): Promise<void> {
  const extractor = new ArtifactExtractor();
  await extractor.extractArtifacts();
}

// Execute extraction
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { ArtifactExtractor };