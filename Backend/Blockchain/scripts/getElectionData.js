// scripts/getElectionData.js
import hre from "hardhat";

async function main() {
  // Replace with your deployed contract address
  const contractAddress = "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690";

  // Get contract factory and attach to deployed address
  const CollegeVoting = await hre.ethers.getContractFactory("CollegeVoting");
  const contract = await CollegeVoting.attach(contractAddress);

  const electionCount = (await contract.electionCount()).toNumber();
  console.log(`Total elections: ${electionCount}\n`);

  for (let eid = 1; eid <= electionCount; eid++) {
    const electionInfo = await contract.getElectionInfo(eid);
    const [active, name, candidateCountBN] = electionInfo;
    const candidateCount = candidateCountBN.toNumber();

    console.log(`Election ID: ${eid}`);
    console.log(`Name       : ${name}`);
    console.log(`Active     : ${active}`);
    console.log(`Candidates : ${candidateCount}`);

    for (let cid = 1; cid <= candidateCount; cid++) {
      const votes = (await contract.getVotes(eid, cid)).toNumber();
      console.log(`  Candidate ${cid} -> Votes: ${votes}`);
    }
    console.log("\n---------------------------\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
