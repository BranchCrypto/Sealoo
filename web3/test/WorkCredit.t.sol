// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WorkCredit} from "../src/WorkCredit.sol";

contract WorkCreditTest is Test {
    WorkCredit credit;
    address alice = address(0xA11CE);
    bytes32 task1 = bytes32(uint256(1));

    function setUp() public {
        credit = new WorkCredit();
    }

    function test_doc_example_lock5_settle3() public {
        vm.startPrank(alice);
        credit.purchase(100);
        assertEq(credit.balanceOf(alice), 100);
        assertEq(credit.lockedOf(alice), 0);

        credit.lock(task1, 5);
        assertEq(credit.balanceOf(alice), 95);
        assertEq(credit.lockedOf(alice), 5);

        credit.settle(task1, 3);
        assertEq(credit.balanceOf(alice), 97);
        assertEq(credit.lockedOf(alice), 0);
        vm.stopPrank();
    }

    function test_cancel_settle1() public {
        vm.startPrank(alice);
        credit.purchase(100);
        credit.lock(task1, 5);
        credit.settle(task1, 1);
        assertEq(credit.balanceOf(alice), 99);
        assertEq(credit.lockedOf(alice), 0);
        vm.stopPrank();
    }

    function test_revert_insufficient() public {
        vm.startPrank(alice);
        credit.purchase(3);
        vm.expectRevert("insufficient");
        credit.lock(task1, 5);
        vm.stopPrank();
    }

    function test_revert_second_unsettled() public {
        vm.startPrank(alice);
        credit.purchase(100);
        credit.lock(task1, 5);
        vm.expectRevert("unsettled task");
        credit.lock(bytes32(uint256(2)), 1);
        vm.stopPrank();
    }

    function test_revert_actual_gt_estimate() public {
        vm.startPrank(alice);
        credit.purchase(100);
        credit.lock(task1, 5);
        vm.expectRevert("actual>estimate");
        credit.settle(task1, 6);
        vm.stopPrank();
    }
}
