# AetherFi Platform Documentation

## USSD Application Guide

### Initial Setup
1. To access the USSD simulator:
   - Send an email to either goonerlabs@gmail.com or agbavweissac@gmail.com
   - Request to be added to the Africa's Talking team
   - Wait for team invitation email
   - Join team to access the simulator

### Using the USSD Interface
1. Access the simulator
2. Enter your phone number
3. Dial the shortcode: `*384*79835#`

### Registration Process
- **New Users:**
  - Enter username
  - Create 4-digit PIN for transactions
  - System automatically:
    - Creates Algorand wallet
    - Provides initial ALGO
    - Provides initial USDC

- **Existing Users:**
  - Direct access to main menu using shortcode

### Available Features
1. Balance Check
2. Withdrawals
   - Follow prompts
   - Use vendor code (1)
   - Receive withdrawal code
   - Share code with vendor
3. Loan Services
4. Savings Programs
   - Flexible duration options
5. PIN Management
6. Contributory Schemes (Ajo)
   - Start new scheme
   - Join existing scheme

## Web Interface Guide (https://aether-fi.vercel.app/)

### Wallet Setup
1. Configure Pera Wallet:
   - Open Settings → Developer Settings → Node Settings
   - Switch to TestNet
2. Acquire TestNet tokens:
   - Get ALGO from faucet
   - Opt-in to USDC
   - Get TestNet USDC from: https://dispenser.testnet.aws.algodev.network/

### Core Features

#### 1. Vendor Operations (POS Simulation)
- Connect wallet via QR code
- Register as vendor
- Process deposits using customer phone numbers
- Test numbers available:
  - +2348161218923
  - +2349019970000

#### 2. Withdrawal Processing
- Vendors can process withdrawals using customer codes
- Codes available through USSD interface

#### 3. Remittance Services
- Send USDC to registered phone numbers
- Verify recipient username
- Set transfer amount
- Sign transaction via wallet

#### 4. Aid Distribution System
- For NGOs/Government organizations
- Features:
  - Daily/weekly/monthly airdrops
  - Target all users or specific numbers
  - Customizable amount per user
  - Total distribution amount setting
  - Organization name inclusion

## Technical Architecture

### System Components
1. Backend Services:
   - USSD API (Platform core)
   - Wallet Management API (Proprietary)

2. Client Applications:
   - USSD interface
   - Web frontend

### Wallet Structure
- Individual wallets for:
  - Users
  - Airdrop operations
- Admin wallet functionality:
  - Wallet funding
  - Ajo pool management
  - Balance insufficiency handling

### Blockchain Verification
TestNet Wallet Examples:

KTR37GPJ4GQXWFRAJOYSSSCUE7LVHKCSOHBLSTMAEIAQZLR65XQX72CYA
UNN74PZ7VLQXY7TXN4CO4OVMBQUOQL7MITJVZCEZ3JUFE7QN4TKUVNYHV4
Admin: O247BNFHFVNDNBUZXID5JXDLZ75JK3H7DI4O7EDHEAF5J7C6OTJU2SSNDM
- Transactions verifiable on Pera TestNet Explorer
- Transaction notes contain platform identifiers

### Future Development
- Planned feature: Remittance to unregistered users
  - Funds held until registration
  - Automatic distribution upon account creation
-Integrating SMS alerts to alert users of deposits and other transactions on their account


