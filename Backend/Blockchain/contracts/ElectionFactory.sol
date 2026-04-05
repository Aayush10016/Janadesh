// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CollegeVoting.sol";

/**
 * @title ElectionFactory
 * @dev Factory contract for deploying and managing multiple CollegeVoting elections
 */
contract ElectionFactory {
    address public admin;
    uint256 public deployedElectionsCount;
    
    // Registry of all deployed elections
    mapping(uint256 => address) public deployedElections;
    mapping(address => bool) public isDeployedElection;
    
    // Access control for election creators
    mapping(address => bool) public authorizedCreators;
    mapping(address => uint256) public creatorElectionCount;
    mapping(address => address[]) public creatorElections;
    
    // Election categorization
    mapping(string => address[]) public electionsByCategory;
    mapping(address => string) public electionCategory;
    
    // Events
    event ElectionDeployed(
        uint256 indexed electionId,
        address indexed electionContract,
        address indexed creator,
        string title,
        string category,
        uint256 timestamp
    );
    
    event CreatorAuthorized(
        address indexed creator,
        address indexed authorizedBy,
        uint256 timestamp
    );
    
    event CreatorRevoked(
        address indexed creator,
        address indexed revokedBy,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyAuthorizedCreator() {
        require(
            msg.sender == admin || authorizedCreators[msg.sender],
            "Not authorized to create elections"
        );
        _;
    }

    modifier onlyDeployedElection(address electionContract) {
        require(isDeployedElection[electionContract], "Not a deployed election");
        _;
    }

    constructor() {
        admin = msg.sender;
        deployedElectionsCount = 0;
        authorizedCreators[msg.sender] = true; // Admin is always authorized
    }

    /**
     * @dev Deploy a new CollegeVoting election contract
     */
    function deployElection(
        string memory title,
        string memory category
    ) external onlyAuthorizedCreator returns (address electionContract) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(category).length > 0, "Category cannot be empty");
        
        // Deploy new CollegeVoting contract
        CollegeVoting newElection = new CollegeVoting();
        // Hand over admin control to the creator who initiated this deployment.
        newElection.transferAdmin(msg.sender);
        electionContract = address(newElection);
        
        // Update registry
        deployedElectionsCount += 1;
        uint256 electionId = deployedElectionsCount;
        
        deployedElections[electionId] = electionContract;
        isDeployedElection[electionContract] = true;
        
        // Update creator tracking
        creatorElectionCount[msg.sender] += 1;
        creatorElections[msg.sender].push(electionContract);
        
        // Add to category mapping
        electionsByCategory[category].push(electionContract);
        electionCategory[electionContract] = category;
        
        emit ElectionDeployed(
            electionId,
            electionContract,
            msg.sender,
            title,
            category,
            block.timestamp
        );
        
        return electionContract;
    }

    /**
     * @dev Authorize a new election creator
     */
    function authorizeCreator(address creator) external onlyAdmin {
        require(creator != address(0), "Invalid creator address");
        require(!authorizedCreators[creator], "Creator already authorized");
        
        authorizedCreators[creator] = true;
        emit CreatorAuthorized(creator, msg.sender, block.timestamp);
    }

    /**
     * @dev Revoke election creator authorization
     */
    function revokeCreator(address creator) external onlyAdmin {
        require(creator != admin, "Cannot revoke admin privileges");
        require(authorizedCreators[creator], "Creator not authorized");
        
        authorizedCreators[creator] = false;
        emit CreatorRevoked(creator, msg.sender, block.timestamp);
    }

    /**
     * @dev Get all elections in a specific category
     */
    function getElectionsByCategory(string memory category) 
        external 
        view 
        returns (address[] memory elections) 
    {
        return electionsByCategory[category];
    }

    /**
     * @dev Get all elections created by a specific creator
     */
    function getElectionsByCreator(address creator) 
        external 
        view 
        returns (address[] memory elections) 
    {
        return creatorElections[creator];
    }

    /**
     * @dev Get paginated list of all deployed elections
     */
    function getDeployedElections(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory elections, uint256 total) 
    {
        total = deployedElectionsCount;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 length = end - offset;
        elections = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            elections[i] = deployedElections[offset + i + 1]; // IDs start from 1
        }
        
        return (elections, total);
    }

    /**
     * @dev Get creator statistics
     */
    function getCreatorStats(address creator) 
        external 
        view 
        returns (uint256 electionCount, bool isAuthorized) 
    {
        return (creatorElectionCount[creator], authorizedCreators[creator]);
    }

    /**
     * @dev Emergency function to transfer admin rights
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        require(newAdmin != admin, "Same admin address");
        
        admin = newAdmin;
        authorizedCreators[newAdmin] = true;
    }
}
