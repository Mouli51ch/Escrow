import { expect } from "chai";
import { ethers } from "hardhat";
import { TuitionEscrow, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TuitionEscrow", function () {
  let tuitionEscrow: TuitionEscrow;
  let mockUSDC: MockUSDC;
  let owner: SignerWithAddress;
  let payer: SignerWithAddress;
  let university: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [owner, payer, university, other] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy TuitionEscrow
    const TuitionEscrow = await ethers.getContractFactory("TuitionEscrow");
    tuitionEscrow = await TuitionEscrow.deploy();
    await tuitionEscrow.waitForDeployment();

    // Mint tokens to payer
    await mockUSDC.mint(payer.address, ethers.parseEther("1000"));
  });

  describe("initialize", function () {
    it("should initialize the escrow with correct parameters", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      expect(await tuitionEscrow.payer()).to.equal(payer.address);
      expect(await tuitionEscrow.university()).to.equal(university.address);
      expect(await tuitionEscrow.amount()).to.equal(amount);
      expect(await tuitionEscrow.invoiceRef()).to.equal(invoiceRef);
    });

    it("should revert if initialized with zero address", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await expect(tuitionEscrow.initialize(ethers.ZeroAddress, university.address, amount, invoiceRef))
        .to.be.revertedWith("Invalid payer address");
      await expect(tuitionEscrow.initialize(payer.address, ethers.ZeroAddress, amount, invoiceRef))
        .to.be.revertedWith("Invalid university address");
    });

    it("should revert if initialized with zero amount", async function () {
      const invoiceRef = "INV-001";
      await expect(tuitionEscrow.initialize(payer.address, university.address, 0, invoiceRef))
        .to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("deposit", function () {
    it("should allow payer to deposit the correct amount", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      expect(await tuitionEscrow.deposited()).to.be.true;
    });

    it("should revert if non-payer tries to deposit", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await expect(tuitionEscrow.connect(other).deposit({ value: amount }))
        .to.be.revertedWith("Only payer can deposit");
    });

    it("should revert if incorrect amount is sent", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await expect(tuitionEscrow.connect(payer).deposit({ value: amount.add(1) }))
        .to.be.revertedWith("Incorrect amount");
    });

    it("should revert if already deposited", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await expect(tuitionEscrow.connect(payer).deposit({ value: amount }))
        .to.be.revertedWith("Already deposited");
    });
  });

  describe("release", function () {
    it("should allow owner to release funds to university", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await tuitionEscrow.release();
      expect(await tuitionEscrow.released()).to.be.true;
    });

    it("should revert if non-owner tries to release", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await expect(tuitionEscrow.connect(other).release())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if not deposited", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await expect(tuitionEscrow.release())
        .to.be.revertedWith("Not deposited");
    });

    it("should revert if already released", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await tuitionEscrow.release();
      await expect(tuitionEscrow.release())
        .to.be.revertedWith("Already released");
    });

    it("should revert if already refunded", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await tuitionEscrow.refund();
      await expect(tuitionEscrow.release())
        .to.be.revertedWith("Already refunded");
    });
  });

  describe("refund", function () {
    it("should allow owner to refund funds to payer", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await tuitionEscrow.refund();
      expect(await tuitionEscrow.refunded()).to.be.true;
    });

    it("should revert if non-owner tries to refund", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await expect(tuitionEscrow.connect(other).refund())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if not deposited", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await expect(tuitionEscrow.refund())
        .to.be.revertedWith("Not deposited");
    });

    it("should revert if already released", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await tuitionEscrow.release();
      await expect(tuitionEscrow.refund())
        .to.be.revertedWith("Already released");
    });

    it("should revert if already refunded", async function () {
      const amount = ethers.parseEther("1");
      const invoiceRef = "INV-001";
      await tuitionEscrow.initialize(payer.address, university.address, amount, invoiceRef);
      await tuitionEscrow.connect(payer).deposit({ value: amount });
      await tuitionEscrow.refund();
      await expect(tuitionEscrow.refund())
        .to.be.revertedWith("Already refunded");
    });
  });
}); 