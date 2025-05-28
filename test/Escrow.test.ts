import { expect } from "chai";
import { ethers } from "hardhat";
import { Escrow, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Escrow", function () {
  let escrow: Escrow;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let token: MockERC20;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    token = await MockToken.deploy("Mock Token", "MTK");
    await token.waitForDeployment();

    // Deploy the Escrow contract
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    // Mint some tokens to the seller
    await token.mint(seller.address, ethers.parseEther("1000"));
  });

  describe("createEscrow", function () {
    it("should create a new escrow", async function () {
      const amount = ethers.parseEther("1");
      
      // Approve tokens
      await token.connect(seller).approve(await escrow.getAddress(), amount);
      
      // Create escrow
      const tx = await escrow.connect(seller).createEscrow(
        buyer.address,
        await token.getAddress(),
        amount
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs[0];
      const escrowId = event?.topics[1];
      
      expect(escrowId).to.not.be.undefined;
      
      const escrowDetails = await escrow.getEscrowDetails(escrowId!);
      expect(escrowDetails.seller).to.equal(seller.address);
      expect(escrowDetails.buyer).to.equal(buyer.address);
      expect(escrowDetails.token).to.equal(await token.getAddress());
      expect(escrowDetails.amount).to.equal(amount);
      expect(escrowDetails.isReleased).to.be.false;
      expect(escrowDetails.isRefunded).to.be.false;
    });

    it("should fail with invalid buyer address", async function () {
      const amount = ethers.parseEther("1");
      await token.connect(seller).approve(await escrow.getAddress(), amount);
      
      await expect(
        escrow.connect(seller).createEscrow(
          ethers.ZeroAddress,
          await token.getAddress(),
          amount
        )
      ).to.be.revertedWith("Invalid buyer address");
    });
  });

  describe("releaseEscrow", function () {
    it("should release escrow funds to seller", async function () {
      const amount = ethers.parseEther("1");
      
      // Create escrow
      await token.connect(seller).approve(await escrow.getAddress(), amount);
      const tx = await escrow.connect(seller).createEscrow(
        buyer.address,
        await token.getAddress(),
        amount
      );
      const receipt = await tx.wait();
      const event = receipt?.logs[0];
      const escrowId = event?.topics[1];
      
      expect(escrowId).to.not.be.undefined;
      
      // Transfer tokens to escrow contract
      await token.connect(seller).transfer(await escrow.getAddress(), amount);
      
      // Release escrow
      await escrow.connect(buyer).releaseEscrow(escrowId!);
      
      const escrowDetails = await escrow.getEscrowDetails(escrowId!);
      expect(escrowDetails.isReleased).to.be.true;
      
      const sellerBalance = await token.balanceOf(seller.address);
      expect(sellerBalance).to.equal(ethers.parseEther("1000")); // 1000 - 1 + 1
    });
  });

  describe("refundEscrow", function () {
    it("should refund escrow funds to buyer", async function () {
      const amount = ethers.parseEther("1");
      
      // Create escrow
      await token.connect(seller).approve(await escrow.getAddress(), amount);
      const tx = await escrow.connect(seller).createEscrow(
        buyer.address,
        await token.getAddress(),
        amount
      );
      const receipt = await tx.wait();
      const event = receipt?.logs[0];
      const escrowId = event?.topics[1];
      
      expect(escrowId).to.not.be.undefined;
      
      // Transfer tokens to escrow contract
      await token.connect(seller).transfer(await escrow.getAddress(), amount);
      
      // Refund escrow
      await escrow.connect(buyer).refundEscrow(escrowId!);
      
      const escrowDetails = await escrow.getEscrowDetails(escrowId!);
      expect(escrowDetails.isRefunded).to.be.true;
      
      const buyerBalance = await token.balanceOf(buyer.address);
      expect(buyerBalance).to.equal(amount);
    });
  });
}); 