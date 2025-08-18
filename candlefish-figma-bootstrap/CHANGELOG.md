# Changelog

All notable changes to the Candlefish Figma Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Component variants for all states (hover, active, disabled)
- Dark mode theme generation
- Accessibility checker integration
- Design token sync with codebase
- Figma Community publication

## [1.0.0] - 2025-08-16

### Added

#### Core Features
- **Automated Design System Generation**: Complete design system creation in one click
- **Color System**: 
  - Brand colors (Primary, Ink, Surface)
  - 9-step neutral scale
  - Accent colors for states (Warning, Success)
  - Color variables for theming
- **Typography System**:
  - 5 text styles (H1, H2, H3, Body, Small)
  - Inter font integration
  - Optimized line heights and letter spacing
- **Component Library**:
  - Logo components with variants
  - Grid containers and stacks
  - Button components (Primary, Quiet)
  - Card component
  - Auto-layout configurations
- **Page Structure**:
  - Automatic page creation
  - Organized content hierarchy
  - Brand specimen generation

#### Technical Implementation
- TypeScript-based plugin architecture
- Logo embedding support via base64
- Export presets for all components
- AWS Secrets Manager integration for API keys
- Token generation scripts

#### Developer Tools
- Build system with esbuild
- Watch mode for development
- Type checking with TypeScript
- Token export functionality
- Asset export via Figma API

### Documentation
- Comprehensive README with installation guide
- Developer documentation (DEVELOPMENT.md)
- Design system documentation (DESIGN_SYSTEM.md)
- Complete API reference (API.md)
- Usage examples and troubleshooting

### Infrastructure
- npm scripts for common tasks
- Figma API integration scripts
- AWS integration for secure token storage
- Modular code architecture

## [0.1.0] - 2025-08-01 (Beta)

### Added
- Initial plugin structure
- Basic color style generation
- Simple component creation
- Manual logo import

### Changed
- Migrated from JavaScript to TypeScript
- Improved error handling

### Fixed
- Font loading issues
- Color conversion accuracy

## Future Roadmap

### Version 1.1.0 (Q3 2025)
- **Interactive Components**: States and interactions
- **Animation Presets**: Micro-interactions library
- **Grid Templates**: Pre-built layout templates
- **Icon Library**: Comprehensive icon set

### Version 1.2.0 (Q4 2025)
- **Theme Switching**: Multiple theme support
- **Responsive Variants**: Breakpoint-based components
- **Documentation Layer**: In-Figma documentation
- **Style Guide Generator**: Automatic style guide creation

### Version 2.0.0 (2026)
- **AI-Powered Suggestions**: Smart design recommendations
- **Code Generation**: Component to code export
- **Design Linting**: Consistency checking
- **Collaboration Features**: Team libraries support

## Migration Guides

### From Manual Setup to Plugin

For teams currently using manual design system setup:

1. **Backup Current File**: Duplicate your existing Figma file
2. **Run Plugin**: Execute in new file to see structure
3. **Map Existing Styles**: Compare and map your styles to plugin output
4. **Migrate Components**: Update components to match new structure
5. **Update Documentation**: Align documentation with new system

### From v0.1.0 to v1.0.0

Breaking changes requiring attention:

1. **Color Naming**: 
   - Old: `color-primary`
   - New: `Brand/Primary`

2. **Component Structure**:
   - Old: Flat component list
   - New: Organized with variants

3. **Typography Scale**:
   - Old: Custom names
   - New: Standardized (H1, H2, H3, Body, Small)

## Breaking Changes Log

### v1.0.0
- Changed color style naming convention from flat to hierarchical
- Reorganized component structure with variant sets
- Standardized typography naming
- Modified export settings format

## Deprecations

### Scheduled for Removal in v2.0.0
- Legacy color format support
- Manual token generation (will be automatic)
- Individual component export (moving to batch export)

## Security Updates

### v1.0.0
- Removed hardcoded API keys
- Implemented AWS Secrets Manager integration
- Added input validation for all user inputs
- Sanitized color values before processing

## Performance Improvements

### v1.0.0
- Optimized batch operations (50% faster generation)
- Reduced memory usage with cleanup routines
- Improved font loading with fallback handling
- Async operations for better UI responsiveness

## Bug Fixes Archive

### v1.0.0
- Fixed: Components not appearing in assets panel
- Fixed: Color variables not linking properly
- Fixed: Font loading failures causing plugin crash
- Fixed: Export settings not persisting
- Fixed: Memory leak in large file processing

### v0.1.0
- Fixed: RGB conversion rounding errors
- Fixed: Text styles not applying correctly
- Fixed: Component naming conflicts

## Known Issues

### Current
- Inter font must be installed locally for text generation
- Large files (>100 pages) may experience slower generation
- Some special characters in names may cause issues

### Workarounds
- **Font Issues**: Install Inter from Google Fonts before running
- **Performance**: Close other Figma files during generation
- **Naming**: Avoid special characters in custom names

## Community Contributions

### Contributors
- Initial development: Candlefish AI Team
- Documentation: Design System Team
- Testing: QA Team

### How to Contribute
1. Fork the repository
2. Create feature branch
3. Submit pull request
4. Include tests and documentation

## Version Support

| Version | Supported | End of Support |
|---------|-----------|----------------|
| 1.0.x   | ✅ Active  | TBD            |
| 0.1.x   | ⚠️ Limited | 2025-12-31     |

## Upgrade Notices

### Critical Updates
- v1.0.0: Major restructuring - backup before upgrading

### Recommended Updates
- All users on v0.1.x should upgrade to v1.0.0 for stability

## Release Notes Format

Each release includes:
- **Features**: New functionality
- **Improvements**: Enhanced existing features
- **Fixes**: Bug corrections
- **Breaking**: Changes requiring migration
- **Deprecated**: Features scheduled for removal

## Getting Help

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: design-system@candlefish.ai

---

*For detailed implementation changes, see the [commit history](https://github.com/candlefish-ai/figma-plugin/commits/main).*

[Unreleased]: https://github.com/candlefish-ai/figma-plugin/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/candlefish-ai/figma-plugin/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/candlefish-ai/figma-plugin/releases/tag/v0.1.0
