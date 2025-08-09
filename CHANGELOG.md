# Changelog

All notable changes to ZR-Sync (Zotero-Readwise Sync) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Core synchronization engine for Zotero to Readwise sync
- Readwise API v2 client implementation with rate limiting
- Zotero data adapter for accessing items and annotations
- Data mapper for transforming between Zotero and Readwise formats
- State management for tracking sync history
- Preferences panel for configuration
- Tools menu integration for manual sync
- Progress window for sync status display
- Automatic sync scheduler with configurable intervals
- Batch processing for large libraries
- Error handling with automatic retry
- Debug logging system
- Unit and integration test suite

### Changed
- N/A (Initial release)

### Deprecated
- N/A (Initial release)

### Removed
- N/A (Initial release)

### Fixed
- N/A (Initial release)

### Security
- Implemented secure token storage using Zotero preferences
- All API communications use HTTPS

## [0.1.0] - 2024-08-10

### Added
- **Core Features**
  - ✨ Initial implementation of Zotero to Readwise synchronization
  - 📚 Support for syncing PDF annotations, highlights, and notes
  - 🔄 Incremental sync to minimize API calls
  - 🏷️ Tag and collection preservation during sync
  - 🔗 Deep link generation for Zotero items

- **API Integration**
  - 🌐 Complete Readwise API v2 client
  - ⚡ Rate limiting with token bucket algorithm
  - 🔁 Automatic retry with exponential backoff
  - 📦 Batch processing with configurable chunk sizes

- **User Interface**
  - ⚙️ Comprehensive preferences panel
  - 📊 Real-time progress window
  - 🔧 Tools menu integration
  - 🌍 Localization support (English, Chinese)

- **Data Management**
  - 💾 State persistence for sync history
  - 🔐 Encrypted API token storage
  - 📝 Detailed logging system
  - 🗂️ Support for multiple item types

- **Performance**
  - ⚡ Optimized for large libraries (>10,000 items)
  - 🚀 Parallel processing within API limits
  - 💾 LRU caching for frequently accessed data
  - 🔄 Debouncing to prevent sync flooding

- **Developer Tools**
  - 🧪 Comprehensive test suite with Jest
  - 📖 Full TypeScript support
  - 🔧 Hot reload for development
  - 📚 Extensive documentation

### Known Issues
- Readwise to Zotero sync not yet implemented (planned for v0.2.0)
- Manual conflict resolution UI pending
- Limited support for non-PDF attachments

## [0.0.9-beta] - 2024-08-05

### Added
- Beta release for testing core synchronization
- Basic UI components
- Initial error handling

### Changed
- Refactored module structure for better separation of concerns
- Improved TypeScript typing

### Fixed
- Memory leak in annotation processing
- API timeout issues with large batches

## [0.0.8-alpha] - 2024-07-30

### Added
- Alpha testing version with minimal features
- Proof of concept for Readwise API integration
- Basic Zotero data extraction

### Security
- Initial security audit completed
- Added input validation for all user inputs

## Roadmap

### Version 0.2.0 (Planned)
- [ ] Bidirectional sync (Readwise → Zotero)
- [ ] Conflict resolution UI
- [ ] Support for EPUB and web page annotations
- [ ] Advanced filtering options
- [ ] Sync history viewer

### Version 0.3.0 (Planned)
- [ ] Multiple Readwise account support
- [ ] Selective field syncing
- [ ] Custom metadata mapping
- [ ] Backup and restore functionality
- [ ] Performance dashboard

### Version 1.0.0 (Planned)
- [ ] Full feature parity with Readwise official integrations
- [ ] Complete bidirectional sync
- [ ] Advanced automation rules
- [ ] Plugin API for extensions
- [ ] Enterprise features

## Migration Guide

### From 0.0.x to 0.1.0
1. Export your configuration from the old version
2. Uninstall the old plugin
3. Install version 0.1.0
4. Import your configuration
5. Re-enter your API token (security enhancement)
6. Perform a full sync to update state

## Version Numbering

We use Semantic Versioning (SemVer) with the following guidelines:

- **MAJOR** (X.0.0): Incompatible API changes or major feature additions
- **MINOR** (0.X.0): New functionality in a backwards compatible manner
- **PATCH** (0.0.X): Backwards compatible bug fixes

### Pre-release Versions
- **Alpha** (0.0.X-alpha): Early testing, unstable
- **Beta** (0.0.X-beta): Feature complete, testing phase
- **RC** (0.0.X-rc): Release candidate, final testing

## Support

For issues, questions, or feature requests:
- GitHub Issues: [https://github.com/yourusername/zotero-z2r-readwise/issues](https://github.com/yourusername/zotero-z2r-readwise/issues)
- Documentation: [https://github.com/yourusername/zotero-z2r-readwise/wiki](https://github.com/yourusername/zotero-z2r-readwise/wiki)
- Email: support@zr-sync.example.com

## Contributors

- Your Name (@yourusername) - Project Lead
- Contributors welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

[Unreleased]: https://github.com/yourusername/zotero-z2r-readwise/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/zotero-z2r-readwise/releases/tag/v0.1.0
[0.0.9-beta]: https://github.com/yourusername/zotero-z2r-readwise/releases/tag/v0.0.9-beta
[0.0.8-alpha]: https://github.com/yourusername/zotero-z2r-readwise/releases/tag/v0.0.8-alpha
