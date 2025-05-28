// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TuitionEscrow
 * @dev Escrow contract for tuition payments. Allows a payer to deposit funds, which can be released to the university or refunded to the payer by the owner.
 */
contract TuitionEscrow is Ownable, ReentrancyGuard {
    address public payer;
    address public university;
    uint256 public amount;
    string public invoiceRef;
    bool public deposited;
    bool public released;
    bool public refunded;

    event Deposited(address indexed payer, address indexed university, uint256 amount, string invoiceRef);
    event Released(address indexed university, uint256 amount);
    event Refunded(address indexed payer, uint256 amount);

    /**
     * @dev Initializes the escrow with payer, university, amount, and invoice reference.
     * @param _payer Address of the payer.
     * @param _university Address of the university.
     * @param _amount Amount to be escrowed.
     * @param _invoiceRef Reference to the invoice.
     */
    function initialize(address _payer, address _university, uint256 _amount, string calldata _invoiceRef) external onlyOwner {
        require(_payer != address(0), "Invalid payer address");
        require(_university != address(0), "Invalid university address");
        require(_amount > 0, "Amount must be greater than 0");
        payer = _payer;
        university = _university;
        amount = _amount;
        invoiceRef = _invoiceRef;
    }

    /**
     * @dev Allows the payer to deposit the escrow amount.
     */
    function deposit() external payable nonReentrant {
        require(msg.sender == payer, "Only payer can deposit");
        require(msg.value == amount, "Incorrect amount");
        require(!deposited, "Already deposited");
        deposited = true;
        emit Deposited(payer, university, amount, invoiceRef);
    }

    /**
     * @dev Allows the owner to release the escrow amount to the university.
     */
    function release() external onlyOwner nonReentrant {
        require(deposited, "Not deposited");
        require(!released, "Already released");
        require(!refunded, "Already refunded");
        released = true;
        (bool success, ) = university.call{value: amount}("");
        require(success, "Transfer failed");
        emit Released(university, amount);
    }

    /**
     * @dev Allows the owner to refund the escrow amount to the payer.
     */
    function refund() external onlyOwner nonReentrant {
        require(deposited, "Not deposited");
        require(!released, "Already released");
        require(!refunded, "Already refunded");
        refunded = true;
        (bool success, ) = payer.call{value: amount}("");
        require(success, "Transfer failed");
        emit Refunded(payer, amount);
    }
} 