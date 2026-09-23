// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry reg;

    function setUp() public {
        reg = new AgentRegistry();
    }

    function test_mint_ownerOf_getAgent() public {
        address alice = address(0xA11CE);
        vm.prank(alice);
        uint256 id = reg.mint("sealoo-v1");
        assertEq(id, 1);
        assertEq(reg.ownerOf(id), alice);
        (uint256 aid, address owner, string memory meta) = reg.getAgent(id);
        assertEq(aid, 1);
        assertEq(owner, alice);
        assertEq(meta, "sealoo-v1");
        uint256[] memory ids = reg.agentsOf(alice);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }
}
