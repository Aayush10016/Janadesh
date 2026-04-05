import { expect } from "chai";
import { ethers } from "hardhat";
import { CollegeVoting } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("CollegeVoting - Comprehensive Unit Tests", function () {
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

  describe("Contract Deployment", function () {
    it("Should set correct admin on deployment", async function () {
      expect(await collegeVoting.admin()).to.equal(admin.address);
    });

    it("Should initialize election count to zero", async function () {
      expect(await collegeVoting.getElectionCount()).to.equal(0);
    });

    it("Should authorize admin as election creator by default", async function () {
      expect(await collegeVoting.isAuthorizedCreator(admin.address)).to.be.true;
    });
  });

  describe("Access Control Functions", function () {
    describe("authorizeElectionCreator", function () {
      it("Should allow admin to authorize creators", async function () {
        await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
        expect(await collegeVoting.isAuthorizedCreator(creator.address)).to.be.true;
      });

      it("Should reject zero address", async function () {
        await expect(
          collegeVoting.connect(admin).authorizeElectionCreator(ethers.constants.AddressZero)
        ).to.be.revertedWith("Invalid creator address");
      });

      it("Should reject non-admin calls", async function () {
        await expect(
          collegeVoting.connect(creator).authorizeElectionCreator(voter1.address)
        ).to.be.revertedWith("Only admin can perform this action");
      });
    });

    describe("revokeElectionCreator", function () {
      beforeEach(async function () {
        await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      });

      it("Should allow admin to revoke creator authorization", async function () {
        await collegeVoting.connect(admin).revokeElectionCreator(creator.address);
        expect(await collegeVoting.isAuthorizedCreator(creator.address)).to.be.false;
      });

      it("Should not allow revoking admin privileges", async function () {
        await expect(
          collegeVoting.connect(admin).revokeElectionCreator(admin.address)
        ).to.be.revertedWith("Cannot revoke admin privileges");
      });

      it("Should reject non-admin calls", async function () {
        await expect(
          collegeVoting.connect(creator).revokeElectionCreator(voter1.address)
        ).to.be.revertedWith("Only admin can perform this action");
      });
    });
  });

  describe("Election Creation Functions", function () {
    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
    });

    describe("createElection", function () {
      it("Should create election with valid parameters", async function () {
        const currentTime = await time.latest();
        const startTime = currentTime + 3600; // 1 hour from now
        const endTime = startTime + 7200; // 2 hours after start

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
        const event = receipt.events?.find(e => e.event === "ElectionCreated");
        
        expect(event).to.not.be.undefined;
        expect(event?.args?.title).to.equal("Test Election");
        expect(event?.args?.creator).to.equal(creator.address);
        expect(await collegeVoting.getElectionCount()).to.equal(1);
      });

      it("Should reject empty title", async function () {
        const currentTime = await time.latest();
        const startTime = currentTime + 3600;
        const endTime = startTime + 7200;

        await expect(
          collegeVoting.connect(creator).createElection(
            "",
            "Description",
            startTime,
            endTime,
            ElectionType.SINGLE_CHOICE,
            true,
            1
          )
        ).to.be.revertedWith("Title cannot be empty");
      });

      it("Should reject past start time", async function () {
        const currentTime = await time.latest();
        const pastTime = currentTime - 3600;
        const endTime = currentTime + 3600;

        await expect(
          collegeVoting.connect(creator).createElection(
            "Test Election",
            "Description",
            pastTime,
            endTime,
            ElectionType.SINGLE_CHOICE,
            true,
            1
          )
        ).to.be.revertedWith("Start time must be in the future");
      });

      it("Should reject end time before start time", async function () {
        const currentTime = await time.latest();
        const startTime = currentTime + 7200;
        const endTime = startTime - 1800;

        await expect(
          collegeVoting.connect(creator).createElection(
            "Test Election",
            "Description",
            startTime,
            endTime,
            ElectionType.SINGLE_CHOICE,
            true,
            1
          )
        ).to.be.revertedWith("End time must be after start time");
      });

      it("Should reject duration less than 1 hour", async function () {
        const currentTime = await time.latest();
        const startTime = currentTime + 3600;
        const endTime = startTime + 1800; // 30 minutes

        await expect(
          collegeVoting.connect(creator).createElection(
            "Test Election",
            "Description",
            startTime,
            endTime,
            ElectionType.SINGLE_CHOICE,
            true,
            1
          )
        ).to.be.revertedWith("Election must run for at least 1 hour");
      });

      it("Should reject multiple choice with maxChoices <= 1", async function () {
        const currentTime = await time.latest();
        const startTime = currentTime + 3600;
        const endTime = startTime + 7200;

        await expect(
          collegeVoting.connect(creator).createElection(
            "Test Election",
            "Description",
            startTime,
            endTime,
            ElectionType.MULTIPLE_CHOICE,
            true,
            1
          )
        ).to.be.revertedWith("Multiple choice elections must allow more than 1 choice");
      });

      it("Should reject unauthorized creator", async function () {
        const currentTime = await time.latest();
        const startTime = currentTime + 3600;
        const endTime = startTime + 7200;

        await expect(
          collegeVoting.connect(unauthorized).createElection(
            "Test Election",
            "Description",
            startTime,
            endTime,
            ElectionType.SINGLE_CHOICE,
            true,
            1
          )
        ).to.be.revertedWith("Not authorized to create elections");
      });
    });
  });

  describe("Candidate Management Functions", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
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

    describe("addCandidate", function () {
      it("Should add candidate successfully", async function () {
        const tx = await collegeVoting.connect(creator).addCandidate(
          electionId,
          "John Doe",
          "Experienced leader",
          "https://example.com/john.jpg"
        );

        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === "CandidateAdded");
        
        expect(event?.args?.candidateId).to.equal(1);
        expect(event?.args?.name).to.equal("John Doe");
      });

      it("Should reject empty candidate name", async function () {
        await expect(
          collegeVoting.connect(creator).addCandidate(
            electionId,
            "",
            "Description",
            ""
          )
        ).to.be.revertedWith("Candidate name cannot be empty");
      });

      it("Should reject non-existent election", async function () {
        await expect(
          collegeVoting.connect(creator).addCandidate(
            999,
            "John Doe",
            "Description",
            ""
          )
        ).to.be.revertedWith("Election does not exist");
      });

      it("Should reject unauthorized user", async function () {
        await expect(
          collegeVoting.connect(unauthorized).addCandidate(
            electionId,
            "John Doe",
            "Description",
            ""
          )
        ).to.be.revertedWith("Only election creator or admin can perform this action");
      });
    });

    describe("updateCandidate", function () {
      beforeEach(async function () {
        await collegeVoting.connect(creator).addCandidate(
          electionId,
          "John Doe",
          "Original description",
          "https://example.com/john.jpg"
        );
      });

      it("Should update candidate successfully", async function () {
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

      it("Should reject invalid candidate ID", async function () {
        await expect(
          collegeVoting.connect(creator).updateCandidate(
            electionId,
            999,
            "John Smith",
            "Description",
            ""
          )
        ).to.be.revertedWith("Invalid candidate ID");
      });

      it("Should reject empty name", async function () {
        await expect(
          collegeVoting.connect(creator).updateCandidate(
            electionId,
            1,
            "",
            "Description",
            ""
          )
        ).to.be.revertedWith("Candidate name cannot be empty");
      });
    });
  });

  describe("Voter Management Functions", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
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

    describe("registerVoter", function () {
      it("Should register voter successfully", async function () {
        const tx = await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === "VoterRegistered");
        
        expect(event?.args?.voter).to.equal(voter1.address);
        
        const [isEligible] = await collegeVoting.getVoterStatus(electionId, voter1.address);
        expect(isEligible).to.be.true;
      });

      it("Should reject zero address", async function () {
        await expect(
          collegeVoting.connect(creator).registerVoter(electionId, ethers.constants.AddressZero)
        ).to.be.revertedWith("Invalid voter address");
      });

      it("Should reject duplicate registration", async function () {
        await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
        
        await expect(
          collegeVoting.connect(creator).registerVoter(electionId, voter1.address)
        ).to.be.revertedWith("Voter already registered");
      });
    });

    describe("registerMultipleVoters", function () {
      it("Should register multiple voters successfully", async function () {
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

      it("Should skip already registered voters", async function () {
        await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
        
        const voters = [voter1.address, voter2.address];
        const tx = await collegeVoting.connect(creator).registerMultipleVoters(electionId, voters);
        const receipt = await tx.wait();
        
        const events = receipt.events?.filter(e => e.event === "VoterRegistered");
        expect(events?.length).to.equal(1); // Only voter2 should be registered
      });

      it("Should reject array with zero address", async function () {
        const voters = [voter1.address, ethers.constants.AddressZero];
        
        await expect(
          collegeVoting.connect(creator).registerMultipleVoters(electionId, voters)
        ).to.be.revertedWith("Invalid voter address");
      });
    });

    describe("revokeVoterEligibility", function () {
      beforeEach(async function () {
        await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
      });

      it("Should revoke voter eligibility successfully", async function () {
        const tx = await collegeVoting.connect(creator).revokeVoterEligibility(electionId, voter1.address);
        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === "VoterEligibilityRevoked");
        
        expect(event?.args?.voter).to.equal(voter1.address);
        
        const [isEligible] = await collegeVoting.getVoterStatus(electionId, voter1.address);
        expect(isEligible).to.be.false;
      });

      it("Should reject non-registered voter", async function () {
        await expect(
          collegeVoting.connect(creator).revokeVoterEligibility(electionId, voter2.address)
        ).to.be.revertedWith("Voter not registered");
      });
    });
  });

  describe("Election Status Management Functions", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
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

    describe("startElection", function () {
      it("Should start election at correct time", async function () {
        await time.increase(3600); // Move to start time

        const tx = await collegeVoting.connect(creator).startElection(electionId);
        const receipt = await tx.wait();
        
        const statusEvent = receipt.events?.find(e => e.event === "ElectionStatusChanged");
        const startEvent = receipt.events?.find(e => e.event === "ElectionStarted");
        
        expect(statusEvent?.args?.newStatus).to.equal(ElectionStatus.ACTIVE);
        expect(startEvent).to.not.be.undefined;
        expect(await collegeVoting.isElectionActive(electionId)).to.be.true;
      });

      it("Should reject starting before start time", async function () {
        await expect(
          collegeVoting.connect(creator).startElection(electionId)
        ).to.be.revertedWith("Election start time not reached");
      });

      it("Should reject starting after end time", async function () {
        await time.increase(11000); // Move past end time

        await expect(
          collegeVoting.connect(creator).startElection(electionId)
        ).to.be.revertedWith("Election end time has passed");
      });

      it("Should reject starting election without candidates", async function () {
        // Create election without candidates
        const currentTime = await time.latest();
        const startTime = currentTime + 3600;
        const endTime = startTime + 7200;

        const tx = await collegeVoting.connect(creator).createElection(
          "Empty Election",
          "Test Description",
          startTime,
          endTime,
          ElectionType.SINGLE_CHOICE,
          true,
          1
        );

        const receipt = await tx.wait();
        const emptyElectionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

        await time.increase(3600);

        await expect(
          collegeVoting.connect(creator).startElection(emptyElectionId)
        ).to.be.revertedWith("Election must have at least one candidate");
      });

      it("Should reject starting already started election", async function () {
        await time.increase(3600);
        await collegeVoting.connect(creator).startElection(electionId);

        await expect(
          collegeVoting.connect(creator).startElection(electionId)
        ).to.be.revertedWith("Election already started or ended");
      });
    });

    describe("endElection", function () {
      beforeEach(async function () {
        await time.increase(3600);
        await collegeVoting.connect(creator).startElection(electionId);
      });

      it("Should end election at correct time", async function () {
        await time.increase(7200); // Move to end time

        const tx = await collegeVoting.connect(creator).endElection(electionId);
        const receipt = await tx.wait();
        
        const statusEvent = receipt.events?.find(e => e.event === "ElectionStatusChanged");
        const endEvent = receipt.events?.find(e => e.event === "ElectionEnded");
        
        expect(statusEvent?.args?.newStatus).to.equal(ElectionStatus.ENDED);
        expect(endEvent).to.not.be.undefined;
        expect(await collegeVoting.isElectionActive(electionId)).to.be.false;
      });

      it("Should reject ending before end time", async function () {
        await expect(
          collegeVoting.connect(creator).endElection(electionId)
        ).to.be.revertedWith("Election end time not reached");
      });

      it("Should reject ending non-active election", async function () {
        await time.increase(7200);
        await collegeVoting.connect(creator).endElection(electionId);

        await expect(
          collegeVoting.connect(creator).endElection(electionId)
        ).to.be.revertedWith("Election not active");
      });
    });

    describe("cancelElection", function () {
      it("Should cancel pending election", async function () {
        const tx = await collegeVoting.connect(creator).cancelElection(electionId);
        const receipt = await tx.wait();
        
        const statusEvent = receipt.events?.find(e => e.event === "ElectionStatusChanged");
        expect(statusEvent?.args?.newStatus).to.equal(ElectionStatus.CANCELLED);
      });

      it("Should cancel active election", async function () {
        await time.increase(3600);
        await collegeVoting.connect(creator).startElection(electionId);

        const tx = await collegeVoting.connect(creator).cancelElection(electionId);
        const receipt = await tx.wait();
        
        const statusEvent = receipt.events?.find(e => e.event === "ElectionStatusChanged");
        expect(statusEvent?.args?.newStatus).to.equal(ElectionStatus.CANCELLED);
      });

      it("Should reject cancelling ended election", async function () {
        await time.increase(3600);
        await collegeVoting.connect(creator).startElection(electionId);
        await time.increase(7200);
        await collegeVoting.connect(creator).endElection(electionId);

        await expect(
          collegeVoting.connect(creator).cancelElection(electionId)
        ).to.be.revertedWith("Cannot cancel ended election");
      });
    });
  });

  describe("Voting Functions", function () {
    let singleChoiceElectionId: number;
    let multipleChoiceElectionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
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
      await time.increase(3600);
      await collegeVoting.connect(creator).startElection(singleChoiceElectionId);
      await collegeVoting.connect(creator).startElection(multipleChoiceElectionId);
    });

    describe("castVote", function () {
      it("Should allow valid single choice vote", async function () {
        const tx = await collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1]);
        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === "VoteCast");
        
        expect(event?.args?.voter).to.equal(voter1.address);
        expect(event?.args?.candidateIds).to.deep.equal([ethers.BigNumber.from(1)]);
        
        const [, hasVoted, choices] = await collegeVoting.getVoterStatus(singleChoiceElectionId, voter1.address);
        expect(hasVoted).to.be.true;
        expect(choices.map(c => c.toNumber())).to.deep.equal([1]);
      });

      it("Should allow valid multiple choice vote", async function () {
        const tx = await collegeVoting.connect(voter1).castVote(multipleChoiceElectionId, [1, 3, 4]);
        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === "VoteCast");
        
        expect(event?.args?.voter).to.equal(voter1.address);
        expect(event?.args?.candidateIds.map((id: any) => id.toNumber())).to.deep.equal([1, 3, 4]);
      });

      it("Should reject empty vote", async function () {
        await expect(
          collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [])
        ).to.be.revertedWith("Must vote for at least one candidate");
      });

      it("Should reject multiple choices in single choice election", async function () {
        await expect(
          collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1, 2])
        ).to.be.revertedWith("Single choice elections allow only one vote");
      });

      it("Should reject too many choices in multiple choice election", async function () {
        await expect(
          collegeVoting.connect(voter1).castVote(multipleChoiceElectionId, [1, 2, 3, 4])
        ).to.be.revertedWith("Too many choices selected");
      });

      it("Should reject duplicate candidate selections", async function () {
        await expect(
          collegeVoting.connect(voter1).castVote(multipleChoiceElectionId, [1, 1, 2])
        ).to.be.revertedWith("Duplicate candidate selection");
      });

      it("Should reject invalid candidate ID", async function () {
        await expect(
          collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [999])
        ).to.be.revertedWith("Invalid candidate ID");
      });

      it("Should reject vote from ineligible voter", async function () {
        await expect(
          collegeVoting.connect(voter3).castVote(singleChoiceElectionId, [1])
        ).to.be.revertedWith("You are not eligible to vote in this election");
      });

      it("Should reject double voting", async function () {
        await collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1]);
        
        await expect(
          collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [2])
        ).to.be.revertedWith("You have already voted in this election");
      });

      it("Should reject voting before election starts", async function () {
        // Create new election that hasn't started
        const currentTime = await time.latest();
        const startTime = currentTime + 7200; // 2 hours from now
        const endTime = startTime + 7200;

        const tx = await collegeVoting.connect(creator).createElection(
          "Future Election",
          "Test Description",
          startTime,
          endTime,
          ElectionType.SINGLE_CHOICE,
          true,
          1
        );

        const receipt = await tx.wait();
        const futureElectionId = receipt.events?.find(e => e.event === "ElectionCreated")?.args?.electionId.toNumber();

        await collegeVoting.connect(creator).addCandidate(futureElectionId, "Candidate", "Description", "");
        await collegeVoting.connect(creator).registerVoter(futureElectionId, voter1.address);

        await expect(
          collegeVoting.connect(voter1).castVote(futureElectionId, [1])
        ).to.be.revertedWith("Election has not started yet");
      });

      it("Should reject voting after election ends", async function () {
        await time.increase(7200); // Move past end time

        await expect(
          collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1])
        ).to.be.revertedWith("Election has ended");
      });

      it("Should reject voting in inactive election", async function () {
        await collegeVoting.connect(creator).cancelElection(singleChoiceElectionId);

        await expect(
          collegeVoting.connect(voter1).castVote(singleChoiceElectionId, [1])
        ).to.be.revertedWith("Election is not active");
      });
    });
  });

  describe("View Functions", function () {
    let electionId: number;

    beforeEach(async function () {
      await collegeVoting.connect(admin).authorizeElectionCreator(creator.address);
      
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
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
      await collegeVoting.connect(creator).addCandidate(electionId, "Candidate 1", "Description 1", "url1");
      await collegeVoting.connect(creator).addCandidate(electionId, "Candidate 2", "Description 2", "url2");

      // Register and vote
      await collegeVoting.connect(creator).registerVoter(electionId, voter1.address);
      await collegeVoting.connect(creator).registerVoter(electionId, voter2.address);

      await time.increase(3600);
      await collegeVoting.connect(creator).startElection(electionId);

      await collegeVoting.connect(voter1).castVote(electionId, [1]);
      await collegeVoting.connect(voter2).castVote(electionId, [2]);

      // End election
      await time.increase(7200);
      await collegeVoting.connect(creator).endElection(electionId);
    });

    describe("getElectionInfo", function () {
      it("Should return complete election information", async function () {
        const info = await collegeVoting.getElectionInfo(electionId);
        
        expect(info.title).to.equal("Test Election");
        expect(info.description).to.equal("Test Description");
        expect(info.creator).to.equal(creator.address);
        expect(info.electionType).to.equal(ElectionType.SINGLE_CHOICE);
        expect(info.status).to.equal(ElectionStatus.ENDED);
        expect(info.totalVotes).to.equal(2);
        expect(info.candidateCount).to.equal(2);
        expect(info.maxChoices).to.equal(1);
        expect(info.isPublic).to.be.true;
      });

      it("Should reject non-existent election", async function () {
        await expect(
          collegeVoting.getElectionInfo(999)
        ).to.be.revertedWith("Election does not exist");
      });
    });

    describe("getCandidateInfo", function () {
      it("Should return complete candidate information", async function () {
        const candidate = await collegeVoting.getCandidateInfo(electionId, 1);
        
        expect(candidate.name).to.equal("Candidate 1");
        expect(candidate.description).to.equal("Description 1");
        expect(candidate.imageUrl).to.equal("url1");
        expect(candidate.voteCount).to.equal(1);
        expect(candidate.isActive).to.be.true;
      });

      it("Should reject invalid candidate ID", async function () {
        await expect(
          collegeVoting.getCandidateInfo(electionId, 999)
        ).to.be.revertedWith("Invalid candidate ID");
      });
    });

    describe("getAllCandidates", function () {
      it("Should return all candidates information", async function () {
        const candidates = await collegeVoting.getAllCandidates(electionId);
        
        expect(candidates.names.length).to.equal(2);
        expect(candidates.names[0]).to.equal("Candidate 1");
        expect(candidates.names[1]).to.equal("Candidate 2");
        expect(candidates.voteCounts[0]).to.equal(1);
        expect(candidates.voteCounts[1]).to.equal(1);
        expect(candidates.isActiveList[0]).to.be.true;
        expect(candidates.isActiveList[1]).to.be.true;
      });
    });

    describe("getVoterStatus", function () {
      it("Should return voter status for eligible voter", async function () {
        const [isEligible, hasVoted, choices] = await collegeVoting.getVoterStatus(electionId, voter1.address);
        
        expect(isEligible).to.be.true;
        expect(hasVoted).to.be.true;
        expect(choices.map(c => c.toNumber())).to.deep.equal([1]);
      });

      it("Should return voter status for ineligible voter", async function () {
        const [isEligible, hasVoted, choices] = await collegeVoting.getVoterStatus(electionId, voter3.address);
        
        expect(isEligible).to.be.false;
        expect(hasVoted).to.be.false;
        expect(choices.length).to.equal(0);
      });
    });

    describe("getElectionResults", function () {
      it("Should return results for ended election", async function () {
        const [candidateVotes, totalVotes] = await collegeVoting.getElectionResults(electionId);
        
        expect(candidateVotes.length).to.equal(2);
        expect(candidateVotes[0]).to.equal(1);
        expect(candidateVotes[1]).to.equal(1);
        expect(totalVotes).to.equal(2);
      });

      it("Should reject results for active election", async function () {
        // Create new active election
        const currentTime = await time.latest();
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

    describe("isElectionActive", function () {
      it("Should return true for active election", async function () {
        // Create and start new election
        const currentTime = await time.latest();
        const startTime = currentTime + 1800; // 30 minutes from now
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

        await collegeVoting.connect(creator).addCandidate(activeElectionId, "Candidate", "Description", "");
        
        await time.increase(1800);
        await collegeVoting.connect(creator).startElection(activeElectionId);

        expect(await collegeVoting.isElectionActive(activeElectionId)).to.be.true;
      });

      it("Should return false for ended election", async function () {
        expect(await collegeVoting.isElectionActive(electionId)).to.be.false;
      });
    });
  });
});