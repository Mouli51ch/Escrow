"use client";
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import { TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI } from '../../lib/contracts';
import React from 'react';

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
    amount: "0.002",
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
    amount: "0.002",
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
    amount: "0.002",
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
  const [escrowJsonInput, setEscrowJsonInput] = useState('');

  useEffect(() => {
    // Only load mock escrows if not already loaded (prevents overwriting user JSON)
    if (escrows.length === 0) {
      setEscrows(MOCK_ESCROWS);
    }
  }, []);

  const loadEscrows = () => {
    if (escrowJsonInput.trim()) {
      try {
        const parsed = JSON.parse(escrowJsonInput);
        if (Array.isArray(parsed)) {
          setEscrows(parsed);
          setError(null);
          return;
        } else {
          setError('JSON must be an array of escrows.');
        }
      } catch (e) {
        setError('Invalid JSON format.');
      }
    } else {
      setEscrows(MOCK_ESCROWS);
      setError(null);
    }
  };

  const handleAction = async (escrowAddress: string, action: 'release' | 'refund') => {
    setActionLoading(escrowAddress);
    setError(null);
    setSuccess(null);
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI, signer);
      let tx;
      if (action === 'release') {
        tx = await contract.release(); // No argument
      } else {
        tx = await contract.refund(); // No argument
      }
      setSuccess(`${action === 'release' ? 'Release' : 'Refund'} submitted! Waiting for confirmation...`);
      await tx.wait();
      setEscrows(prev => prev.map(e =>
        e.address === escrowAddress
          ? {
              ...e,
              released: action === 'release' ? true : e.released,
              refunded: action === 'refund' ? true : e.refunded
            }
          : e
      ));
      setSuccess(`${action === 'release' ? 'Released' : 'Refunded'} successfully!`);
    } catch (err: any) {
      setError(err.message || 'Action failed');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Page</h1>
                <p className="text-gray-600">Manage tuition escrow payments</p>
              </div>
              <div className="flex items-center gap-4">
                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    <button
                      onClick={() => disconnect()}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => connect({ connector })}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                      Connect {connector.name}
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Search by invoice ref or payer..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={loadEscrows}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-fit"
                >
                  Load Escrows
                </button>
              </div>
              <div className="flex gap-4 items-center">
                <label className="text-gray-700">Filter:</label>
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <label className="text-gray-700">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="amount">Amount</option>
                  <option value="date">Date</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
            {error && <div className="mb-4 text-red-600 font-medium">{error}</div>}
            {success && <div className="mb-4 text-green-600 font-medium">{success}</div>}
            {filteredEscrows.length === 0 ? (
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
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${escrow.deposited ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>Deposited</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${escrow.released ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>Released</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${escrow.refunded ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>Refunded</span>
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
                          <p className="text-sm font-medium text-gray-900">{new Date(escrow.timestamp * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-6 flex space-x-3">
                        <button
                          onClick={() => handleAction(escrow.address, 'release')}
                          disabled={actionLoading === escrow.address || escrow.released || escrow.refunded}
                          className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${actionLoading === escrow.address || escrow.released || escrow.refunded ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
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
                          className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${actionLoading === escrow.address || escrow.released || escrow.refunded ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
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