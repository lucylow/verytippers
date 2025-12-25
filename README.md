# VeryTippers - Enhanced Source Code

This repository contains the enhanced source code for VeryTippers, an AI-Powered Social Micro-Tipping & Content Monetization Bot, integrating a full-stack solution with Web3 smart contracts and an AI-powered moderation service.

## 🚀 Project Structure

-   `client/`: The React/TypeScript frontend (Landing Page).
-   `server/`: The Node.js/Express backend, including AI (HuggingFace) and Web3 (Ethers.js) services.
-   `contracts/`: Solidity smart contracts for Tipping, Badges, and Leaderboards.

## 🛠️ Setup and Installation

### 1. Prerequisites

You need the following installed:
-   Node.js (v18+)
-   pnpm (or npm/yarn)
-   Redis server (running locally or accessible via URL)
-   A Solidity development environment (e.g., Hardhat or Foundry) is recommended for compiling and deploying contracts.

### 2. Install Dependencies

Navigate to the root directory and install dependencies:

\`\`\`bash
pnpm install
# or npm install
\`\`\`

### 3. Environment Configuration

Copy the example environment file and fill in your details:

\`\`\`bash
cp .env.example .env
\`\`\`

**Key variables to update in `.env`:**

| Variable | Description |
| :--- | :--- |
| `VERYCHAT_BOT_TOKEN` | Token for the Verychat Bot API. |
| `REDIS_URL` | Connection string for your Redis instance (e.g., `redis://localhost:6379`). |
| `HUGGINGFACE_API_KEY` | Your API key for the HuggingFace AI service (used for content moderation). |
| `SPONSOR_PRIVATE_KEY` | Private key for the relayer wallet (used to sponsor gas for meta-transactions). **Use a dedicated, low-value wallet.** |
| `TIP_CONTRACT_ADDRESS` | Address of the deployed `VeryTippers` contract. |
| `BADGE_CONTRACT_ADDRESS` | Address of the deployed `BadgeFactory` contract. |

### 4. Smart Contract Setup (Optional but Recommended)

The contracts use OpenZeppelin libraries. To compile and deploy:

1.  **Install Hardhat/Foundry** in the project root.
2.  **Install OpenZeppelin:** \`pnpm install @openzeppelin/contracts\`
3.  **Compile:** Use your chosen tool (e.g., \`npx hardhat compile\`).
4.  **Deploy:** Deploy the contracts to the Very Chain testnet/mainnet and update the addresses in the `.env` file.

### 5. Running the Application

The project uses a single server to host both the API and the static frontend assets.

**Development Mode:**

\`\`\`bash
# Starts the frontend development server (client)
pnpm dev
\`\`\`

**Production Build & Start:**

\`\`\`bash
# 1. Build the frontend and compile the backend
pnpm build

# 2. Start the production server (hosts both frontend and API)
pnpm start
\`\`\`

## 💡 Key Enhancements

-   **Web3 Integration:** Full Solidity contracts for tipping, withdrawal, and badge minting. Backend services use Ethers.js for meta-transaction relaying (gas abstraction).
-   **AI Moderation:** Integrated `HuggingFaceService` to moderate tip messages using the `unitary/toxic-bert` model, ensuring a safe social environment.
-   **Full-Stack API:** A unified Node.js/Express server handles API requests, orchestrates the AI check, and sends the final transaction via the relayer service.
-   **Frontend Mock:** The `HeroSection` in the frontend now includes a mock button to test the new `/api/v1/tip` endpoint.
