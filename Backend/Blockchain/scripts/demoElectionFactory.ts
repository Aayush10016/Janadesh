import { ethers } from "hardhat";

async function main() {
    console.log("🏭 ElectionFactory Demo");
    console.log("=" .repeat(50));

    // Get signers
    const [admin, creator1, creator2, voter1] = await ethers.getSigners();
    console.log(`👤 Admin: ${admin.address}`);
    console.log(`👤 Creator1: ${creator1.address}`);
    console.log(`👤 Creator2: ${creator2.address}`);
    console.log(`👤 Voter1: ${voter1.address}`);

    // Deploy ElectionFactory
    console.log("\n🚀 Deploying ElectionFactory...");
    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    const factory = await ElectionFactory.deploy();
    console.log(`✅ ElectionFactory deployed to: ${factory.address}`);

    // Authorize creators
    console.log("\n🔐 Authorizing election creators...");
    await factory.authorizeCreator(creator1.address);
    await factory.authorizeCreator(creator2.address);
    console.log(`✅ Authorized creator1: ${creator1.address}`);
    console.log(`✅ Authorized creator2: ${creator2.address}`);

    // Deploy elections
    console.log("\n🗳️  Deploying elections...");
    
    // Election 1 - College Student Council
    const tx1 = await factory.connect(creator1).deployElection(
        "Student Council Election 2024",
        "College"
    );
    const receipt1 = await tx1.wait();
    const election1Address = await factory.deployedElections(1);
    console.log(`✅ Election 1 deployed: ${election1Address}`);
    console.log(`   Title: Student Council Election 2024`);
    console.log(`   Category: College`);
    console.log(`   Creator: ${creator1.address}`);

    // Election 2 - Corporate Board
    const tx2 = await factory.connect(creator1).deployElection(
        "Board of Directors Election",
        "Corporate"
    );
    const receipt2 = await tx2.wait();
    const election2Address = await factory.deployedElections(2);
    console.log(`✅ Election 2 deployed: ${election2Address}`);
    console.log(`   Title: Board of Directors Election`);
    console.log(`   Category: Corporate`);
    console.log(`   Creator: ${creator1.address}`);

    // Election 3 - Faculty Senate
    const tx3 = await factory.connect(creator2).deployElection(
        "Faculty Senate Election",
        "College"
    );
    const receipt3 = await tx3.wait();
    const election3Address = await factory.deployedElections(3);
    console.log(`✅ Election 3 deployed: ${election3Address}`);
    console.log(`   Title: Faculty Senate Election`);
    console.log(`   Category: College`);
    console.log(`   Creator: ${creator2.address}`);

    // Query elections by category
    console.log("\n📊 Querying elections by category...");
    const collegeElections = await factory.getElectionsByCategory("College");
    const corporateElections = await factory.getElectionsByCategory("Corporate");
    
    console.log(`🏫 College elections (${collegeElections.length}):`);
    collegeElections.forEach((addr: string, index: number) => {
        console.log(`   ${index + 1}. ${addr}`);
    });
    
    console.log(`🏢 Corporate elections (${corporateElections.length}):`);
    corporateElections.forEach((addr: string, index: number) => {
        console.log(`   ${index + 1}. ${addr}`);
    });

    // Query elections by creator
    console.log("\n👥 Querying elections by creator...");
    const creator1Elections = await factory.getElectionsByCreator(creator1.address);
    const creator2Elections = await factory.getElectionsByCreator(creator2.address);
    
    console.log(`👤 Creator1 elections (${creator1Elections.length}):`);
    creator1Elections.forEach((addr: string, index: number) => {
        console.log(`   ${index + 1}. ${addr}`);
    });
    
    console.log(`👤 Creator2 elections (${creator2Elections.length}):`);
    creator2Elections.forEach((addr: string, index: number) => {
        console.log(`   ${index + 1}. ${addr}`);
    });

    // Get paginated elections
    console.log("\n📄 Getting paginated elections...");
    const [allElections, totalCount] = await factory.getDeployedElections(0, 10);
    console.log(`📊 Total elections: ${totalCount}`);
    console.log(`📋 Retrieved elections (${allElections.length}):`);
    allElections.forEach((addr: string, index: number) => {
        console.log(`   ${index + 1}. ${addr}`);
    });

    // Get creator statistics
    console.log("\n📈 Creator statistics...");
    const [creator1Count, creator1Authorized] = await factory.getCreatorStats(creator1.address);
    const [creator2Count, creator2Authorized] = await factory.getCreatorStats(creator2.address);
    
    console.log(`👤 Creator1: ${creator1Count} elections, authorized: ${creator1Authorized}`);
    console.log(`👤 Creator2: ${creator2Count} elections, authorized: ${creator2Authorized}`);

    // Demonstrate access control
    console.log("\n🔒 Testing access control...");
    try {
        await factory.connect(voter1).deployElection("Unauthorized Election", "Test");
        console.log("❌ This should not happen - unauthorized deployment succeeded");
    } catch (error: any) {
        console.log("✅ Access control working - unauthorized deployment blocked");
        console.log(`   Error: ${error.message.split('(')[0]}`);
    }

    // Final summary
    console.log("\n📋 SUMMARY");
    console.log("=" .repeat(50));
    console.log(`🏭 ElectionFactory: ${factory.address}`);
    console.log(`📊 Total Elections Deployed: ${await factory.deployedElectionsCount()}`);
    console.log(`👥 Authorized Creators: 3 (admin + 2 authorized)`);
    console.log(`🏫 College Elections: ${collegeElections.length}`);
    console.log(`🏢 Corporate Elections: ${corporateElections.length}`);
    console.log("\n✅ ElectionFactory demo completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Demo failed:", error);
        process.exit(1);
    });