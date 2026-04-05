// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CollegeVoting {
    address public admin;
    uint256 public electionCount;

    enum ElectionType { SINGLE_CHOICE, MULTIPLE_CHOICE, RANKED_VOTING }
    enum ElectionStatus { PENDING, ACTIVE, ENDED, CANCELLED }

    struct Candidate {
        string name;
        string description;
        string imageUrl;
        uint256 voteCount;
        bool isActive;
    }

    struct Election {
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        ElectionType electionType;
        ElectionStatus status;
        address creator;
        bool isPublic;
        uint256 totalVotes;
        uint256 candidateCount;
        uint256 maxChoices; // For multiple choice elections
        mapping(uint256 => Candidate) candidates;
        mapping(address => bool) eligibleVoters;
        mapping(address => bool) hasVoted;
        mapping(address => uint256[]) voterChoices; // For tracking multiple/ranked votes
    }

    mapping(uint256 => Election) private elections;
    mapping(address => bool) public electionCreators; // Authorized election creators

    // Events for comprehensive frontend integration
    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        address indexed creator,
        ElectionType electionType,
        uint256 startTime,
        uint256 endTime,
        bool isPublic
    );
    
    event ElectionStatusChanged(
        uint256 indexed electionId,
        ElectionStatus oldStatus,
        ElectionStatus newStatus,
        uint256 timestamp
    );
    
    event CandidateAdded(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        string name,
        string description
    );
    
    event CandidateUpdated(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        string name,
        string description
    );
    
    event VoterRegistered(
        uint256 indexed electionId,
        address indexed voter,
        uint256 timestamp
    );
    
    event VoterEligibilityRevoked(
        uint256 indexed electionId,
        address indexed voter,
        uint256 timestamp
    );
    
    event VoteCast(
        uint256 indexed electionId,
        address indexed voter,
        uint256[] candidateIds,
        uint256 timestamp
    );
    
    event ElectionStarted(
        uint256 indexed electionId,
        uint256 timestamp
    );
    
    event ElectionEnded(
        uint256 indexed electionId,
        uint256 totalVotes,
        uint256 timestamp
    );
    
    event ElectionResultsFinalized(
        uint256 indexed electionId,
        uint256[] winningCandidates,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyCreatorOrAdmin(uint256 electionId) {
        require(
            msg.sender == admin || msg.sender == elections[electionId].creator,
            "Only election creator or admin can perform this action"
        );
        _;
    }

    modifier onlyAuthorizedCreator() {
        require(
            msg.sender == admin || electionCreators[msg.sender],
            "Not authorized to create elections"
        );
        _;
    }

    modifier electionExists(uint256 electionId) {
        require(electionId > 0 && electionId <= electionCount, "Election does not exist");
        _;
    }

    modifier validTimeRange(uint256 startTime, uint256 endTime) {
        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        require(endTime - startTime >= 1 hours, "Election must run for at least 1 hour");
        _;
    }

    constructor() {
        admin = msg.sender;
        electionCount = 0;
        electionCreators[msg.sender] = true; // Admin is always authorized
    }

    // Admin functions
    function authorizeElectionCreator(address creator) external onlyAdmin {
        require(creator != address(0), "Invalid creator address");
        electionCreators[creator] = true;
    }

    function revokeElectionCreator(address creator) external onlyAdmin {
        require(creator != admin, "Cannot revoke admin privileges");
        electionCreators[creator] = false;
    }

    /**
     * @dev Transfer admin rights to another address.
     * The new admin is always marked as an authorized creator.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        require(newAdmin != admin, "Same admin address");

        admin = newAdmin;
        electionCreators[newAdmin] = true;
    }

    // Election creation and management
    function createElection(
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        ElectionType electionType,
        bool isPublic,
        uint256 maxChoices
    ) external onlyAuthorizedCreator validTimeRange(startTime, endTime) returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(
            electionType != ElectionType.MULTIPLE_CHOICE || maxChoices > 1,
            "Multiple choice elections must allow more than 1 choice"
        );

        electionCount += 1;
        uint256 electionId = electionCount;
        
        Election storage election = elections[electionId];
        election.title = title;
        election.description = description;
        election.startTime = startTime;
        election.endTime = endTime;
        election.electionType = electionType;
        election.status = ElectionStatus.PENDING;
        election.creator = msg.sender;
        election.isPublic = isPublic;
        election.totalVotes = 0;
        election.candidateCount = 0;
        election.maxChoices = maxChoices;

        emit ElectionCreated(
            electionId,
            title,
            msg.sender,
            electionType,
            startTime,
            endTime,
            isPublic
        );

        return electionId;
    }

    function addCandidate(
        uint256 electionId,
        string memory name,
        string memory description,
        string memory imageUrl
    ) external electionExists(electionId) onlyCreatorOrAdmin(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.PENDING, "Cannot add candidates after election starts");
        require(bytes(name).length > 0, "Candidate name cannot be empty");

        election.candidateCount += 1;
        uint256 candidateId = election.candidateCount;
        
        Candidate storage candidate = election.candidates[candidateId];
        candidate.name = name;
        candidate.description = description;
        candidate.imageUrl = imageUrl;
        candidate.voteCount = 0;
        candidate.isActive = true;

        emit CandidateAdded(electionId, candidateId, name, description);
    }

    function updateCandidate(
        uint256 electionId,
        uint256 candidateId,
        string memory name,
        string memory description,
        string memory imageUrl
    ) external electionExists(electionId) onlyCreatorOrAdmin(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.PENDING, "Cannot update candidates after election starts");
        require(candidateId > 0 && candidateId <= election.candidateCount, "Invalid candidate ID");
        require(bytes(name).length > 0, "Candidate name cannot be empty");

        Candidate storage candidate = election.candidates[candidateId];
        candidate.name = name;
        candidate.description = description;
        candidate.imageUrl = imageUrl;

        emit CandidateUpdated(electionId, candidateId, name, description);
    }

    // Voter eligibility management
    function registerVoter(uint256 electionId, address voter) 
        external 
        electionExists(electionId) 
        onlyCreatorOrAdmin(electionId) 
    {
        require(voter != address(0), "Invalid voter address");
        Election storage election = elections[electionId];
        require(!election.eligibleVoters[voter], "Voter already registered");
        require(election.status == ElectionStatus.PENDING, "Cannot register voters after election starts");

        election.eligibleVoters[voter] = true;
        emit VoterRegistered(electionId, voter, block.timestamp);
    }

    function registerMultipleVoters(uint256 electionId, address[] memory voters)
        external
        electionExists(electionId)
        onlyCreatorOrAdmin(electionId)
    {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.PENDING, "Cannot register voters after election starts");
        
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            require(voter != address(0), "Invalid voter address");
            if (!election.eligibleVoters[voter]) {
                election.eligibleVoters[voter] = true;
                emit VoterRegistered(electionId, voter, block.timestamp);
            }
        }
    }

    function revokeVoterEligibility(uint256 electionId, address voter)
        external
        electionExists(electionId)
        onlyCreatorOrAdmin(electionId)
    {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.PENDING, "Cannot revoke eligibility after election starts");
        require(election.eligibleVoters[voter], "Voter not registered");

        election.eligibleVoters[voter] = false;
        emit VoterEligibilityRevoked(electionId, voter, block.timestamp);
    }

    // Election status management with automatic time validation
    function startElection(uint256 electionId) 
        external 
        electionExists(electionId) 
        onlyCreatorOrAdmin(electionId) 
    {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.PENDING, "Election already started or ended");
        require(block.timestamp >= election.startTime, "Election start time not reached");
        require(block.timestamp < election.endTime, "Election end time has passed");
        require(election.candidateCount > 0, "Election must have at least one candidate");

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.ACTIVE;
        
        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.ACTIVE, block.timestamp);
        emit ElectionStarted(electionId, block.timestamp);
    }

    function endElection(uint256 electionId) 
        external 
        electionExists(electionId) 
        onlyCreatorOrAdmin(electionId) 
    {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.ACTIVE, "Election not active");
        require(block.timestamp >= election.endTime, "Election end time not reached");

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.ENDED;
        
        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.ENDED, block.timestamp);
        emit ElectionEnded(electionId, election.totalVotes, block.timestamp);
    }

    function cancelElection(uint256 electionId) 
        external 
        electionExists(electionId) 
        onlyCreatorOrAdmin(electionId) 
    {
        Election storage election = elections[electionId];
        require(election.status != ElectionStatus.ENDED, "Cannot cancel ended election");

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.CANCELLED;
        
        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.CANCELLED, block.timestamp);
    }

    // Voting functions with advanced features
    function castVote(uint256 electionId, uint256[] memory candidateIds) external electionExists(electionId) {
        Election storage election = elections[electionId];
        
        // Automatic time-based validation
        require(block.timestamp >= election.startTime, "Election has not started yet");
        require(block.timestamp <= election.endTime, "Election has ended");
        require(election.status == ElectionStatus.ACTIVE, "Election is not active");
        
        // Voter eligibility verification
        require(election.eligibleVoters[msg.sender], "You are not eligible to vote in this election");
        require(!election.hasVoted[msg.sender], "You have already voted in this election");
        
        // Validate vote based on election type
        _validateVote(election, candidateIds);
        
        // Record the vote
        election.hasVoted[msg.sender] = true;
        election.voterChoices[msg.sender] = candidateIds;
        election.totalVotes += 1;
        
        // Update candidate vote counts
        for (uint256 i = 0; i < candidateIds.length; i++) {
            election.candidates[candidateIds[i]].voteCount += 1;
        }
        
        emit VoteCast(electionId, msg.sender, candidateIds, block.timestamp);
    }

    function _validateVote(Election storage election, uint256[] memory candidateIds) private view {
        require(candidateIds.length > 0, "Must vote for at least one candidate");
        
        if (election.electionType == ElectionType.SINGLE_CHOICE) {
            require(candidateIds.length == 1, "Single choice elections allow only one vote");
        } else if (election.electionType == ElectionType.MULTIPLE_CHOICE) {
            require(candidateIds.length <= election.maxChoices, "Too many choices selected");
        }
        
        // Validate all candidate IDs and check for duplicates
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            require(candidateId > 0 && candidateId <= election.candidateCount, "Invalid candidate ID");
            require(election.candidates[candidateId].isActive, "Candidate is not active");
            
            // Check for duplicates
            for (uint256 j = i + 1; j < candidateIds.length; j++) {
                require(candidateIds[i] != candidateIds[j], "Duplicate candidate selection");
            }
        }
    }

    // View functions for frontend integration
    function getElectionInfo(uint256 electionId) 
        external 
        view 
        electionExists(electionId) 
        returns (
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            ElectionType electionType,
            ElectionStatus status,
            address creator,
            bool isPublic,
            uint256 totalVotes,
            uint256 candidateCount,
            uint256 maxChoices
        ) 
    {
        Election storage election = elections[electionId];
        return (
            election.title,
            election.description,
            election.startTime,
            election.endTime,
            election.electionType,
            election.status,
            election.creator,
            election.isPublic,
            election.totalVotes,
            election.candidateCount,
            election.maxChoices
        );
    }

    function getCandidateInfo(uint256 electionId, uint256 candidateId)
        external
        view
        electionExists(electionId)
        returns (
            string memory name,
            string memory description,
            string memory imageUrl,
            uint256 voteCount,
            bool isActive
        )
    {
        Election storage election = elections[electionId];
        require(candidateId > 0 && candidateId <= election.candidateCount, "Invalid candidate ID");
        
        Candidate storage candidate = election.candidates[candidateId];
        return (
            candidate.name,
            candidate.description,
            candidate.imageUrl,
            candidate.voteCount,
            candidate.isActive
        );
    }

    function getAllCandidates(uint256 electionId)
        external
        view
        electionExists(electionId)
        returns (
            string[] memory names,
            string[] memory descriptions,
            string[] memory imageUrls,
            uint256[] memory voteCounts,
            bool[] memory isActiveList
        )
    {
        Election storage election = elections[electionId];
        uint256 count = election.candidateCount;
        
        names = new string[](count);
        descriptions = new string[](count);
        imageUrls = new string[](count);
        voteCounts = new uint256[](count);
        isActiveList = new bool[](count);
        
        for (uint256 i = 1; i <= count; i++) {
            Candidate storage candidate = election.candidates[i];
            names[i-1] = candidate.name;
            descriptions[i-1] = candidate.description;
            imageUrls[i-1] = candidate.imageUrl;
            voteCounts[i-1] = candidate.voteCount;
            isActiveList[i-1] = candidate.isActive;
        }
    }

    function getVoterStatus(uint256 electionId, address voter)
        external
        view
        electionExists(electionId)
        returns (bool isEligible, bool hasVoted, uint256[] memory choices)
    {
        Election storage election = elections[electionId];
        return (
            election.eligibleVoters[voter],
            election.hasVoted[voter],
            election.voterChoices[voter]
        );
    }

    function isElectionActive(uint256 electionId) external view electionExists(electionId) returns (bool) {
        Election storage election = elections[electionId];
        return election.status == ElectionStatus.ACTIVE && 
               block.timestamp >= election.startTime && 
               block.timestamp <= election.endTime;
    }

    function getElectionResults(uint256 electionId)
        external
        view
        electionExists(electionId)
        returns (uint256[] memory candidateVotes, uint256 totalVotes)
    {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.ENDED, "Election results not available yet");
        
        candidateVotes = new uint256[](election.candidateCount);
        for (uint256 i = 1; i <= election.candidateCount; i++) {
            candidateVotes[i-1] = election.candidates[i].voteCount;
        }
        
        return (candidateVotes, election.totalVotes);
    }

    // Utility functions
    function getElectionCount() external view returns (uint256) {
        return electionCount;
    }

    function isAuthorizedCreator(address creator) external view returns (bool) {
        return electionCreators[creator];
    }
}
