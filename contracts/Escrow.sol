// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Escrow is ReentrancyGuard, Ownable {
    struct EscrowDetails {
        address seller;
        address buyer;
        address token;
        uint256 amount;
        bool isReleased;
        bool isRefunded;
    }

    mapping(bytes32 => EscrowDetails) public escrows;
    mapping(address => bytes32[]) public userEscrows;

    event EscrowCreated(bytes32 indexed escrowId, address indexed seller, address indexed buyer, address token, uint256 amount);
    event EscrowReleased(bytes32 indexed escrowId);
    event EscrowRefunded(bytes32 indexed escrowId);

    constructor() {}

    function createEscrow(
        address _buyer,
        address _token,
        uint256 _amount
    ) external nonReentrant returns (bytes32) {
        require(_buyer != address(0), "Invalid buyer address");
        require(_token != address(0), "Invalid token address");
        require(_amount > 0, "Amount must be greater than 0");

        bytes32 escrowId = keccak256(abi.encodePacked(
            msg.sender,
            _buyer,
            _token,
            _amount,
            block.timestamp
        ));

        require(escrows[escrowId].seller == address(0), "Escrow already exists");

        escrows[escrowId] = EscrowDetails({
            seller: msg.sender,
            buyer: _buyer,
            token: _token,
            amount: _amount,
            isReleased: false,
            isRefunded: false
        });

        userEscrows[msg.sender].push(escrowId);
        userEscrows[_buyer].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, _buyer, _token, _amount);
        return escrowId;
    }

    function releaseEscrow(bytes32 _escrowId) external nonReentrant {
        EscrowDetails storage escrow = escrows[_escrowId];
        require(escrow.seller != address(0), "Escrow does not exist");
        require(msg.sender == escrow.buyer, "Only buyer can release");
        require(!escrow.isReleased && !escrow.isRefunded, "Escrow already processed");

        escrow.isReleased = true;
        IERC20(escrow.token).transfer(escrow.seller, escrow.amount);

        emit EscrowReleased(_escrowId);
    }

    function refundEscrow(bytes32 _escrowId) external nonReentrant {
        EscrowDetails storage escrow = escrows[_escrowId];
        require(escrow.seller != address(0), "Escrow does not exist");
        require(msg.sender == escrow.buyer, "Only buyer can refund");
        require(!escrow.isReleased && !escrow.isRefunded, "Escrow already processed");

        escrow.isRefunded = true;
        IERC20(escrow.token).transfer(escrow.buyer, escrow.amount);

        emit EscrowRefunded(_escrowId);
    }

    function getUserEscrows(address _user) external view returns (bytes32[] memory) {
        return userEscrows[_user];
    }

    function getEscrowDetails(bytes32 _escrowId) external view returns (
        address seller,
        address buyer,
        address token,
        uint256 amount,
        bool isReleased,
        bool isRefunded
    ) {
        EscrowDetails storage escrow = escrows[_escrowId];
        return (
            escrow.seller,
            escrow.buyer,
            escrow.token,
            escrow.amount,
            escrow.isReleased,
            escrow.isRefunded
        );
    }
} 