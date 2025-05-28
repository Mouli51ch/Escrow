"use client";
import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import { TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI } from '../lib/contracts';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [university, setUniversity] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateForm = () => {
    if (!university) {
      setError('University address is required');
      return false;
    }

    // Check if the address is a valid Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(university)) {
      setError('Invalid Ethereum address format. Must start with 0x followed by 40 hexadecimal characters');
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }

    if (!invoiceRef) {
      setError('Invoice reference is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI, signer);
      
      const tx = await contract.initialize(
        address,
        university,
        ethers.utils.parseEther(amount),
        invoiceRef
      );
      
      setSuccess('Transaction submitted! Waiting for confirmation...');
      await tx.wait();
      setTxHash(tx.hash);
      setSuccess('Escrow initialized successfully!');
      
      // Reset form
      setUniversity('');
      setAmount('');
      setInvoiceRef('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tuition Escrow</h1>
      
      {!isConnected ? (
        <button 
          onClick={() => connect({ connector: connectors[0] })} 
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Connected: {address}</p>
            <button 
              onClick={() => disconnect()} 
              className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
            >
              Disconnect
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">University Address</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0x..."
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter any valid Ethereum address (e.g., 0x1234...5678)
              </p>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Amount (ETH)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.0"
                step="0.000000000000000001"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Invoice Reference</label>
              <input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="INV-123"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className={`w-full p-2 rounded text-white transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {loading ? 'Processing...' : 'Initialize Escrow'}
            </button>
          </form>

          {txHash && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="text-gray-600">Transaction Hash: {txHash}</p>
              <a 
                href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 hover:text-blue-600"
              >
                View on Etherscan
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
