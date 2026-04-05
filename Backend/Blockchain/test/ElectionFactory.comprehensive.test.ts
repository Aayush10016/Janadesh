import { expect } from "chai";
import { ethers } from "hardhat";
import { ElectionFactory, CollegeVoting } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ElectionFactory - Comprehensive Unit Tests", function () {
  let electionFactory: ElectionFactory;
  let admin: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [admin, creator1, creator2, user1, user2] = await ethers.getSigners();

    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    electionFactory = await ElectionFactory.deploy();
    await electionFactory.deployed();
  });

  describe("Contract Deployment", function () {
    it("Should set correct admin on deployment", async function () {
      expect(await electionFactory.admin()).to.equal(admin.address);
    });

    it("Should authorize admin as creator by default", async function () {
      expect(await electionFactory.authorizedCreators(admin.address)).to.be.true;
    });

    it("Should initialize with zero deployed elections", async function () {
      expect(await electionFactory.deployedElectionsCount()).to.equal(0);
    });
  });

  describe("Creator Authorization Functions", function () {
    describe("authorizeCreator", function () {
      it("Should allow admin to authorize creators", async function () {
        await electionFactory.connect(admin).authorizeCreator(creator1.address);
        expect(await electionFactory.authorizedCreators(creator1.address)).to.be.true;
      });

      it("Should emit CreatorAuthorized event", async function () {
        await expect(electionFactory.connect(admin).authorizeCreator(creator1.address))
          .to.emit(electionFactory, "CreatorAuthorized")
          .withArgs(creator1.address, admin.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
      });

      it("Should reject non-admin authorization", async function () {
        await expect(
          electionFactory.connect(creator1).authorizeCreator(creator2.address)
        ).to.be.revertedWith("Only admin can perform this action");
      });

      it("Should reject zero address", async function () {
        await expect(
          electionFactory.connect(admin).authorizeCreator(ethers.constants.AddressZero)
        ).to.be.revertedWith("Invalid creator address");
      });

      it("Should reject already authorized creator", async function () {
        await electionFactory.connect(admin).authorizeCreator(creator1.address);
        await expect(
          electionFactory.connect(admin).authorizeCreator(creator1.address)
        ).to.be.revertedWith("Creator already authorized");
      });

      it("Should not allow authorizing admin again", async function () {
        await expect(
          electionFactory.connect(admin).authorizeCreator(admin.address)
        ).to.be.revertedWith("Creator already authorized");
      });
    });

    describe("revokeCreator", function () {
      beforeEach(async function () {
        await electionFactory.connect(admin).authorizeCreator(creator1.address);
      });

      it("Should allow admin to revoke creators", async function () {
        await electionFactory.connect(admin).revokeCreator(creator1.address);
        expect(await electionFactory.authorizedCreators(creator1.address)).to.be.false;
      });

      it("Should emit CreatorRevoked event", async function () {
        await expect(electionFactory.connect(admin).revokeCreator(creator1.address))
          .to.emit(electionFactory, "CreatorRevoked")
          .withArgs(creator1.address, admin.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
      });

      it("Should reject non-admin revocation", async function () {
        await expect(
          electionFactory.connect(creator1).revokeCreator(creator2.address)
        ).to.be.revertedWith("Only admin can perform this action");
      });

      it("Should not allow revoking admin privileges", async function () {
        await expect(
          electionFactory.connect(admin).revokeCreator(admin.address)
        ).to.be.revertedWith("Cannot revoke admin privileges");
      });

      it("Should reject revoking non-authorized creator", async function () {
        await expect(
          electionFactory.connect(admin).revokeCreator(creator2.address)
        ).to.be.revertedWith("Creator not authorized");
      });
    });
  });

  describe("Election Deployment Functions", function () {
    beforeEach(async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
    });

    describe("deployElection", function () {
      it("Should deploy election successfully", async function () {
        const title = "Test Election";
        const category = "College";

        const tx = await electionFactory.connect(creator1).deployElection(title, category);
        const receipt = await tx.wait();
        
        expect(await electionFactory.deployedElectionsCount()).to.equal(1);
        
        const electionAddress = await electionFactory.deployedElections(1);
        expect(electionAddress).to.not.equal(ethers.constants.AddressZero);
        expect(await electionFactory.isDeployedElection(electionAddress)).to.be.true;

        // Verify the deployed contract is actually a CollegeVoting contract
        const deployedElection = await ethers.getContractAt("CollegeVoting", electionAddress);
        expect(await deployedElection.admin()).to.equal(creator1.address);
      });

      it("Should emit ElectionDeployed event with correct parameters", async function () {
        const title = "Test Election";
        const category = "College";

        await expect(
          electionFactory.connect(creator1).deployElection(title, category)
        ).to.emit(electionFactory, "ElectionDeployed");
      });

      it("Should track creator elections correctly", async function () {
        await electionFactory.connect(creator1).deployElection("Election 1", "Category");
        await electionFactory.connect(creator1).deployElection("Election 2", "Category");

        const creatorElections = await electionFactory.getElectionsByCreator(creator1.address);
        expect(creatorElections.length).to.equal(2);
        
        const [electionCount, isAuthorized] = await electionFactory.getCreatorStats(creator1.address);
        expect(electionCount).to.equal(2);
        expect(isAuthorized).to.be.true;
      });

      it("Should categorize elections correctly", async function () {
        await electionFactory.connect(creator1).deployElection("Election 1", "College");
        const electionAddress = await electionFactory.deployedElections(1);
        
        expect(await electionFactory.electionCategory(electionAddress)).to.equal("College");
        
        const collegeElections = await electionFactory.getElectionsByCategory("College");
        expect(collegeElections.length).to.equal(1);
        expect(collegeElections[0]).to.equal(electionAddress);
      });

      it("Should reject unauthorized creator", async function () {
        await expect(
          electionFactory.connect(user1).deployElection("Test", "Category")
        ).to.be.revertedWith("Not authorized to create elections");
      });

      it("Should reject empty title", async function () {
        await expect(
          electionFactory.connect(creator1).deployElection("", "Category")
        ).to.be.revertedWith("Title cannot be empty");
      });

      it("Should reject empty category", async function () {
        await expect(
          electionFactory.connect(creator1).deployElection("Title", "")
        ).to.be.revertedWith("Category cannot be empty");
      });

      it("Should handle multiple creators deploying elections", async function () {
        await electionFactory.connect(admin).authorizeCreator(creator2.address);
        
        await electionFactory.connect(creator1).deployElection("Election 1", "College");
        await electionFactory.connect(creator2).deployElection("Election 2", "Corporate");
        
        expect(await electionFactory.deployedElectionsCount()).to.equal(2);
        
        const creator1Elections = await electionFactory.getElectionsByCreator(creator1.address);
        const creator2Elections = await electionFactory.getElectionsByCreator(creator2.address);
        
        expect(creator1Elections.length).to.equal(1);
        expect(creator2Elections.length).to.equal(1);
      });
    });
  });

  describe("Election Discovery Functions", function () {
    let election1Address: string;
    let election2Address: string;
    let election3Address: string;

    beforeEach(async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      await electionFactory.connect(admin).authorizeCreator(creator2.address);

      // Deploy test elections
      await electionFactory.connect(creator1).deployElection("Election 1", "College");
      election1Address = await electionFactory.deployedElections(1);

      await electionFactory.connect(creator1).deployElection("Election 2", "Corporate");
      election2Address = await electionFactory.deployedElections(2);

      await electionFactory.connect(creator2).deployElection("Election 3", "College");
      election3Address = await electionFactory.deployedElections(3);
    });

    describe("getElectionsByCategory", function () {
      it("Should return elections by category correctly", async function () {
        const collegeElections = await electionFactory.getElectionsByCategory("College");
        expect(collegeElections.length).to.equal(2);
        expect(collegeElections).to.include(election1Address);
        expect(collegeElections).to.include(election3Address);

        const corporateElections = await electionFactory.getElectionsByCategory("Corporate");
        expect(corporateElections.length).to.equal(1);
        expect(corporateElections[0]).to.equal(election2Address);
      });

      it("Should return empty array for non-existent category", async function () {
        const emptyCategory = await electionFactory.getElectionsByCategory("NonExistent");
        expect(emptyCategory.length).to.equal(0);
      });

      it("Should handle case-sensitive categories", async function () {
        const lowerCase = await electionFactory.getElectionsByCategory("college");
        const upperCase = await electionFactory.getElectionsByCategory("COLLEGE");
        const correctCase = await electionFactory.getElectionsByCategory("College");
        
        expect(lowerCase.length).to.equal(0);
        expect(upperCase.length).to.equal(0);
        expect(correctCase.length).to.equal(2);
      });
    });

    describe("getElectionsByCreator", function () {
      it("Should return elections by creator correctly", async function () {
        const creator1Elections = await electionFactory.getElectionsByCreator(creator1.address);
        expect(creator1Elections.length).to.equal(2);
        expect(creator1Elections).to.include(election1Address);
        expect(creator1Elections).to.include(election2Address);

        const creator2Elections = await electionFactory.getElectionsByCreator(creator2.address);
        expect(creator2Elections.length).to.equal(1);
        expect(creator2Elections[0]).to.equal(election3Address);
      });

      it("Should return empty array for creator with no elections", async function () {
        const noElections = await electionFactory.getElectionsByCreator(user1.address);
        expect(noElections.length).to.equal(0);
      });

      it("Should return empty array for zero address", async function () {
        const zeroElections = await electionFactory.getElectionsByCreator(ethers.constants.AddressZero);
        expect(zeroElections.length).to.equal(0);
      });
    });

    describe("getDeployedElections", function () {
      it("Should return paginated elections correctly", async function () {
        const [elections, total] = await electionFactory.getDeployedElections(0, 2);
        expect(total).to.equal(3);
        expect(elections.length).to.equal(2);
        expect(elections[0]).to.equal(election1Address);
        expect(elections[1]).to.equal(election2Address);

        const [elections2] = await electionFactory.getDeployedElections(2, 2);
        expect(elections2.length).to.equal(1);
        expect(elections2[0]).to.equal(election3Address);
      });

      it("Should handle offset beyond available elections", async function () {
        const [elections, total] = await electionFactory.getDeployedElections(100, 10);
        expect(elections.length).to.equal(0);
        expect(total).to.equal(3);
      });

      it("Should handle limit larger than remaining elections", async function () {
        const [elections, total] = await electionFactory.getDeployedElections(1, 10);
        expect(elections.length).to.equal(2);
        expect(total).to.equal(3);
        expect(elections[0]).to.equal(election2Address);
        expect(elections[1]).to.equal(election3Address);
      });

      it("Should handle zero limit", async function () {
        const [elections, total] = await electionFactory.getDeployedElections(0, 0);
        expect(elections.length).to.equal(0);
        expect(total).to.equal(3);
      });

      it("Should return all elections when limit exceeds total", async function () {
        const [elections, total] = await electionFactory.getDeployedElections(0, 100);
        expect(elections.length).to.equal(3);
        expect(total).to.equal(3);
      });
    });

    describe("getCreatorStats", function () {
      it("Should return correct creator statistics", async function () {
        const [count1, authorized1] = await electionFactory.getCreatorStats(creator1.address);
        expect(count1).to.equal(2);
        expect(authorized1).to.be.true;

        const [count2, authorized2] = await electionFactory.getCreatorStats(creator2.address);
        expect(count2).to.equal(1);
        expect(authorized2).to.be.true;

        const [count3, authorized3] = await electionFactory.getCreatorStats(user1.address);
        expect(count3).to.equal(0);
        expect(authorized3).to.be.false;
      });

      it("Should update stats after revoking authorization", async function () {
        await electionFactory.connect(admin).revokeCreator(creator1.address);
        
        const [count, authorized] = await electionFactory.getCreatorStats(creator1.address);
        expect(count).to.equal(2); // Election count remains
        expect(authorized).to.be.false; // But authorization is revoked
      });
    });
  });

  describe("Admin Transfer Functions", function () {
    describe("transferAdmin", function () {
      it("Should transfer admin rights successfully", async function () {
        await electionFactory.connect(admin).transferAdmin(creator1.address);
        
        expect(await electionFactory.admin()).to.equal(creator1.address);
        expect(await electionFactory.authorizedCreators(creator1.address)).to.be.true;
      });

      it("Should allow new admin to perform admin functions", async function () {
        await electionFactory.connect(admin).transferAdmin(creator1.address);
        
        // New admin should be able to authorize creators
        await electionFactory.connect(creator1).authorizeCreator(creator2.address);
        expect(await electionFactory.authorizedCreators(creator2.address)).to.be.true;
      });

      it("Should prevent old admin from performing admin functions", async function () {
        await electionFactory.connect(admin).transferAdmin(creator1.address);
        
        await expect(
          electionFactory.connect(admin).authorizeCreator(creator2.address)
        ).to.be.revertedWith("Only admin can perform this action");
      });

      it("Should reject non-admin transfer attempt", async function () {
        await expect(
          electionFactory.connect(creator1).transferAdmin(creator2.address)
        ).to.be.revertedWith("Only admin can perform this action");
      });

      it("Should reject zero address", async function () {
        await expect(
          electionFactory.connect(admin).transferAdmin(ethers.constants.AddressZero)
        ).to.be.revertedWith("Invalid admin address");
      });

      it("Should reject transferring to same admin", async function () {
        await expect(
          electionFactory.connect(admin).transferAdmin(admin.address)
        ).to.be.revertedWith("Same admin address");
      });
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle multiple elections in same category", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      // Deploy multiple elections in same category
      for (let i = 1; i <= 5; i++) {
        await electionFactory.connect(creator1).deployElection(`Election ${i}`, "College");
      }
      
      const collegeElections = await electionFactory.getElectionsByCategory("College");
      expect(collegeElections.length).to.equal(5);
    });

    it("Should handle creator with many elections", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      // Deploy many elections
      for (let i = 1; i <= 10; i++) {
        await electionFactory.connect(creator1).deployElection(`Election ${i}`, `Category${i % 3}`);
      }
      
      const creatorElections = await electionFactory.getElectionsByCreator(creator1.address);
      expect(creatorElections.length).to.equal(10);
      
      const [count, authorized] = await electionFactory.getCreatorStats(creator1.address);
      expect(count).to.equal(10);
      expect(authorized).to.be.true;
    });

    it("Should maintain correct state after multiple operations", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      await electionFactory.connect(admin).authorizeCreator(creator2.address);
      
      // Deploy elections
      await electionFactory.connect(creator1).deployElection("Election 1", "College");
      await electionFactory.connect(creator2).deployElection("Election 2", "College");
      
      // Revoke one creator
      await electionFactory.connect(admin).revokeCreator(creator1.address);
      
      // Deploy more elections with remaining creator
      await electionFactory.connect(creator2).deployElection("Election 3", "Corporate");
      
      // Verify final state
      expect(await electionFactory.deployedElectionsCount()).to.equal(3);
      expect(await electionFactory.authorizedCreators(creator1.address)).to.be.false;
      expect(await electionFactory.authorizedCreators(creator2.address)).to.be.true;
      
      const collegeElections = await electionFactory.getElectionsByCategory("College");
      const corporateElections = await electionFactory.getElectionsByCategory("Corporate");
      expect(collegeElections.length).to.equal(2);
      expect(corporateElections.length).to.equal(1);
    });

    it("Should handle empty string categories correctly", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      await expect(
        electionFactory.connect(creator1).deployElection("Test Election", "")
      ).to.be.revertedWith("Category cannot be empty");
    });

    it("Should handle very long titles and categories", async function () {
      await electionFactory.connect(admin).authorizeCreator(creator1.address);
      
      const longTitle = "A".repeat(1000);
      const longCategory = "B".repeat(1000);
      
      // Should not revert for long strings (within gas limits)
      await expect(
        electionFactory.connect(creator1).deployElection(longTitle, longCategory)
      ).to.not.be.reverted;
    });
  });
});