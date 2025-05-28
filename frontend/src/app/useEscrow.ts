import { useCallback } from "react";
import { ethers } from "ethers";
import { ESCROW_ADDRESS, ESCROW_ABI } from "./escrowConfig";

// You should pass a signer from your wallet connection (e.g., from wagmi or ethers)
export function useEscrow(signer: ethers.Signer | null) {
  const contract = signer
    ? new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
    : null;

  // Create a new escrow
  const createEscrow = useCallback(
    async (buyer: string, token: string, amount: ethers.BigNumberish) => {
      if (!contract) throw new Error("No signer or contract");
      const tx = await contract.createEscrow(buyer, token, amount);
      return tx.wait();
    },
    [contract]
  );

  // Release escrow funds
  const releaseEscrow = useCallback(
    async (escrowId: string) => {
      if (!contract) throw new Error("No signer or contract");
      const tx = await contract.releaseEscrow(escrowId);
      return tx.wait();
    },
    [contract]
  );

  // Refund escrow funds
  const refundEscrow = useCallback(
    async (escrowId: string) => {
      if (!contract) throw new Error("No signer or contract");
      const tx = await contract.refundEscrow(escrowId);
      return tx.wait();
    },
    [contract]
  );

  // Get escrow details
  const getEscrowDetails = useCallback(
    async (escrowId: string) => {
      if (!contract) throw new Error("No signer or contract");
      return contract.getEscrowDetails(escrowId);
    },
    [contract]
  );

  // Get all escrows for a user
  const getUserEscrows = useCallback(
    async (user: string) => {
      if (!contract) throw new Error("No signer or contract");
      return contract.getUserEscrows(user);
    },
    [contract]
  );

  return {
    createEscrow,
    releaseEscrow,
    refundEscrow,
    getEscrowDetails,
    getUserEscrows,
  };
} 