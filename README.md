# Cross-Border Tuition Escrow

A decentralized escrow system for managing international tuition payments using smart contracts.

## Features

- ERC20 token (MockUSDC) for tuition payments
- Escrow contract for secure fund management
- Admin interface for university representatives
- User interface for students/payers
- Support for Sepolia testnet
- CI/CD pipeline with GitHub Actions

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- MetaMask or other Web3 wallet
- Infura/Alchemy account for Sepolia RPC URL
- Etherscan API key for contract verification

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cross-border.git
cd cross-border
```

2. Install dependencies:
```bash
npm install
cd frontend
npm install
cd ..
```

3. Copy the environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your values:
```
# Hardhat Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-project-id
PRIVATE_KEY=your-wallet-private-key
ETHERSCAN_API_KEY=your-etherscan-api-key

# Frontend Configuration
NEXT_PUBLIC_TUITION_ESCROW_ADDRESS=your-deployed-contract-address
NEXT_PUBLIC_MOCK_USDC_ADDRESS=your-deployed-contract-address
```

## Development

1. Start a local Hardhat node:
```bash
npm run node
```

2. Deploy contracts to local network:
```bash
npm run deploy:local
```

3. Run tests:
```bash
npm test
```

4. Start the frontend development server:
```bash
npm run dev
```

## Deployment

### Local Development

1. Start a local Hardhat node in one terminal:
```bash
npm run node
```

2. Deploy contracts to the local network:
```bash
npm run deploy:local
```

3. Update the frontend environment variables with the deployed contract addresses.

### Sepolia Testnet

1. Ensure your `.env` file has the correct Sepolia configuration:
```
SEPOLIA_RPC_URL=your-sepolia-rpc-url
PRIVATE_KEY=your-wallet-private-key
ETHERSCAN_API_KEY=your-etherscan-api-key
```

2. Deploy to Sepolia:
```bash
npm run deploy:sepolia
```

3. Update the frontend environment variables with the deployed contract addresses.

## Contract Addresses

After deployment, update the following environment variables in your `.env` file:

```
NEXT_PUBLIC_TUITION_ESCROW_ADDRESS=your-deployed-contract-address
NEXT_PUBLIC_MOCK_USDC_ADDRESS=your-deployed-contract-address
```

## Usage

### User Flow

1. Connect your wallet
2. Enter university address and payment details
3. Initialize the escrow
4. Deposit funds
5. Wait for university to release funds

### Admin Flow

1. Connect your wallet
2. View all escrows
3. Release or refund funds as needed

## Testing

Run the test suite:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

- All smart contracts are thoroughly tested
- Access control implemented for admin functions
- Secure fund management through escrow mechanism
- Regular security audits recommended

## Support

For support, please open an issue in the GitHub repository.
