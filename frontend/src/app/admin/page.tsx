"use client";
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import { TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI } from '../../lib/contracts';

interface EscrowState {
  address: string;
  payer: string;
  university: string;
  amount: string;
  invoiceRef: string;
  deposited: boolean;
  released: boolean;
  refunded: boolean;
  timestamp: number;
}

// Mock data for testing
const MOCK_ESCROWS: EscrowState[] = [
  {
    address: "0x1234567890123456789012345678901234567890",
    payer: "0xabcdef1234567890abcdef1234567890abcdef12",
    university: "0x9876543210987654321098765432109876543210",
    amount: "1.5",
    invoiceRef: "INV-2024-001",
    deposited: true,
    released: false,
    refunded: false,
    timestamp: Math.floor(Date.now() / 1000) - 86400 // 1 day ago
  },
  {
    address: "0x2345678901234567890123456789012345678901",
    payer: "0xbcdef1234567890abcdef1234567890abcdef123",
    university: "0x8765432109876543210987654321098765432109",
    amount: "2.0",
    invoiceRef: "INV-2024-002",
    deposited: true,
    released: true,
    refunded: false,
    timestamp: Math.floor(Date.now() / 1000) - 172800 // 2 days ago
  },
  {
    address: "0x3456789012345678901234567890123456789012",
    payer: "0xcdef1234567890abcdef1234567890abcdef1234",
    university: "0x7654321098765432109876543210987654321098",
    amount: "3.0",
    invoiceRef: "INV-2024-003",
    deposited: true,
    released: false,
    refunded: true,
    timestamp: Math.floor(Date.now() / 1000) - 259200 // 3 days ago
  }
];

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [escrows, setEscrows] = useState<EscrowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'date' | 'status'>('date');
  const [searchQuery, setSearchQuery] = useState('');

  const loadEscrows = async () => {
    if (!isConnected) {
      // Use mock data when not connected
      setEscrows(MOCK_ESCROWS);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const contract = new ethers.Contract(TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI, provider);
      
      const filter = contract.filters.Deposited();
      const events = await contract.queryFilter(filter);
      
      const escrowStates = await Promise.all(
        events.map(async (event) => {
          const escrowAddress = event.args?.escrowAddress;
          const escrowContract = new ethers.Contract(escrowAddress, TUITION_ESCROW_ABI, provider);
          
          const [payer, university, amount, invoiceRef, deposited, released, refunded] = 
            await Promise.all([
              escrowContract.payer(),
              escrowContract.university(),
              escrowContract.amount(),
              escrowContract.invoiceRef(),
              escrowContract.deposited(),
              escrowContract.released(),
              escrowContract.refunded()
            ]);

          return {
            address: escrowAddress,
            payer,
            university,
            amount: ethers.utils.formatEther(amount),
            invoiceRef,
            deposited,
            released,
            refunded,
            timestamp: Math.floor(Date.now() / 1000) // Use current timestamp for mock data
          };
        })
      );
      
      setEscrows(escrowStates);
    } catch (err) {
      console.error('Error loading escrows:', err);
      setError('Failed to load escrows. Please try again.');
      // Use mock data on error
      setEscrows(MOCK_ESCROWS);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (escrowAddress: string, action: 'release' | 'refund') => {
    if (!isConnected) return;
    setActionLoading(escrowAddress);
    setError(null);
    setSuccess(null);
    
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(escrowAddress, TUITION_ESCROW_ABI, signer);
      
      const tx = action === 'release' 
        ? await contract.release()
        : await contract.refund();
      
      setSuccess(`${action === 'release' ? 'Release' : 'Refund'} transaction submitted! Waiting for confirmation...`);
      await tx.wait();
      setSuccess(`${action === 'release' ? 'Released' : 'Refunded'} successfully!`);
      loadEscrows();
    } catch (err: any) {
      console.error(`Error ${action}ing escrow:`, err);
      setError(`Failed to ${action} escrow: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEscrows = escrows
    .filter(escrow => {
      if (filter === 'pending') return escrow.deposited && !escrow.released && !escrow.refunded;
      if (filter === 'completed') return escrow.released || escrow.refunded;
      return true;
    })
    .filter(escrow => 
      escrow.invoiceRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      escrow.payer.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'amount') return parseFloat(b.amount) - parseFloat(a.amount);
      if (sortBy === 'date') return b.timestamp - a.timestamp;
      return 0;
    });

  useEffect(() => {
    // Load mock data immediately
    loadEscrows();
  }, [isConnected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                <p className="text-gray-600">Manage tuition escrow payments</p>
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

            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by invoice or payer address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-4">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'completed')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'amount' | 'date' | 'status')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                </select>
                <button 
                  onClick={loadEscrows} 
                  disabled={loading}
                  className={`bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading escrows...</p>
              </div>
            ) : filteredEscrows.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredEscrows.map((escrow) => (
                  <div key={escrow.address} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          Escrow: {escrow.address.slice(0, 6)}...{escrow.address.slice(-4)}
                        </h3>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            escrow.deposited ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Deposited
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            escrow.released ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Released
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            escrow.refunded ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Refunded
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">Payer</p>
                          <p className="text-sm font-medium text-gray-900">{escrow.payer.slice(0, 6)}...{escrow.payer.slice(-4)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">University</p>
                          <p className="text-sm font-medium text-gray-900">{escrow.university.slice(0, 6)}...{escrow.university.slice(-4)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Amount</p>
                          <p className="text-lg font-bold text-blue-600">{escrow.amount} ETH</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Invoice Reference</p>
                          <p className="text-sm font-medium text-gray-900">{escrow.invoiceRef}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(escrow.timestamp * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 flex space-x-3">
                        <button
                          onClick={() => handleAction(escrow.address, 'release')}
                          disabled={actionLoading === escrow.address || escrow.released || escrow.refunded}
                          className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${
                            actionLoading === escrow.address || escrow.released || escrow.refunded
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {actionLoading === escrow.address ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </div>
                          ) : 'Release'}
                        </button>
                        <button
                          onClick={() => handleAction(escrow.address, 'refund')}
                          disabled={actionLoading === escrow.address || escrow.released || escrow.refunded}
                          className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${
                            actionLoading === escrow.address || escrow.released || escrow.refunded
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {actionLoading === escrow.address ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </div>
                          ) : 'Refund'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 