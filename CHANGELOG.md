# Changelog

## [1.0.13]

- **Major optimization**: Reduced extension package size from ~38MB to ~6MB (85% reduction)
- Implemented esbuild bundling for better performance and smaller package size
- Bundled `ytmusic-api` and its dependencies (axios, tough-cookie, zod) into the extension bundle
- Excluded all dev dependencies and unnecessary files from the package
- Removed unused `genius-lyrics-api` dependency
- Updated `.vscodeignore` to exclude test files, documentation, and development artifacts

## [1.0.12]

- Enhanced error handling and logging for media playback and recommendations
- Added try-catch blocks to handle errors when toggling pause and checking media state
- Improved logging throughout the extension for better debugging and troubleshooting
- Better user notifications for scenarios where no media is loaded or available
- Refined console messages to include more detailed information about current state and actions

## [1.0.11]

- Enhanced error handling and logging for media playback and recommendations
- Added try-catch blocks to handle errors when toggling pause and checking media state
- Improved logging throughout the extension for better debugging and troubleshooting
- Better user notifications for scenarios where no media is loaded or available
- Refined console messages to include more detailed information about current state and actions

## [1.0.10]

- Added new recently played feature [PR](https://github.com/mayur1377/MUDE-music-in-vscode/pull/3)
- Fixed the bug in recommended songs not changing. [ISSUE](https://github.com/mayur1377/MUDE-music-in-vscode/issues/5)

## [1.0.7]

- Initial release!
