# NOCtura Wallet - Required API Keys & Services

## 🔑 Required API Keys for Production

### 1. Solana RPC Providers (CRITICAL)
| Provider | Purpose | Cost | Link |
|----------|---------|------|------|
| **Helius** | Primary RPC, webhooks, enhanced APIs | Free tier + paid | https://helius.dev |
| **QuickNode** | Backup RPC, high reliability | Free tier + paid | https://quicknode.com |
| **Triton** | Alternative backup | Paid | https://triton.one |

**Note:** Free devnet RPC is fine for testing, but mainnet requires paid RPC for reliability.

### 2. Price Oracles
| Provider | Purpose | Cost | Link |
|----------|---------|------|------|
| **Pyth Network** | On-chain price feeds | Free (on-chain) | https://pyth.network |
| **CoinGecko API** | Off-chain price data | Free tier available | https://coingecko.com/api |
| **Jupiter Price API** | DEX prices | Free | https://jup.ag |

### 3. Push Notifications
| Provider | Purpose | Cost | Link |
|----------|---------|------|------|
| **Firebase Cloud Messaging** | Mobile push notifications | Free tier | https://firebase.google.com |
| **OneSignal** | Cross-platform notifications | Free tier | https://onesignal.com |

### 4. Analytics (Privacy-Preserving)
| Provider | Purpose | Cost | Link |
|----------|---------|------|------|
| **PostHog** | Self-hostable analytics | Free self-host | https://posthog.com |
| **Plausible** | Privacy-focused analytics | Paid | https://plausible.io |
| **Sentry** | Error tracking | Free tier | https://sentry.io |

### 5. App Store Accounts
| Platform | Cost | Link |
|----------|------|------|
| **Apple Developer** | $99/year | https://developer.apple.com |
| **Google Play Developer** | $25 one-time | https://play.google.com/console |

### 6. Code Signing Certificates
| Platform | Purpose |
|----------|---------|
| **Apple** | Included with Developer account |
| **Windows** | EV Code Signing Certificate (~$300-500/year) |
| **macOS** | Included with Developer account |

### 7. Domain & Infrastructure
| Service | Purpose | Cost |
|---------|---------|------|
| **Domain** | noctura.io | ~$15/year |
| **Cloudflare** | CDN, DDoS protection | Free tier |
| **Vercel/AWS** | Backend hosting | Variable |

### 8. Optional Services
| Service | Purpose | Link |
|---------|---------|------|
| **WalletConnect** | dApp connections | https://walletconnect.com |
| **Notabene** | Travel Rule compliance | https://notabene.id |
| **Persona** | KYC verification | https://withpersona.com |

---

## 📋 Environment Variables Template

```bash
# .env.example - Copy to .env and fill in values

# ===================
# SOLANA RPC
# ===================
SOLANA_RPC_MAINNET=https://your-helius-endpoint.helius-rpc.com
SOLANA_RPC_DEVNET=https://api.devnet.solana.com
SOLANA_WS_MAINNET=wss://your-helius-endpoint.helius-rpc.com
HELIUS_API_KEY=your-helius-api-key

# ===================
# PRICE ORACLES
# ===================
COINGECKO_API_KEY=your-coingecko-api-key
PYTH_PRICE_FEED_ENDPOINT=https://hermes.pyth.network

# ===================
# PUSH NOTIFICATIONS
# ===================
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_API_KEY=your-firebase-api-key
ONESIGNAL_APP_ID=your-onesignal-app-id

# ===================
# ANALYTICS
# ===================
SENTRY_DSN=https://your-sentry-dsn
POSTHOG_API_KEY=your-posthog-key

# ===================
# WALLET CONNECT
# ===================
WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# ===================
# COMPLIANCE (Optional)
# ===================
NOTABENE_API_KEY=your-notabene-key
PERSONA_API_KEY=your-persona-key

# ===================
# APP SECRETS
# ===================
JWT_SECRET=generate-strong-random-secret
ENCRYPTION_KEY=generate-32-byte-hex-key
```

---

## 🚀 Quick Start Checklist

### For Development (Devnet):
- [x] Solana CLI installed
- [x] NOC token created on devnet
- [ ] Helius free account (recommended even for devnet)
- [ ] Local development environment

### For Testnet:
- [ ] Helius testnet endpoint
- [ ] Firebase project (for push notifications testing)
- [ ] TestFlight (iOS) / Internal Testing (Android)

### For Mainnet Production:
- [ ] Paid Helius/QuickNode subscription
- [ ] Apple Developer account ($99/year)
- [ ] Google Play Developer account ($25)
- [ ] Domain with SSL
- [ ] Security audit completed
- [ ] Legal review completed

---

## 📞 Getting API Keys

### Helius (Recommended for Solana):
1. Go to https://helius.dev
2. Sign up for free account
3. Create new project
4. Copy RPC URL and API key

### WalletConnect:
1. Go to https://cloud.walletconnect.com
2. Create account
3. Create new project
4. Copy Project ID

### Firebase:
1. Go to https://console.firebase.google.com
2. Create new project
3. Enable Cloud Messaging
4. Download config files

---

*This file will be updated as we build features that require additional services.*
