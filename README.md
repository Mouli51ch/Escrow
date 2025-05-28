# Cross-Border Tuition Escrow

A decentralized escrow system for managing international tuition payments using smart contracts.

## Features

- ERC20 token (MockUSDC) for tuition payments
- Escrow contract for secure payment handling
- Admin interface for payment release/refund
- User interface for creating escrows
- Sepolia testnet deployment support

## Prerequisites

- Node.js v16+
- npm or yarn
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH
- Infura/Alchemy account for RPC endpoint

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd cross-border
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your values:
- `SEPOLIA_RPC_URL`: Your Infura/Alchemy Sepolia endpoint
- `PRIVATE_KEY`: Your wallet private key (for deployment)
- `ETHERSCAN_API_KEY`: Your Etherscan API key
- `NEXT_PUBLIC_TUITION_ESCROW_ADDRESS`: Deployed contract address
- `NEXT_PUBLIC_MOCK_USDC_ADDRESS`: Deployed contract address

## Development

1. Start local Hardhat node:
```bash
npx hardhat node
```

2. Deploy contracts locally:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

3. Run tests:
```bash
npx hardhat test
```

4. Start frontend development server:
```bash
cd frontend
npm run dev
```

## Deployment

1. Deploy to Sepolia:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

2. Verify contracts on Etherscan:
```bash
npx hardhat verify --network sepolia <contract-address>
```

## Contract Addresses

### Sepolia Testnet
- TuitionEscrow: `0x...` (Update after deployment)
- MockUSDC: `0x...` (Update after deployment)

## Usage

1. **User Flow**
   - Connect wallet
   - Enter university address, amount, and invoice reference
   - Approve and deposit funds
   - Wait for university to release payment

2. **Admin Flow**
   - Connect wallet (must be contract owner)
   - View all escrows
   - Release or refund payments as needed

## Testing

- Unit tests: `npx hardhat test`
- Frontend tests: `cd frontend && npm test`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
