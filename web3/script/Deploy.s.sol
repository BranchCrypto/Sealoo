// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {WorkCredit} from "../src/WorkCredit.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        AgentRegistry registry = new AgentRegistry();
        WorkCredit credit = new WorkCredit();
        vm.stopBroadcast();
        console2.log("AgentRegistry", address(registry));
        console2.log("WorkCredit", address(credit));
    }
}
