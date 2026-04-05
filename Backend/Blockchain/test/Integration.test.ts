import { expect } from "chai";
import { ethers } from "hardhat";
import { ElectionFactory, CollegeVoting } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Integration Tests - Multi-Contract Interactions", function () {
  let electionFactory: ElectionFactory;
  let admin: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;

  const ElectionType = {
    SINGLE_CHOICE: 0,
    MULTIPLE_CHOICE: 1,
    RANKED_VOTING: 2
  };

  const ElectionStatus = {
    PENDING: 0,
    ACTIVE: 1,
    ENDED: 2,
    CANCELLED: 3
  };

  beforeEach(async function () {
    [admin, creator1, creator2, voter1, voter2, voter3] = await ethers.getSigners();
    
    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    electionFactory = await ElectionFactory.deploy();
    await electionFactory.deployed();
  });

  describe("Factory-Election Integration", function () {
    it("Should deploy election and verify creator permissions", async function () {
      // Authorize creator through factory
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      // Deploy election through factory
      const tx = await electionFactory.connect(creator1).deployElection("Test Election", "College");
      const receipt = await tx.wait();
      
      const event = receipt.events?.find(e => e.event === "ElectionDeployed");
      const electionAddress = event?.args?.electionContract;
      
      // Get deployed election contract
      const deployedElection = await ethers.getContractAt("CollegeVoting", electionAddress) as CollegeVoting;
      
      // Verify creator is admin of deployed election
      expect(await deployedElection.admin()).to.equal(creator1.address);
      expect(await deployedElection.isAuthorizedCreator(creator1.address)).to.be.true;
    });

    it("Should handle multiple elections from same creator", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      // Deploy multiple elections
      const elections: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const tx = await electionFactory.connect(creator1).deployElection(`Election ${i}`, "College");
        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === "ElectionDeployed");
        elections.push(event?.args?.electionContract);
      }
      
      // Verify all elections are tracked
      const creatorElections = await electionFactory.getElectionsByCreator(creator1.address);
      expect(creatorElections.length).to.equal(3);
      
      // Verify each election has correct admin
      for (const electionAddress of elections) {
        const election = await ethers.getContractAt("CollegeVoting", electionAddress) as CollegeVoting;
        expect(await election.admin()).to.equal(creator1.address);
      }
    });

    it("Should handle elections from multiple creators", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      await electionFactory.connect(admin).authorizeCreator(creator2.address);
      
      // Deploy elections from different creators
      const tx1 = await electionFactory.connect(creator1).deployElection("Election 1", "College");
      const receipt1 = await tx1.wait();
      const election1Address = receipt1.events?.find(e => e.event === "ElectionDeployed")?.args?.electionContract;
      
      const tx2 = await electionFactory.connect(creator2).deployElection("Election 2", "Corporate");
      const receipt2 = await tx2.wait();
      const election2Address = receipt2.events?.find(e => e.event === "ElectionDeployed")?.args?.electionContract;
      
      // Verify elections have correct admins
      const election1 = await ethers.getContractAt("CollegeVoting", election1Address) as CollegeVoting;
      const election2 = await ethers.getContractAt("CollegeVoting", election2Address) as CollegeVoting;
      
      expect(await election1.admin()).to.equal(creator1.address);
      expect(await election2.admin()).to.equal(creator2.address);
      
      // Verify factory tracking
      const creator1Elections = await electionFactory.getElectionsByCreator(creator1.address);
      const creator2Elections = await electionFactory.getElectionsByCreator(creator2.address);
      
      expect(creator1Elections.length).to.equal(1);
      expect(creator2Elections.length).to.equal(1);
      expect(creator1Elections[0]).to.equal(election1Address);
      expect(creator2Elections[0]).to.equal(election2Address);
    });
  });

  describe("Complete Election Workflow Integration", function () {
    let electionAddress: string;
    let election: CollegeVoting;

    beforeEach(async function () {
      // Setup: Deploy election through factory
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      const tx = await electionFactory.connect(creator1).deployElection("Integration Test Election", "College");
      const receipt = await tx.wait();
      
      electionAddress = receipt.events?.find(e => e.event === "ElectionDeployed")?.args?.electionContract;
      election = await ethers.getContractAt("CollegeVoting", electionAddress) as CollegeVoting;
    });

    it("Should complete full election lifecycle", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600; // 1 hour from now
      const endTime = startTime + 7200; // 2 hours after start

      // 1. Create election
      const createTx = await election.connect(creator1).createElection(
        "Full Lifecycle Election",
        "Testing complete workflow",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const createReceipt = await createTx.wait();
      const electionId = createReceipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // 2. Add candidates
      await election.connect(creator1).addCandidate(electionId, "Alice Johnson", "Experienced leader", "");
      await election.connect(creator1).addCandidate(electionId, "Bob Smith", "Fresh perspective", "");
      await election.connect(creator1).addCandidate(electionId, "Carol Davis", "Proven track record", "");

      // 3. Register voters
      const voters = [voter1.address, voter2.address, voter3.address];
      await election.connect(creator1).registerMultipleVoters(electionId, voters);

      // 4. Start election
      await time.increase(3600);
      await election.connect(creator1).startElection(electionId);

      // Verify election is active
      expect(await election.isElectionActive(electionId)).to.be.true;

      // 5. Cast votes
      await election.connect(voter1).castVote(electionId, [1]); // Vote for Alice
      await election.connect(voter2).castVote(electionId, [2]); // Vote for Bob
      await election.connect(voter3).castVote(electionId, [1]); // Vote for Alice

      // 6. End election
      await time.increase(7200);
      await election.connect(creator1).endElection(electionId);

      // 7. Verify results
      const [candidateVotes, totalVotes] = await election.getElectionResults(electionId);
      expect(totalVotes).to.equal(3);
      expect(candidateVotes[0]).to.equal(2); // Alice: 2 votes
      expect(candidateVotes[1]).to.equal(1); // Bob: 1 vote
      expect(candidateVotes[2]).to.equal(0); // Carol: 0 votes

      // 8. Verify factory still tracks the election
      const creatorElections = await electionFactory.getElectionsByCreator(creator1.address);
      expect(creatorElections).to.include(electionAddress);
    });

    it("Should handle multiple concurrent elections", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      // Create multiple elections in the same contract
      const electionIds: number[] = [];
      
      for (let i = 1; i <= 3; i++) {
        const tx = await election.connect(creator1).createElection(
          `Concurrent Election ${i}`,
          `Description ${i}`,
          startTime,
          endTime,
          ElectionType.SINGLE_CHOICE,
          true,
          1
        );
        const receipt = await tx.wait();
        const electionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();
        electionIds.push(electionId);

        // Add candidates to each election
        await election.connect(creator1).addCandidate(electionId, `Candidate A${i}`, `Description A${i}`, "");
        await election.connect(creator1).addCandidate(electionId, `Candidate B${i}`, `Description B${i}`, "");

        // Register voters
        await election.connect(creator1).registerVoter(electionId, voter1.address);
        await election.connect(creator1).registerVoter(electionId, voter2.address);
      }

      // Start all elections
      await time.increase(3600);
      for (const electionId of electionIds) {
        await election.connect(creator1).startElection(electionId);
        expect(await election.isElectionActive(electionId)).to.be.true;
      }

      // Vote in all elections
      for (let i = 0; i < electionIds.length; i++) {
        const electionId = electionIds[i];
        await election.connect(voter1).castVote(electionId, [1]); // Vote for candidate A
        await election.connect(voter2).castVote(electionId, [2]); // Vote for candidate B
      }

      // End all elections
      await time.increase(7200);
      for (const electionId of electionIds) {
        await election.connect(creator1).endElection(electionId);
      }

      // Verify all results
      for (const electionId of electionIds) {
        const [candidateVotes, totalVotes] = await election.getElectionResults(electionId);
        expect(totalVotes).to.equal(2);
        expect(candidateVotes[0]).to.equal(1); // Candidate A: 1 vote
        expect(candidateVotes[1]).to.equal(1); // Candidate B: 1 vote
      }
    });

    it("Should handle cross-election voter management", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      // Create two elections
      const tx1 = await election.connect(creator1).createElection(
        "Election 1",
        "First election",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const receipt1 = await tx1.wait();
      const election1Id = receipt1.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      const tx2 = await election.connect(creator1).createElection(
        "Election 2",
        "Second election",
        startTime,
        endTime,
        ElectionType.MULTIPLE_CHOICE,
        true,
        2
      );
      const receipt2 = await tx2.wait();
      const election2Id = receipt2.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // Add candidates to both elections
      for (let i = 1; i <= 3; i++) {
        await election.connect(creator1).addCandidate(election1Id, `Candidate ${i}`, `Description ${i}`, "");
        await election.connect(creator1).addCandidate(election2Id, `Option ${i}`, `Option Description ${i}`, "");
      }

      // Register voters differently for each election
      await election.connect(creator1).registerVoter(election1Id, voter1.address);
      await election.connect(creator1).registerVoter(election1Id, voter2.address);
      
      await election.connect(creator1).registerVoter(election2Id, voter1.address);
      await election.connect(creator1).registerVoter(election2Id, voter3.address);

      // Start both elections
      await time.increase(3600);
      await election.connect(creator1).startElection(election1Id);
      await election.connect(creator1).startElection(election2Id);

      // Verify voter eligibility
      const [eligible1_1] = await election.getVoterStatus(election1Id, voter1.address);
      const [eligible1_3] = await election.getVoterStatus(election1Id, voter3.address);
      const [eligible2_1] = await election.getVoterStatus(election2Id, voter1.address);
      const [eligible2_2] = await election.getVoterStatus(election2Id, voter2.address);

      expect(eligible1_1).to.be.true;  // voter1 eligible for election1
      expect(eligible1_3).to.be.false; // voter3 not eligible for election1
      expect(eligible2_1).to.be.true;  // voter1 eligible for election2
      expect(eligible2_2).to.be.false; // voter2 not eligible for election2

      // Cast votes
      await election.connect(voter1).castVote(election1Id, [1]);
      await election.connect(voter2).castVote(election1Id, [2]);
      
      await election.connect(voter1).castVote(election2Id, [1, 2]);
      await election.connect(voter3).castVote(election2Id, [2, 3]);

      // Verify voter cannot vote in election they're not eligible for
      await expect(
        election.connect(voter3).castVote(election1Id, [1])
      ).to.be.revertedWith("You are not eligible to vote in this election");

      await expect(
        election.connect(voter2).castVote(election2Id, [1])
      ).to.be.revertedWith("You are not eligible to vote in this election");

      // End elections and verify results
      await time.increase(7200);
      await election.connect(creator1).endElection(election1Id);
      await election.connect(creator1).endElection(election2Id);

      const [votes1] = await election.getElectionResults(election1Id);
      const [votes2] = await election.getElectionResults(election2Id);

      expect(votes1[0]).to.equal(1); // Election 1: Candidate 1 got 1 vote
      expect(votes1[1]).to.equal(1); // Election 1: Candidate 2 got 1 vote
      
      expect(votes2[0]).to.equal(1); // Election 2: Option 1 got 1 vote
      expect(votes2[1]).to.equal(2); // Election 2: Option 2 got 2 votes
      expect(votes2[2]).to.equal(1); // Election 2: Option 3 got 1 vote
    });
  });

  describe("Factory Admin and Election Creator Integration", function () {
    it("Should handle factory admin transfer affecting election creation", async function () {
      // Initial setup
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      // Deploy election as creator1
      const tx1 = await electionFactory.connect(creator1).deployElection("Election 1", "College");
      const receipt1 = await tx1.wait();
      const election1Address = receipt1.events?.find(e => e.event === "ElectionDeployed")?.args?.electionContract;
      
      // Transfer factory admin to creator1
      await electionFactory.connect(admin).transferAdmin(creator1.address);
      
      // Verify creator1 is now factory admin
      expect(await electionFactory.admin()).to.equal(creator1.address);
      
      // creator1 (now factory admin) should be able to authorize new creators
      await electionFactory.connect(creator1).authorizeCreator(creator2.address);
      
      // creator2 should be able to deploy elections
      const tx2 = await electionFactory.connect(creator2).deployElection("Election 2", "Corporate");
      const receipt2 = await tx2.wait();
      const election2Address = receipt2.events?.find(e => e.event === "ElectionDeployed")?.args?.electionContract;
      
      // Verify both elections exist and have correct admins
      const election1 = await ethers.getContractAt("CollegeVoting", election1Address) as CollegeVoting;
      const election2 = await ethers.getContractAt("CollegeVoting", election2Address) as CollegeVoting;
      
      expect(await election1.admin()).to.equal(creator1.address);
      expect(await election2.admin()).to.equal(creator2.address);
      
      // Old admin should not be able to perform admin functions
      await expect(
        electionFactory.connect(admin).authorizeCreator(voter1.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should handle revoked creator with existing elections", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      // Deploy election
      const tx = await electionFactory.connect(creator1).deployElection("Test Election", "College");
      const receipt = await tx.wait();
      const electionAddress = receipt.events?.find(e => e.event === "ElectionDeployed")?.args?.electionContract;
      const election = await ethers.getContractAt("CollegeVoting", electionAddress) as CollegeVoting;
      
      // Create and setup election
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;
      
      const createTx = await election.connect(creator1).createElection(
        "Revoked Creator Election",
        "Testing revoked creator",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      const createReceipt = await createTx.wait();
      const electionId = createReceipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();
      
      await election.connect(creator1).addCandidate(electionId, "Candidate", "Description", "");
      await election.connect(creator1).registerVoter(electionId, voter1.address);
      
      // Revoke creator authorization from factory
      await electionFactory.connect(admin).revokeCreator(creator1.address);
      
      // Verify creator is revoked in factory
      expect(await electionFactory.authorizedCreators(creator1.address)).to.be.false;
      
      // But creator should still be admin of their existing election
      expect(await election.admin()).to.equal(creator1.address);
      
      // Creator should still be able to manage their existing election
      await time.increase(3600);
      await election.connect(creator1).startElection(electionId);
      
      // Vote should work
      await election.connect(voter1).castVote(electionId, [1]);
      
      // End election
      await time.increase(7200);
      await election.connect(creator1).endElection(electionId);
      
      // Results should be available
      const [candidateVotes, totalVotes] = await election.getElectionResults(electionId);
      expect(totalVotes).to.equal(1);
      expect(candidateVotes[0]).to.equal(1);
      
      // But creator should not be able to deploy new elections
      await expect(
        electionFactory.connect(creator1).deployElection("New Election", "College")
      ).to.be.revertedWith("Not authorized to create elections");
    });
  });

  describe("Error Handling and Edge Cases Integration", function () {
    it("Should handle election deployment failure gracefully", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      // Try to deploy with invalid parameters
      await expect(
        electionFactory.connect(creator1).deployElection("", "College")
      ).to.be.revertedWith("Title cannot be empty");
      
      await expect(
        electionFactory.connect(creator1).deployElection("Valid Title", "")
      ).to.be.revertedWith("Category cannot be empty");
      
      // Verify no elections were deployed
      expect(await electionFactory.deployedElectionsCount()).to.equal(0);
      
      const creatorElections = await electionFactory.getElectionsByCreator(creator1.address);
      expect(creatorElections.length).to.equal(0);
    });

    it("Should maintain consistency during complex operations", async function () {
      // Setup multiple creators and elections
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      await electionFactory.connect(admin).authorizeCreator(creator2.address);
      
      const elections: string[] = [];
      
      // Deploy elections from both creators
      for (let i = 1; i <= 5; i++) {
        const creator = i % 2 === 1 ? creator1 : creator2;
        const tx = await electionFactory.connect(creator).deployElection(`Election ${i}`, "College");
        const receipt = await tx.wait();
        elections.push(receipt.events?.find(e => e.event === "ElectionDeployed")?.args?.electionContract);
      }
      
      // Verify all elections are tracked correctly
      expect(await electionFactory.deployedElectionsCount()).to.equal(5);
      
      const creator1Elections = await electionFactory.getElectionsByCreator(creator1.address);
      const creator2Elections = await electionFactory.getElectionsByCreator(creator2.address);
      
      expect(creator1Elections.length).to.equal(3); // Elections 1, 3, 5
      expect(creator2Elections.length).to.equal(2); // Elections 2, 4
      
      // Verify category tracking
      const collegeElections = await electionFactory.getElectionsByCategory("College");
      expect(collegeElections.length).to.equal(5);
      
      // Verify pagination
      const [page1, total] = await electionFactory.getDeployedElections(0, 3);
      const [page2] = await electionFactory.getDeployedElections(3, 3);
      
      expect(total).to.equal(5);
      expect(page1.length).to.equal(3);
      expect(page2.length).to.equal(2);
      
      // Verify all elections are valid contracts
      for (const electionAddress of elections) {
        expect(await electionFactory.isDeployedElection(electionAddress)).to.be.true;
        
        const election = await ethers.getContractAt("CollegeVoting", electionAddress) as CollegeVoting;
        expect(await election.getElectionCount()).to.equal(0); // No elections created yet in individual contracts
      }
    });
  });
});