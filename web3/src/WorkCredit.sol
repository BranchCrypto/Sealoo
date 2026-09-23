// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Prepaid Credit: lock at task start, settle on any terminal state.
contract WorkCredit {
    enum TaskState {
        None,
        Locked,
        Settled
    }

    struct Task {
        address owner;
        uint256 estimate;
        TaskState state;
    }

    mapping(address => uint256) public balanceOf; // available
    mapping(address => uint256) public lockedOf;
    mapping(bytes32 => Task) public tasks;
    mapping(address => bytes32) public openTask; // at most one unsettled per owner

    event CreditPurchased(address indexed owner, uint256 amount);
    event CreditLocked(bytes32 indexed taskId, uint256 estimate, address indexed owner);
    event CreditSettled(bytes32 indexed taskId, uint256 actual, uint256 refund, address indexed owner);

    // ponytail: Fuji faucet mint; switch to payable AVAX pricing on Mainnet.
    function purchase(uint256 amount) external {
        require(amount > 0, "amount=0");
        balanceOf[msg.sender] += amount;
        emit CreditPurchased(msg.sender, amount);
    }

    function lock(bytes32 taskId, uint256 estimate) external {
        require(estimate > 0, "estimate=0");
        require(tasks[taskId].state == TaskState.None, "task exists");
        require(openTask[msg.sender] == bytes32(0), "unsettled task");
        require(balanceOf[msg.sender] >= estimate, "insufficient");

        balanceOf[msg.sender] -= estimate;
        lockedOf[msg.sender] += estimate;
        tasks[taskId] = Task({owner: msg.sender, estimate: estimate, state: TaskState.Locked});
        openTask[msg.sender] = taskId;
        emit CreditLocked(taskId, estimate, msg.sender);
    }

    function settle(bytes32 taskId, uint256 actual) external {
        Task storage t = tasks[taskId];
        require(t.state == TaskState.Locked, "not locked");
        require(t.owner == msg.sender, "not owner");
        require(actual <= t.estimate, "actual>estimate");

        uint256 refund = t.estimate - actual;
        lockedOf[msg.sender] -= t.estimate;
        if (refund > 0) {
            balanceOf[msg.sender] += refund;
        }
        t.state = TaskState.Settled;
        openTask[msg.sender] = bytes32(0);
        emit CreditSettled(taskId, actual, refund, msg.sender);
    }
}
