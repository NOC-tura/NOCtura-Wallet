# ZK-Proofs Package

Zero-Knowledge proof systems for privacy verification in Noctura Wallet.

## Features

- **SNARK Proofs**: Succinct Non-Interactive Arguments of Knowledge
- **STARK Proofs**: Scalable Transparent Arguments of Knowledge
- **Circuit Compilation**: Compile Circom and Cairo circuits
- **Witness Generation**: Generate circuit witnesses
- **Proof Generation**: Create and verify proofs
- **Key Management**: Manage proving and verification keys

## Supported Proofs

### SNARK (via Circom)
- Transfer proofs
- Deposit/Withdrawal proofs
- Swap proofs
- Batch operation proofs

### STARK (via Cairo)
- Compliance proofs
- Batch settlement proofs
- Audit proofs
- Multi-asset transfer proofs

## Structure

```
circuits/    # Circuit definitions
src/        # TypeScript proof system
compiled/   # Compiled circuits and keys
scripts/    # Build and setup scripts
```

## Building Circuits

See [../../docs/ZK_CIRCUITS.md](../../docs/ZK_CIRCUITS.md) for circuit documentation.
