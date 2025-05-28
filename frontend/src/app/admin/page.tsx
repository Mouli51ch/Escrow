"use client";
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import { TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI } from '../lib/contracts';

interface EscrowState {
  address: string;
  payer: string;
  university: string;
  amount: string;
  invoiceRef: string;
  deposited: boolean;
  released: boolean;
  refunded: boolean;
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [escrows, setEscrows] = useState<EscrowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadEscrows = async () => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const contract = new ethers.Contract(TUITION_ESCROW_ADDRESS, TUITION_ESCROW_ABI, provider);
      
      // Get all Deposited events
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
            refunded
          };
        })
      );
      
      setEscrows(escrowStates);
    } catch (err) {
      console.error('Error loading escrows:', err);
      setError('Failed to load escrows');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (escrowAddress: string, action: 'release' | 'refund') => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(escrowAddress, TUITION_ESCROW_ABI, signer);
      
      const tx = action === 'release' 
        ? await contract.release()
        : await contract.refund();
      
      await tx.wait();
      setSuccess(`${action === 'release' ? 'Released' : 'Refunded'} successfully!`);
      loadEscrows(); // Refresh the list
    } catch (err) {
      console.error(`Error ${action}ing escrow:`, err);
      setError(`Failed to ${action} escrow`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadEscrows();
    }
  }, [isConnected]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      {!isConnected ? (
        <button 
          onClick={() => connect({ connector: connectors[0] })} 
          className="bg-blue-500 text-white p-2 rounded"
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p>Connected: {address}</p>
            <button 
              onClick={() => disconnect()} 
              className="bg-red-500 text-white p-2 rounded"
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

          <div className="mb-4">
            <button 
              onClick={loadEscrows} 
              disabled={loading}
              className="bg-gray-500 text-white p-2 rounded"
            >
              {loading ? 'Loading...' : 'Refresh Escrows'}
            </button>
          </div>

          <div className="grid gap-4">
            {escrows.map((escrow) => (
              <div key={escrow.address} className="border p-4 rounded">
                <h2 className="font-bold mb-2">Escrow: {escrow.address}</h2>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <p>Payer: {escrow.payer}</p>
                  <p>University: {escrow.university}</p>
                  <p>Amount: {escrow.amount} ETH</p>
                  <p>Invoice Ref: {escrow.invoiceRef}</p>
                </div>
                <div className="flex gap-2 mb-2">
                  <span className={`px-2 py-1 rounded ${escrow.deposited ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                    Deposited
                  </span>
                  <span className={`px-2 py-1 rounded ${escrow.released ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                    Released
                  </span>
                  <span className={`px-2 py-1 rounded ${escrow.refunded ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                    Refunded
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(escrow.address, 'release')}
                    disabled={loading || escrow.released || escrow.refunded}
                    className="bg-green-500 text-white p-2 rounded disabled:bg-gray-300"
                  >
                    Release
                  </button>
                  <button
                    onClick={() => handleAction(escrow.address, 'refund')}
                    disabled={loading || escrow.released || escrow.refunded}
                    className="bg-red-500 text-white p-2 rounded disabled:bg-gray-300"
                  >
                    Refund
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 