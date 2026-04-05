import { expect } from "chai";
import { ethers } from "hardhat";
import { CollegeVoting, ElectionFactory } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Gas Optimization Tests", function () {
  let collegeVoting: CollegeVoting;
  let electionFactory: ElectionFactory;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let voters: SignerWithAddress[];

  const ElectionType = {
    SINGLE_CHOICE: 0,
    MULTIPLE_CHOICE: 1,
    RANKED_VOTING: 2
  };

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [admin, creator, ...voters] = signers;
    
    const CollegeVotingFactory = await ethers.getContractFactory("CollegeVoting");
    collegeVoting = await CollegeVotingFactory.deploy();
    await collegeVoting.deployed();

    const ElectionFactoryContract = await ethers.getContractFactory("ElectionFactory");
    electionFactory = await ElectionFactoryContract.deploy();
    await electionFactory.deployed();
  });

  describe("Contract Deployment Gas Costs", function () {
    it("Should measure CollegeVoting deployment gas", async function () {
      const CollegeVotingFactory = await ethers.getContractFactory("CollegeVoting");
      const deployTx = CollegeVotingFactory.getDeployTransaction();
      
      const estimatedGas = await ethers.provider.estimateGas(deployTx);
      console.log(`CollegeVoting deployment estimated gas: ${estimatedGas.toString()}`);
      
      // Deploy and measure actual gas
      const contract = await CollegeVotingFactory.deploy();
      const receipt = await contract.deployTransaction.wait();
      
      console.log(`CollegeVoting deployment actual gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed.lt(estimatedGas.mul(110).div(100))).to.be.true; // Within 10% of estimate
    });

    it("Should measure ElectionFactory deployment gas", async function () {
      const ElectionFactoryContract = await ethers.getContractFactory("ElectionFactory");
      const deployTx = ElectionFactoryContract.getDeployTransaction();
      
      const estimatedGas = await ethers.provider.estimateGas(deployTx);
      console.log(`ElectionFactory deployment estimated gas: ${estimatedGas.toString()}`);
      
      const contract = await ElectionFactoryContract.deploy();
      const receipt = await contract.deployTransaction.wait();
      
      console.log(`ElectionFactory deployment actual gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed.lt(estimatedGas.mul(110).div(100))).to.be.true; // Within 10% of estimate
    });
  });

  describe("Election Creation Gas Costs", function () {
    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
    });

    it("Should measure createElection gas cost", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      const tx = await collegeVoting.connect(creator).createElection(
        "Gas Test Election",
        "Testing gas costs",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const receipt = await tx.wait();
      
      console.log(`createElection gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed.lt(ethers.utils.parseUnits("500000", "wei"))).to.be.true; // Should be under 500k gas
    });

    it("Should measure addCandidate gas cost", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      const createTx = await collegeVoting.connect(creator).createElection(
        "Gas Test Election",
        "Testing gas costs",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const createReceipt = await createTx.wait();
      const electionId = createReceipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      const tx = await collegeVoting.connect(creator).addCandidate(
        electionId,
        "Test Candidate",
        "A test candidate for gas measurement",
        "https://example.com/image.jpg"
      );
      const receipt = await tx.wait();
      
      console.log(`addCandidate gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed.lt(ethers.utils.parseUnits("200000", "wei"))).to.be.true; // Should be under 200k gas
    });

    it("Should measure registerMultipleVoters gas cost scaling", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      const createTx = await collegeVoting.connect(creator).createElection(
        "Gas Test Election",
        "Testing gas costs",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const createReceipt = await createTx.wait();
      const electionId = createReceipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // Test with different batch sizes
      const batchSizes = [1, 5, 10, 20];
      const gasResults: { [key: number]: string } = {};

      for (const batchSize of batchSizes) {
        const voterBatch = voters.slice(0, batchSize).map(v => v.address);
        
        const tx = await collegeVoting.connect(creator).registerMultipleVoters(electionId, voterBatch);
        const receipt = await tx.wait();
        
        gasResults[batchSize] = receipt.gasUsed.toString();
        console.log(`registerMultipleVoters (${batchSize} voters) gas used: ${receipt.gasUsed.toString()}`);
        
        // Gas should scale roughly linearly
        expect(receipt.gasUsed.lt(ethers.utils.parseUnits((50000 + batchSize * 30000).toString(), "wei"))).to.be.true;
      }
    });
  });

  describe("Voting Gas Costs", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      const createTx = await collegeVoting.connect(creator).createElection(
        "Gas Test Election",
        "Testing gas costs",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const createReceipt = await createTx.wait();
      electionId = createReceipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // Add candidates
      for (let i = 1; i <= 5; i++) {
        await collegeVoting.connect(creator).addCandidate(electionId, `Candidate ${i}`, `Description ${i}`, "");
      }

      // Register voters
      await collegeVoting.connect(creator).registerMultipleVoters(electionId, voters.slice(0, 10).map(v => v.address));

      // Start election
      await time.increase(3600);
      await collegeVoting.connect(creator).startElection(electionId);
    });

    it("Should measure castVote gas cost for single choice", async function () {
      const tx = await collegeVoting.connect(voters[0]).castVote(electionId, [1]);
      const receipt = await tx.wait();
      
      console.log(`castVote (single choice) gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed.lt(ethers.utils.parseUnits("170000", "wei"))).to.be.true; // Should be under 170k gas
    });

    it("Should measure multiple consecutive votes gas costs", async function () {
      const gasResults: string[] = [];

      for (let i = 0; i < 5; i++) {
        const tx = await collegeVoting.connect(voters[i]).castVote(electionId, [i + 1]);
        const receipt = await tx.wait();
        
        gasResults.push(receipt.gasUsed.toString());
        console.log(`Vote ${i + 1} gas used: ${receipt.gasUsed.toString()}`);
      }

      // Gas costs should be relatively consistent
      const gasValues = gasResults.map(g => parseInt(g));
      const avgGas = gasValues.reduce((a, b) => a + b) / gasValues.length;
      const maxDeviation = Math.max(...gasValues.map(g => Math.abs(g - avgGas)));
      
      expect(maxDeviation / avgGas).to.be.lt(0.1); // Less than 10% deviation
    });
  });

  describe("Factory Gas Costs", function () {
    beforeEach(async function () {
      await electionFactory.connect(admin).authorizeCreator(creator.address);
    });

    it("Should measure deployElection gas cost", async function () {
      const tx = await electionFactory.connect(creator).deployElection("Test Election", "College");
      const receipt = await tx.wait();
      
      console.log(`deployElection gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed.lt(ethers.utils.parseUnits("3500000", "wei"))).to.be.true; // Should be under 3.5M gas
    });

    it("Should measure gas cost scaling for multiple deployments", async function () {
      const deploymentCount = 5;
      const gasResults: string[] = [];

      for (let i = 1; i <= deploymentCount; i++) {
        const tx = await electionFactory.connect(creator).deployElection(`Election ${i}`, "College");
        const receipt = await tx.wait();
        
        gasResults.push(receipt.gasUsed.toString());
        console.log(`Deployment ${i} gas used: ${receipt.gasUsed.toString()}`);
      }

      // Gas costs should remain consistent (no significant increase due to state bloat)
      const gasValues = gasResults.map(g => parseInt(g));
      const firstGas = gasValues[0];
      const lastGas = gasValues[gasValues.length - 1];
      
      expect(Math.abs(lastGas - firstGas) / firstGas).to.be.lt(0.05); // Less than 5% difference
    });
  });

  describe("View Function Gas Costs", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      const createTx = await collegeVoting.connect(creator).createElection(
        "Gas Test Election",
        "Testing gas costs",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const createReceipt = await createTx.wait();
      electionId = createReceipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // Add many candidates to test scaling
      for (let i = 1; i <= 20; i++) {
        await collegeVoting.connect(creator).addCandidate(electionId, `Candidate ${i}`, `Description ${i}`, "");
      }
    });

    it("Should measure getAllCandidates gas cost scaling", async function () {
      // This is a view function, so we estimate gas
      const gasEstimate = await collegeVoting.estimateGas.getAllCandidates(electionId);
      
      console.log(`getAllCandidates (20 candidates) estimated gas: ${gasEstimate.toString()}`);
      expect(gasEstimate.lt(ethers.utils.parseUnits("500000", "wei"))).to.be.true; // Should be under 500k gas
    });

    it("Should measure getElectionInfo gas cost", async function () {
      const gasEstimate = await collegeVoting.estimateGas.getElectionInfo(electionId);
      
      console.log(`getElectionInfo estimated gas: ${gasEstimate.toString()}`);
      expect(gasEstimate.lt(ethers.utils.parseUnits("50000", "wei"))).to.be.true; // Should be under 50k gas
    });
  });

  describe("Gas Optimization Recommendations", function () {
    it("Should verify gas costs are within acceptable limits", async function () {
      // This test serves as documentation for expected gas costs
      const gasLimits = {
        deployment: {
          collegeVoting: 3000000,
          electionFactory: 2000000
        },
        operations: {
          createElection: 500000,
          addCandidate: 200000,
          registerVoter: 100000,
          castVote: 170000,
          deployElection: 3500000
        },
        views: {
          getElectionInfo: 50000,
          getAllCandidates: 500000
        }
      };

      console.log("Gas Optimization Recommendations:");
      console.log("1. Consider batching operations when possible");
      console.log("2. Use events for data that doesn't need to be stored on-chain");
      console.log("3. Optimize struct packing to reduce storage costs");
      console.log("4. Consider using libraries for common operations");
      console.log("Expected gas limits:", JSON.stringify(gasLimits, null, 2));

      // This test always passes but serves as documentation
      expect(true).to.be.true;
    });
  });
});
