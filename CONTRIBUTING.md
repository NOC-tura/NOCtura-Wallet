# Contributing to Noctura Wallet

Thank you for your interest in contributing to Noctura Wallet! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please read and adhere to our [CODE_OF_CONDUCT.md](./.github/CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inspiring community for all.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Set up the development environment (see [DEVELOPER_GUIDE](./docs/DEVELOPER_GUIDE.md))

## Development Workflow

### Before You Start
- Check existing issues and pull requests to avoid duplication
- For large changes, open an issue first to discuss your approach

### Making Changes
1. Create a descriptive branch name: `feature/your-feature` or `fix/your-bug`
2. Make atomic, well-documented commits
3. Write or update tests for your changes
4. Ensure all tests pass: `pnpm run test`
5. Run linting: `pnpm run lint`
6. Run type checking: `pnpm run type-check`

### Commit Guidelines
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Reference related issues: "Fixes #123"
- Keep commits focused and logical

Example:
```
Add privacy controls to token management

- Implement selective disclosure for token metadata
- Add view key generation for audit purposes
- Update TokenRegistry with new privacy flags

Fixes #456
```

## Pull Request Process

1. Push your branch to your fork
2. Create a Pull Request against the main repository
3. Fill out the PR template completely
4. Ensure CI checks pass
5. Request review from maintainers
6. Address review comments promptly
7. Keep the PR focused on a single feature/fix

### PR Title Format
- Feature: `Add [feature description]`
- Fix: `Fix [bug description]`
- Docs: `Docs: [documentation update]`

## Code Style

We use TypeScript with strict typing. Please follow these guidelines:

- Use TypeScript strictly (no `any` types without justification)
- Follow the style configured in `.prettierrc`
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Maximum line length: 100 characters

Run formatting before committing:
```bash
pnpm run format
```

## Testing

- Write tests for new features
- Ensure existing tests still pass
- Aim for >80% code coverage
- Use descriptive test names

Run tests with:
```bash
pnpm run test              # All tests
pnpm run test:unit        # Unit tests only
pnpm run test:integration # Integration tests only
```

## Security

For security vulnerabilities, please email security@noctura.io instead of using the issue tracker.

See [SECURITY.md](./SECURITY.md) for more details.

## Documentation

- Update relevant documentation with your changes
- Add comments explaining complex logic
- Update README if adding new features
- Keep API documentation in sync

## Performance Considerations

- Be mindful of bundle size
- Avoid unnecessary dependencies
- Consider memory usage in cryptographic operations
- Profile code for critical paths

## Questions?

- Check the [Documentation](./docs)
- Review existing issues and discussions
- Ask in [GitHub Discussions](https://github.com/NOC-tura/NOCtura-Wallet/discussions)

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- Release notes
- Hall of contributors on the website

Thank you for contributing! 🙏
