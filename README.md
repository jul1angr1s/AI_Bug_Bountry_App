# ⚡ Thunder Security - Autonomous Bug Bounty Platform

<div align="center">

![Thunder Security](https://img.shields.io/badge/Thunder_Security-Autonomous_AI-blue?style=for-the-badge)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)
![Test Coverage](https://img.shields.io/badge/coverage-100%25-success?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

### 🤖 AI-Powered Security Intelligence • ⛓️ Blockchain-Native Payments • 🔒 Continuous Protocol Protection

*The future of Web3 security is autonomous, intelligent, and unstoppable.*

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🎯 Features](#-features) • [🏗️ Architecture](#️-architecture) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 What Makes This Special?

Imagine a security platform where **AI agents never sleep**, constantly scanning smart contracts for vulnerabilities, validating findings with precision, and automatically distributing bounties on-chain. That's Thunder Security.

### 💡 The Problem

Traditional bug bounty programs are:
- ⏰ **Slow**: Manual reviews take days or weeks
- 💰 **Expensive**: High overhead for managing programs
- 🎯 **Inconsistent**: Quality varies wildly between researchers
- 🔄 **Limited Coverage**: Can't monitor protocols 24/7

### ⚡ Our Solution

An **autonomous orchestrator** powered by local AI that:
- 🔍 **Scans continuously** - Monitors your protocols around the clock
- 🤖 **3 Specialized AI Agents** - Protocol, Researcher, and Validator working in harmony
- ⚓ **On-chain payments** - Instant, transparent USDC bounties via Base L2
- 📊 **Real-time dashboard** - Watch your security posture in real-time
- 🧠 **Local AI** - Powered by Ollama (DeepSeek/Llama 3) - your data stays yours

---

## 🎯 Features

### 🤖 Autonomous AI Agents

<table>
<tr>
<td width="33%" align="center">

**🛡️ Protocol Agent**

Monitors smart contracts
Detects anomalies
Triggers scans on changes

</td>
<td width="33%" align="center">

**🔬 Researcher Agent**

Analyzes contract code
Discovers vulnerabilities
Generates PoC exploits

</td>
<td width="33%" align="center">

**✅ Validator Agent**

Verifies findings
Prevents false positives
Calculates severity scores

</td>
</tr>
</table>

### 🎨 Beautiful Dashboard

- **📈 Real-time Metrics** - Bounty pool, vulnerabilities found, total paid
- **🚨 Critical Alerts** - Instant notifications for severe findings
- **👁️ Agent Status** - Monitor all agents at a glance
- **📊 Vulnerability Table** - Sortable, filterable findings with severity badges
- **⚡ Live Updates** - WebSocket-powered real-time data (coming in Phase 3)

### ⛓️ Blockchain Integration

- **💎 Base L2** - Fast, cheap transactions
- **💵 USDC Payments** - Stable, reliable bounties
- **📝 Smart Contracts** - Transparent, auditable payouts
- **🔐 SIWE Auth** - Sign-In with Ethereum for researchers

### 🧪 Built with Excellence

- **✅ 100% Test Coverage** - TDD methodology throughout
- **📏 TypeScript** - End-to-end type safety
- **🎨 Modern UI** - React 18 + Tailwind CSS
- **⚡ Lightning Fast** - Vite build, optimized bundles
- **📖 OpenSpec** - Structured development methodology

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  React 18 · TypeScript · Tailwind CSS · Vite                   │
│  Real-time Dashboard · SIWE Auth · WebSocket Client            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    REST API / WebSocket
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                         BACKEND                                 │
│  Node.js · Express · TypeScript · Prisma                       │
│  API Routes · WebSocket Server · Job Queues                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌─────────────┐
│   AGENTS     │  │  SUPABASE   │  │ BLOCKCHAIN  │
│              │  │             │  │             │
│ Ollama AI    │  │ PostgreSQL  │  │ Base L2     │
│ DeepSeek     │  │ Auth        │  │ Smart       │
│ Llama 3      │  │ Realtime    │  │ Contracts   │
│ MCP Tools    │  │ Storage     │  │ USDC        │
└──────────────┘  └─────────────┘  └─────────────┘
```

### 🔄 Agent Workflow

```
Protocol Change Detected
         │
         ▼
🛡️ Protocol Agent
   • Detects new deployment
   • Fetches contract code
   • Creates scan task
         │
         ▼
🔬 Researcher Agent
   • Analyzes contract
   • Runs security checks
   • Discovers vulnerability
   • Generates PoC
         │
         ▼
✅ Validator Agent
   • Reviews finding
   • Verifies PoC
   • Calculates severity
   • Approves for payout
         │
         ▼
💰 Smart Contract
   • Mints bounty NFT
   • Transfers USDC
   • Emits events
         │
         ▼
📊 Dashboard Updates
   • Real-time notification
   • Metrics update
   • Alert banner shows
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x LTS
- **npm** 10.x or **yarn** 1.22+
- **Ollama** (for local AI)
- **Supabase** account
- **Git**

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/jul1angr1s/AI_Bug_Bountry_App.git
cd AI_Bug_Bountry_App
```

### 2️⃣ Install Ollama & Models

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
ollama serve

# Pull AI models
ollama pull deepseek-coder-v2
ollama pull llama3.1
```

### 3️⃣ Setup Frontend

```bash
cd frontend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start development server
npm run dev
```

🎉 **Frontend running at** http://localhost:5173

### 4️⃣ Setup Backend (Coming Soon)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 5️⃣ Deploy Smart Contracts (Coming Soon)

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat deploy --network base-sepolia
```

---

## 📖 Documentation

### 📚 Project Structure

```
AI_Bug_Bountry_App/
├── 📱 frontend/              # React + TypeScript UI
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Dashboard/    # Dashboard-specific
│   │   │   ├── Sidebar/      # Navigation
│   │   │   └── shared/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── layouts/          # Layout components
│   │   ├── lib/              # Utilities & auth
│   │   ├── types/            # TypeScript types
│   │   └── __tests__/        # Test suites
│   └── package.json
│
├── 🤖 backend/               # Node.js API (planned)
│   ├── src/
│   │   ├── api/              # REST endpoints
│   │   ├── services/         # Business logic
│   │   │   ├── AgentOrchestrator.ts
│   │   │   └── OllamaService.ts
│   │   ├── lib/              # Utilities
│   │   └── prisma/           # Database schema
│   └── package.json
│
├── ⛓️ contracts/             # Smart contracts (planned)
│   ├── src/
│   │   ├── BountyPool.sol
│   │   ├── BountyNFT.sol
│   │   └── Governance.sol
│   └── hardhat.config.ts
│
├── 📋 openspec/              # OpenSpec methodology
│   ├── changes/              # Feature changes
│   │   └── dashboard-ui/     # Dashboard implementation
│   └── project/              # Project specs
│       ├── Architecture.md
│       ├── Stack.md
│       └── Testing.md
│
└── 📄 docs/                  # Documentation
```

### 🧪 Testing

We take testing seriously. **100% coverage** on all components.

```bash
cd frontend

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui
```

**Test Stack:**
- ✅ Vitest - Fast unit test runner
- ✅ React Testing Library - Component testing
- ✅ @testing-library/user-event - User interaction testing

### 🎨 Design System

**Theme**: Dark Mode First

```css
/* Navy Palette */
--navy-900: #0A0E1A;  /* Background */
--navy-800: #0F1421;  /* Cards */

/* Primary */
--primary: #3B82F6;   /* Electric Blue */

/* Status Colors */
--critical: #EF4444;  /* Red */
--info: #3B82F6;      /* Blue */
--online: #10B981;    /* Green */
```

**Layout**:
- Sidebar: 200px fixed width
- Content: Fluid responsive area
- Typography: System sans-serif stack

---

## 🛠️ Tech Stack

### Frontend

![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

- **React 18** - UI framework with concurrent features
- **TypeScript 5** - Type safety and DX
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **React Router v6** - Client-side routing
- **Supabase Client** - Auth & real-time DB
- **Lucide React** - Beautiful icons
- **Vitest** - Fast unit testing

### Backend (Planned)

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat-square&logo=prisma&logoColor=white)

- **Node.js 20 LTS** - Runtime
- **Express** - Web framework
- **Prisma** - Type-safe ORM
- **Supabase Postgres** - Database
- **BullMQ + Redis** - Job queues
- **WebSocket** - Real-time updates

### AI & Blockchain

![Ollama](https://img.shields.io/badge/Ollama-Local_AI-000000?style=flat-square)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat-square&logo=solidity&logoColor=white)

- **Ollama** - Local LLM inference
- **DeepSeek Coder V2** - Code analysis model
- **Llama 3.1** - Reasoning model
- **MCP SDK** - Model Context Protocol
- **Solidity** - Smart contracts
- **Foundry** - Contract development
- **Viem** - TypeScript Ethereum library
- **Base L2** - Scaling solution

---

## 📊 Current Status

### ✅ Completed (Phase 1 & 2)

- [x] Frontend environment setup with Vite + React
- [x] Dashboard layout with fixed sidebar
- [x] Thunder Security branding & navigation
- [x] Auth context with SIWE preparation
- [x] Protected routes structure
- [x] StatCard component with progress bars
- [x] Severity & status badge system
- [x] Protocol overview card
- [x] Statistics panel (3 metrics)
- [x] Agent status grid
- [x] Vulnerabilities table with sorting
- [x] Critical alert banner
- [x] Complete Dashboard page integration
- [x] 100% test coverage (73 tests)
- [x] OpenSpec documentation

### 🚧 In Progress (Phase 3)

- [ ] WebSocket connection manager
- [ ] Real-time agent status updates
- [ ] Toast notification system
- [ ] Optimistic UI updates

### 📋 Planned (Phase 4-5)

- [ ] API integration with TanStack Query
- [ ] Zustand state management
- [ ] Backend API implementation
- [ ] Ollama AI agent services
- [ ] Smart contract deployment
- [ ] SIWE authentication flow
- [ ] Keyboard navigation
- [ ] ARIA accessibility
- [ ] Mobile optimization

### 🎯 Roadmap

**Q1 2026** - Phase 3-5 (Real-time, API, Polish)
**Q2 2026** - Backend + AI Agents
**Q3 2026** - Smart Contracts + Blockchain
**Q4 2026** - Beta Launch 🚀

---

## 🤝 Contributing

We ❤️ contributions! Whether you're fixing bugs, adding features, or improving docs.

### 🌟 How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Write tests** first (TDD methodology)
4. **Implement** your feature
5. **Ensure** all tests pass (`npm test`)
6. **Commit** with conventional commits (`feat: add amazing feature`)
7. **Push** to your branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

### 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code restructuring
test: adding tests
chore: maintenance tasks
```

### ✨ Code Style

- **TypeScript** - Strict mode enabled
- **ESLint** - Airbnb config with custom rules
- **Prettier** - Code formatting
- **100% Test Coverage** - No exceptions

### 🧪 Testing Requirements

All PRs must:
- ✅ Include tests for new features
- ✅ Maintain 100% coverage
- ✅ Pass all existing tests
- ✅ Follow TDD methodology

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - Inspiration for autonomous agents
- **Anthropic** - Claude for development assistance
- **Ollama** - Local AI infrastructure
- **Supabase** - Backend platform
- **Base** - L2 scaling solution
- **OpenZeppelin** - Smart contract standards
- **The Open Source Community** - For everything

---

## 📞 Contact & Support

<div align="center">

### 💬 Join Our Community

[![Discord](https://img.shields.io/badge/Discord-Join_Us-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/your-server)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/your-handle)
[![GitHub](https://img.shields.io/badge/GitHub-Star-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/jul1angr1s/AI_Bug_Bountry_App)

### 🐛 Found a Bug?

[Open an Issue](https://github.com/jul1angr1s/AI_Bug_Bountry_App/issues/new)

### 💡 Have an Idea?

[Start a Discussion](https://github.com/jul1angr1s/AI_Bug_Bountry_App/discussions/new)

</div>

---

## 🌟 Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=jul1angr1s/AI_Bug_Bountry_App&type=Date)](https://star-history.com/#jul1angr1s/AI_Bug_Bountry_App&Date)

### ⭐ If you find this project interesting, give it a star!

**Built with ❤️ by developers, for developers**

*Making Web3 security autonomous, one vulnerability at a time.*

</div>

---

<div align="center">

**[⬆ Back to Top](#-thunder-security---autonomous-bug-bounty-platform)**

</div>
