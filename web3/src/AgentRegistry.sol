// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice On-chain Sealoo agent identity (Fuji). Not a marketplace ERC721.
contract AgentRegistry {
    struct Agent {
        uint256 agentId;
        address owner;
        string metadata;
    }

    uint256 public nextId = 1;
    mapping(uint256 => Agent) private agents;
    mapping(address => uint256[]) private byOwner;

    event AgentMinted(uint256 indexed agentId, address indexed owner, string metadata);

    function mint(string calldata metadata) external returns (uint256 agentId) {
        agentId = nextId++;
        agents[agentId] = Agent({agentId: agentId, owner: msg.sender, metadata: metadata});
        byOwner[msg.sender].push(agentId);
        emit AgentMinted(agentId, msg.sender, metadata);
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        address o = agents[agentId].owner;
        require(o != address(0), "unknown agent");
        return o;
    }

    function getAgent(uint256 agentId) external view returns (uint256, address, string memory) {
        Agent storage a = agents[agentId];
        require(a.owner != address(0), "unknown agent");
        return (a.agentId, a.owner, a.metadata);
    }

    function agentsOf(address owner) external view returns (uint256[] memory) {
        return byOwner[owner];
    }
}
