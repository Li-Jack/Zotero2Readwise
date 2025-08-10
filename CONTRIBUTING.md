# Contributing to ZR-Sync

First off, thank you for considering contributing to ZR-Sync! It's people like you that make ZR-Sync such a great tool for the research community.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and considerate in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if relevant**
- **Include your configuration** (minus sensitive data like API tokens)
- **Specify your environment**:
  - Zotero version
  - ZR-Sync version
  - Operating system
  - Browser (if relevant)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the feature**
- **Describe the current behavior and explain the expected behavior**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the coding style** (see below)
3. **Write tests** for any new functionality
4. **Ensure all tests pass**: `npm test`
5. **Run the linter**: `npm run lint`
6. **Update documentation** as needed
7. **Write a meaningful commit message**
8. **Submit the pull request**

## Development Setup

### Prerequisites

- Node.js 18+ and npm 8+
- Git
- Zotero 7 (beta version for development)
- A Readwise account (for testing)

### Setting Up

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/yourusername/zotero-z2r-readwise.git
   cd zotero-z2r-readwise
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your Zotero installation path:
   ```bash
   ZOTERO_PATH=/path/to/zotero
   ```

5. Run development build:
   ```bash
   npm run dev
   ```

### Project Structure

```
src/
├── core/           # Core business logic (no UI dependencies)
├── api/            # External API clients
├── adapters/       # Data adapters
├── mappers/        # Data transformation
├── storage/        # Local storage management
├── ui/             # User interface components
├── tasks/          # Background tasks
├── utils/          # Utility functions
└── app.ts          # Application bootstrap
```

### Coding Style

We use TypeScript with strict mode enabled. Please follow these guidelines:

#### TypeScript

- Use explicit types rather than `any`
- Prefer interfaces over type aliases for object shapes
- Use enums for fixed sets of values
- Document complex types with JSDoc comments

```typescript
// Good
interface SyncOptions {
  /** Maximum items to sync per batch */
  batchSize: number;
  /** Whether to include tags in sync */
  includeTags: boolean;
}

// Bad
type SyncOptions = {
  batchSize: any;
  includeTags: any;
}
```

#### Naming Conventions

- **Files**: camelCase (e.g., `readwiseClient.ts`)
- **Classes**: PascalCase (e.g., `ReadwiseClient`)
- **Interfaces**: PascalCase with "I" prefix (e.g., `IReadwiseClient`)
- **Functions**: camelCase (e.g., `syncHighlights`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Private members**: underscore prefix (e.g., `_apiToken`)

#### Comments

- Use JSDoc for public APIs
- Use inline comments sparingly, prefer self-documenting code
- TODO comments should include assignee: `// TODO(username): Description`

```typescript
/**
 * Synchronizes highlights from Zotero to Readwise
 * @param items - Array of Zotero items to sync
 * @param options - Sync configuration options
 * @returns Promise resolving to sync results
 * @throws {ApiError} When Readwise API fails
 */
async function syncHighlights(
  items: ZoteroItem[],
  options: SyncOptions
): Promise<SyncResult> {
  // Implementation
}
```

### Testing

We use Jest for testing. Please write tests for all new functionality:

#### Unit Tests

Place unit tests next to the file being tested:
- `readwiseClient.ts` → `readwiseClient.test.ts`

```typescript
describe('ReadwiseClient', () => {
  describe('createHighlight', () => {
    it('should create a highlight successfully', async () => {
      // Test implementation
    });

    it('should handle API errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests

Place integration tests in `test/integration/`:

```typescript
describe('Sync Integration', () => {
  it('should sync a complete library', async () => {
    // Test implementation
  });
});
```

### Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for architectural changes
- Add JSDoc comments for all public APIs
- Update CHANGELOG.md following Keep a Changelog format
- Include examples in documentation when helpful

### Git Workflow

1. **Branch Naming**:
   - Features: `feature/description`
   - Bugs: `fix/description`
   - Documentation: `docs/description`
   - Performance: `perf/description`
   - Refactoring: `refactor/description`

2. **Commit Messages**:
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   type(scope): subject

   body (optional)

   footer (optional)
   ```

   Types:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation only
   - `style`: Code style (formatting, semicolons, etc.)
   - `refactor`: Code refactoring
   - `perf`: Performance improvements
   - `test`: Adding tests
   - `chore`: Maintenance tasks

   Examples:
   ```
   feat(sync): add support for EPUB annotations
   
   Implements annotation extraction from EPUB files
   and maps them to Readwise highlight format.
   
   Closes #123
   ```

3. **Pull Request Process**:
   - Keep PRs focused and small
   - Provide a clear description
   - Reference related issues
   - Ensure CI passes
   - Request review from maintainers
   - Address review feedback promptly

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a git tag: `git tag v0.1.0`
4. Push tag: `git push origin v0.1.0`
5. GitHub Actions will build and create release

## Getting Help

- Join our [Discord server](https://discord.gg/example)
- Check the [Wiki](https://github.com/yourusername/zotero-z2r-readwise/wiki)
- Ask questions in [Discussions](https://github.com/yourusername/zotero-z2r-readwise/discussions)
- Email: dev@zr-sync.example.com

## Recognition

Contributors will be recognized in:
- CHANGELOG.md (for specific contributions)
- README.md (major contributors)
- GitHub contributors page

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.
