// scripts/runVoting.js
import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const { ethers } = pkg;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // 1️⃣ Get signer accounts
  const [admin, voter1, voter2, voter3] = await ethers.getSigners();
  console.log("Signers:", admin.address, voter1.address, voter2.address, voter3.address);

  // 2️⃣ Load deployed contract info
  const deployedPath = path.join(__dirname, "../deployed/collegeVoting.json");
  if (!fs.existsSync(deployedPath)) {
    console.error("ABI file not found:", deployedPath);
    process.exit(1);
  }

  const deployedData = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const contractAddress = deployedData.address;
  const contractABI = deployedData.abi;

  // 3️⃣ Connect to existing contract
  const cv = new ethers.Contract(contractAddress, contractABI, admin);
  console.log("✅ Connected to deployed CollegeVoting at:", contractAddress);

  // 4️⃣ Create a new election with 2 candidates
  const tx1 = await cv.createElection("General Election", 2);
  const receipt1 = await tx1.wait();
  const electionId = receipt1.events.find(e => e.event === "ElectionCreated").args.electionId.toNumber();
  console.log(`🗳️ Election created with ID: ${electionId} with 2 candidates`);

  // 5️⃣ Activate election
  await (await cv.toggleElection(electionId, true)).wait();
  console.log("✅ Election activated");

  // 6️⃣ Register voters
  await (await cv.registerVoter(electionId, voter1.address)).wait();
  await (await cv.registerVoter(electionId, voter2.address)).wait();
  console.log("✅ Voters registered");

  // 7️⃣ Cast votes
  await (await cv.connect(voter1).castVote(electionId, 1)).wait();
  await (await cv.connect(voter2).castVote(electionId, 2)).wait();
  console.log("✅ Votes cast");

  // 8️⃣ Fetch vote counts
  const candidate1Votes = await cv.getVotes(electionId, 1);
  const candidate2Votes = await cv.getVotes(electionId, 2);
  console.log("📊 Candidate 1 votes:", candidate1Votes.toString());
  console.log("📊 Candidate 2 votes:", candidate2Votes.toString());

  // 9️⃣ Check voter status
  const v1Status = await cv.hasVoted(electionId, voter1.address);
  const v2Status = await cv.hasVoted(electionId, voter2.address);
  console.log("🧾 Voter1 voted?", v1Status);
  console.log("🧾 Voter2 voted?", v2Status);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
