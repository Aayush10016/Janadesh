import { expect } from "chai";
import { ethers } from "hardhat";
import { CollegeVoting } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("CollegeVoting Advanced Features", function () {
  let collegeVoting: CollegeVoting;
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let unauthorized: SignerWithAddress;

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
    [admin, creator, voter1, voter2, voter3, unauthorized] = await ethers.getSigners();
    
    const CollegeVotingFactory = await ethers.getContractFactory("CollegeVoting");
    collegeVoting = await CollegeVotingFactory.deploy();
    await collegeVoting.deployed();
  });

  describe("Election Creator Authorization", function () {
    it("Should allow admin to authorize election creators", async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      expect(await collegeVoting.isAuthorizedCreator(creator.address)).to.be.true;
    });

    it("Should allow admin to revoke election creator authorization", async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      await collegeVoting.connect(admin).revokeElectionCreator(creator.address);
      expect(await collegeVoting.isAuthorizedCreator(creator.address)).to.be.false;
    });

    it("Should not allow revoking admin privileges", async function () {
      await expect(
        collegeVoting.connect(admin).revokeElectionCreator(admin.address)
      ).to.be.revertedWith("Cannot revoke admin privileges");
    });

    it("Should not allow unauthorized users to create elections", async function () {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const endTime = futureTime + 7200; // 2 hours after start

      await expect(
        collegeVoting.connect(unauthorized).createElection(
          "Test Election",
          "Test Description",
          futureTime,
          endTime,
          ElectionType.SINGLE_CHOICE,
          true,
          1
        )
      ).to.be.revertedWith("Not authorized to create elections");
    });
  });

  describe("Advanced Election Creation", function () {
    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
    });

    it("Should create election with all advanced features", async function () {
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 7200; // 2 hours from now
      const endTime = startTime + 7200;

      const tx = await collegeVoting.connect(creator).createElection(
        "Advanced Election",
        "This is an advanced election with multiple features",
        startTime,
        endTime,
        ElectionType.MULTIPLE_CHOICE,
        true,
        3
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "ElectionCreated");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.title).to.equal("Advanced Election");
      expect(event?.args?.creator).to.equal(creator.address);
      expect(event?.args?.electionType).to.equal(ElectionType.MULTIPLE_CHOICE);
    });

    it("Should validate time ranges", async function () {
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const pastTime = currentTime - 3600;
      const futureTime = currentTime + 7200; // 2 hours from now

      // Start time in past
      await expect(
        collegeVoting.connect(creator).createElection(
          "Test Election",
          "Test Description",
          pastTime,
          futureTime,
          ElectionType.SINGLE_CHOICE,
          true,
          1
        )
      ).to.be.revertedWith("Start time must be in the future");

      // End time before start time
      await expect(
        collegeVoting.connect(creator).createElection(
          "Test Election",
          "Test Description",
          futureTime,
          futureTime - 1800,
          ElectionType.SINGLE_CHOICE,
          true,
          1
        )
      ).to.be.revertedWith("End time must be after start time");

      // Duration too short
      await expect(
        collegeVoting.connect(creator).createElection(
          "Test Election",
          "Test Description",
          futureTime,
          futureTime + 1800, // 30 minutes
          ElectionType.SINGLE_CHOICE,
          true,
          1
        )
      ).to.be.revertedWith("Election must run for at least 1 hour");
    });

    it("Should validate multiple choice parameters", async function () {
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 7200; // 2 hours from now
      const endTime = startTime + 7200;

      await expect(
        collegeVoting.connect(creator).createElection(
          "Test Election",
          "Test Description",
          startTime,
          endTime,
          ElectionType.MULTIPLE_CHOICE,
          true,
          1 // Invalid: multiple choice must allow more than 1 choice
        )
      ).to.be.revertedWith("Multiple choice elections must allow more than 1 choice");
    });
  });

  describe("Candidate Management", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 7200; // 2 hours from now
      const endTime = startTime + 7200;

      const tx = await collegeVoting.connect(creator).createElection(
        "Test Election",
        "Test Description",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );

      const receipt = await tx.wait();
      electionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();
    });

    it("Should add candidates with full information", async function () {
      const tx = await collegeVoting.connect(creator).addCandidate(
        electionId,
        "John Doe",
        "Experienced leader with vision for change",
        "https://example.com/john.jpg"
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "CandidateAdded");
      
      expect(event?.args?.candidateId).to.equal(1);
      expect(event?.args?.name).to.equal("John Doe");
      expect(event?.args?.description).to.equal("Experienced leader with vision for change");
    });

    it("Should update candidate information", async function () {
      await collegeVoting.connect(creator).addCandidate(
        electionId,
        "John Doe",
        "Original description",
        "https://example.com/john.jpg"
      );

      const tx = await collegeVoting.connect(creator).updateCandidate(
        electionId,
        1,
        "John Smith",
        "Updated description",
        "https://example.com/john-updated.jpg"
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "CandidateUpdated");
      
      expect(event?.args?.name).to.equal("John Smith");
      expect(event?.args?.description).to.equal("Updated description");
    });

    it("Should not allow adding candidates after election starts", async function () {
      // Start the election first
      await collegeVoting.connect(creator).addCandidate(electionId, "Test Candidate", "Description", "");
      
      // Fast forward time to start time
      await ethers.provider.send("evm_increaseTime", [7200]);
      await ethers.provider.send("evm_mine", []);
      
      await collegeVoting.connect(creator).startElection(electionId);

      await expect(
        collegeVoting.connect(creator).addCandidate(
          electionId,
          "Late Candidate",
          "Description",
          ""
        )
      ).to.be.revertedWith("Cannot add candidates after election starts");
    });
  });

  describe("Voter Eligibility Management", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 7200; // 2 hours from now
      const endTime = startTime + 7200;

      const tx = await collegeVoting.connect(creator).createElection(
        "Test Election",
        "Test Description",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );

      const receipt = await tx.wait();
      electionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();
    });

    it("Should register single voter", async function () {
      const tx = await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "VoterRegistered");
      
      expect(event?.args?.voter).to.equal(voter1.address);
      
      const [isEligible] = await collegeVoting.getVoterStatus(electionId, voter1.address);
      expect(isEligible).to.be.true;
    });

    it("Should register multiple voters at once", async function () {
      const voters = [voter1.address, voter2.address, voter3.address];
      
      const tx = await collegeVoting.connect(creator).registerMultipleVoters(electionId, voters);
      const receipt = await tx.wait();
      
      const events = receipt.events?.filter(e => e.event === "VoterRegistered");
      expect(events?.length).to.equal(3);
      
      for (const voterAddr of voters) {
        const [isEligible] = await collegeVoting.getVoterStatus(electionId, voterAddr);
        expect(isEligible).to.be.true;
      }
    });

    it("Should revoke voter eligibility", async function () {
      await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
      
      const tx = await collegeVoting.connect(creator).revokeVoterEligibility(electionId, voter1.address);
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "VoterEligibilityRevoked");
      
      expect(event?.args?.voter).to.equal(voter1.address);
      
      const [isEligible] = await collegeVoting.getVoterStatus(electionId, voter1.address);
      expect(isEligible).to.be.false;
    });
  });

  describe("Time-based Election Management", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 7200; // 2 hours from now
      const endTime = startTime + 7200;

      const tx = await collegeVoting.connect(creator).createElection(
        "Test Election",
        "Test Description",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );

      const receipt = await tx.wait();
      electionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();
      
      // Add a candidate
      await collegeVoting.connect(creator).addCandidate(electionId, "Test Candidate", "Description", "");
    });

    it("Should not start election before start time", async function () {
      await expect(
        collegeVoting.connect(creator).startElection(electionId)
      ).to.be.revertedWith("Election start time not reached");
    });

    it("Should start election at correct time", async function () {
      // Fast forward to start time
      await ethers.provider.send("evm_increaseTime", [7200]);
      await ethers.provider.send("evm_mine", []);

      const tx = await collegeVoting.connect(creator).startElection(electionId);
      const receipt = await tx.wait();
      
      const statusEvent = receipt.events?.find(e => e.event === "ElectionStatusChanged");
      const startEvent = receipt.events?.find(e => e.event === "ElectionStarted");
      
      expect(statusEvent?.args?.newStatus).to.equal(ElectionStatus.ACTIVE);
      expect(startEvent).to.not.be.undefined;
      
      expect(await collegeVoting.isElectionActive(electionId)).to.be.true;
    });

    it("Should end election at correct time", async function () {
      // Start the election
      await ethers.provider.send("evm_increaseTime", [7200]);
      await ethers.provider.send("evm_mine", []);
      await collegeVoting.connect(creator).startElection(electionId);

      // Fast forward to end time
      await ethers.provider.send("evm_increaseTime", [7200]);
      await ethers.provider.send("evm_mine", []);

      const tx = await collegeVoting.connect(creator).endElection(electionId);
      const receipt = await tx.wait();
      
      const statusEvent = receipt.events?.find(e => e.event === "ElectionStatusChanged");
      const endEvent = receipt.events?.find(e => e.event === "ElectionEnded");
      
      expect(statusEvent?.args?.newStatus).to.equal(ElectionStatus.ENDED);
      expect(endEvent).to.not.be.undefined;
      
      expect(await collegeVoting.isElectionActive(electionId)).to.be.false;
    });
  });

  describe("Advanced Voting Features", function () {
    let singleChoiceElectionId: number;
    let multipleChoiceElectionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 3600; // 1 hour from now
      const endTime = startTime + 7200;

      // Create single choice election
      let tx = await collegeVoting.connect(creator).createElection(
        "Single Choice Election",
        "Test Description",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );
      let receipt = await tx.wait();
      singleChoiceElectionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // Create multiple choice election
      tx = await collegeVoting.connect(creator).createElection(
        "Multiple Choice Election",
        "Test Description",
        startTime,
        endTime,
        ElectionType.MULTIPLE_CHOICE,
        true,
        3
      );
      receipt = await tx.wait();
      multipleChoiceElectionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // Add candidates to both elections
      for (let i = 1; i <= 4; i++) {
        await collegeVoting.connect(creator).addCandidate(
          singleChoiceElectionId,
          `Candidate ${i}`,
          `Description ${i}`,
          ""
        );
        await collegeVoting.connect(creator).addCandidate(
          multipleChoiceElectionId,
          `Candidate ${i}`,
          `Description ${i}`,
          ""
        );
      }

      // Register voters
      await collegeVoting.connect(creator).registerVoter(singleChoiceElectionId, voter1.address);
      await collegeVoting.connect(creator).registerVoter(multipleChoiceElectionId, voter1.address);
      await collegeVoting.connect(creator).registerVoter(singleChoiceElectionId, voter2.address);
      await collegeVoting.connect(creator).registerVoter(multipleChoiceElectionId, voter2.address);

      // Start elections
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);
      await collegeVoting.connect(creator).startElection(singleChoiceElectionId);
      await collegeVoting.connect(creator).startElection(multipleChoiceElectionId);
    });

    it("Should allow single choice voting", async function () {
      const tx = await collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1]);
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "VoteCast");
      
      expect(event?.args?.voter).to.equal(voter1.address);
      expect(event?.args?.candidateIds).to.deep.equal([ethers.BigNumber.from(1)]);
      
      const [, hasVoted, choices] = await collegeVoting.getVoterStatus(singleChoiceElectionId, voter1.address);
      expect(hasVoted).to.be.true;
      expect(choices.map(c => c.toNumber())).to.deep.equal([1]);
    });

    it("Should allow multiple choice voting", async function () {
      const tx = await collegeVoting.connect(voter1).castVote(multipleChoiceElectionId, [1, 3, 4]);
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "VoteCast");
      
      expect(event?.args?.voter).to.equal(voter1.address);
      expect(event?.args?.candidateIds.map((id: any) => id.toNumber())).to.deep.equal([1, 3, 4]);
    });

    it("Should reject invalid single choice votes", async function () {
      await expect(
        collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1, 2])
      ).to.be.revertedWith("Single choice elections allow only one vote");
    });

    it("Should reject too many multiple choices", async function () {
      await expect(
        collegeVoting.connect(voter1).castVote(multipleChoiceElectionId, [1, 2, 3, 4])
      ).to.be.revertedWith("Too many choices selected");
    });

    it("Should reject duplicate candidate selections", async function () {
      await expect(
        collegeVoting.connect(voter1).castVote(multipleChoiceElectionId, [1, 1, 2])
      ).to.be.revertedWith("Duplicate candidate selection");
    });

    it("Should prevent double voting", async function () {
      await collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1]);
      
      await expect(
        collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [2])
      ).to.be.revertedWith("You have already voted in this election");
    });

    it("Should reject votes from ineligible voters", async function () {
      await expect(
        collegeVoting.connect(voter3).castVote(singleChoiceElectionId, [1])
      ).to.be.revertedWith("You are not eligible to vote in this election");
    });
  });

  describe("Results and Analytics", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 3600; // 1 hour from now
      const endTime = startTime + 7200;

      const tx = await collegeVoting.connect(creator).createElection(
        "Test Election",
        "Test Description",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );

      const receipt = await tx.wait();
      electionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      // Add candidates
      await collegeVoting.connect(creator).addCandidate(electionId, "Candidate 1", "Description 1", "");
      await collegeVoting.connect(creator).addCandidate(electionId, "Candidate 2", "Description 2", "");

      // Register and vote
      await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
      await collegeVoting.connect(creator).registerVoter(electionId, voter2.address);

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);
      await collegeVoting.connect(creator).startElection(electionId);

      await collegeVoting.connect(voter1).castVote(electionId, [1]);
      await collegeVoting.connect(voter2).castVote(electionId, [2]);

      // End election
      await ethers.provider.send("evm_increaseTime", [7200]);
      await ethers.provider.send("evm_mine", []);
      await collegeVoting.connect(creator).endElection(electionId);
    });

    it("Should provide comprehensive election information", async function () {
      const info = await collegeVoting.getElectionInfo(electionId);
      
      expect(info.title).to.equal("Test Election");
      expect(info.creator).to.equal(creator.address);
      expect(info.electionType).to.equal(ElectionType.SINGLE_CHOICE);
      expect(info.status).to.equal(ElectionStatus.ENDED);
      expect(info.totalVotes).to.equal(2);
      expect(info.candidateCount).to.equal(2);
    });

    it("Should provide detailed candidate information", async function () {
      const candidate1 = await collegeVoting.getCandidateInfo(electionId, 1);
      const candidate2 = await collegeVoting.getCandidateInfo(electionId, 2);
      
      expect(candidate1.name).to.equal("Candidate 1");
      expect(candidate1.voteCount).to.equal(1);
      expect(candidate2.name).to.equal("Candidate 2");
      expect(candidate2.voteCount).to.equal(1);
    });

    it("Should provide all candidates at once", async function () {
      const candidates = await collegeVoting.getAllCandidates(electionId);
      
      expect(candidates.names.length).to.equal(2);
      expect(candidates.names[0]).to.equal("Candidate 1");
      expect(candidates.names[1]).to.equal("Candidate 2");
      expect(candidates.voteCounts[0]).to.equal(1);
      expect(candidates.voteCounts[1]).to.equal(1);
    });

    it("Should provide election results after election ends", async function () {
      const [candidateVotes, totalVotes] = await collegeVoting.getElectionResults(electionId);
      
      expect(candidateVotes.length).to.equal(2);
      expect(candidateVotes[0]).to.equal(1);
      expect(candidateVotes[1]).to.equal(1);
      expect(totalVotes).to.equal(2);
    });

    it("Should not provide results before election ends", async function () {
      // Create a new active election
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const startTime = currentTime + 3600;
      const endTime = startTime + 7200;

      const tx = await collegeVoting.connect(creator).createElection(
        "Active Election",
        "Test Description",
        startTime,
        endTime,
        ElectionType.SINGLE_CHOICE,
        true,
        1
      );

      const receipt = await tx.wait();
      const activeElectionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

      await expect(
        collegeVoting.getElectionResults(activeElectionId)
      ).to.be.revertedWith("Election results not available yet");
    });
  });
});