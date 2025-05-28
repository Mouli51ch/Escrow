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
  const [escrowInitialized, setEscrowInitialized] = useState(false);

  const validateForm = () => {
    if (!university) {
      setError('University address is required');
      return false;
    }

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

  const handleInitialize = async (e: React.FormEvent) => {
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
      
      setSuccess('Initialization submitted! Waiting for confirmation...');
      await tx.wait();
      setTxHash(tx.hash);
      setSuccess('Escrow initialized successfully!');
      setEscrowInitialized(true);
      
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

  const handleDeposit = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI, signer);
      
      const tx = await contract.deposit({ value: ethers.utils.parseEther(amount) });
      
      setSuccess('Deposit submitted! Waiting for confirmation...');
      await tx.wait();
      setTxHash(tx.hash);
      setSuccess('Deposit successful!');
      setEscrowInitialized(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Tuition Escrow</h1>
                <p className="text-gray-600">Secure your international tuition payments</p>
              </div>
              {!isConnected ? (
                <button 
                  onClick={() => connect({ connector: connectors[0] })} 
                  className="mt-4 md:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect Wallet
                </button>
              ) : (
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <p className="text-sm text-gray-600">Connected:</p>
                    <p className="text-sm font-medium text-gray-900">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                  </div>
                  <button 
                    onClick={() => disconnect()} 
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {!escrowInitialized ? (
              <form onSubmit={handleInitialize} className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Initialize Escrow</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University Address</label>
                      <input
                        type="text"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="0x..."
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Enter any valid Ethereum address (e.g., 0x1234...5678)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ETH)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          placeholder="0.0"
                          step="0.000000000000000001"
                          min="0"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500">ETH</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Reference</label>
                      <input
                        type="text"
                        value={invoiceRef}
                        onChange={(e) => setInvoiceRef(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="INV-123"
                        required
                      />
                    </div>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : 'Initialize Escrow'}
                </button>
              </form>
            ) : (
              <div className="bg-blue-50 p-6 rounded-xl">
                <h2 className="text-xl font-semibold text-blue-900 mb-4">Escrow Initialized</h2>
                <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                  <p className="text-gray-600 mb-2">Please deposit the following amount:</p>
                  <p className="text-2xl font-bold text-blue-600">{amount} ETH</p>
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : 'Deposit Funds'}
                </button>
              </div>
            )}

            {txHash && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Transaction Hash:</p>
                    <p className="text-sm font-medium text-gray-900">{txHash}</p>
                  </div>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Etherscan
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
