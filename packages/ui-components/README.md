# UI Components Package

Reusable React UI components for Noctura applications.

## Components

### Wallet
- `WalletConnect` - Wallet connection
- `AccountSelector` - Account selection
- `BalanceDisplay` - Display balances
- `ModeToggle` - Toggle between transparent/shielded

### Transactions
- `TransferForm` - Transaction form
- `TransactionHistory` - History list
- `TransactionDetails` - Detailed view
- `TransactionStatus` - Status indicator

### Tokens
- `TokenList` - Token listing
- `TokenCard` - Token display
- `AddTokenDialog` - Add custom token
- `TokenImporter` - Import tokens

### Swap
- `SwapInterface` - Main swap UI
- `SwapSettings` - Swap settings
- `RouteDisplay` - Route visualization
- `ShieldedSwapInterface` - Shielded swap UI

### Common
- `Button` - Button component
- `Input` - Input component
- `Modal` - Modal dialog
- `Tooltip` - Tooltip overlay
- `LoadingSpinner` - Loading indicator

## Styling

Uses CSS modules with theme variables. See [src/styles/](./src/styles) for theme configuration.

## Usage

```tsx
import { WalletConnect, TransferForm } from '@noctura/ui-components';

export function MyApp() {
  return (
    <>
      <WalletConnect />
      <TransferForm />
    </>
  );
}
```
