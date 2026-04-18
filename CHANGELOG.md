# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and the project follows semantic versioning.

## [1.2] - 2026-04-18

### Added

- Codeforces OAuth sign-in flow with secure token exchange support.
- Optional Push Past Submissions toggle to backfill previously accepted problems (latest accepted submission per problem).
- Improved sync status UX with structured in-popup status messaging and better manual sync feedback.
- Dedicated service and popup utility modules for storage, metrics, repository handling, and extraction flow.

### Changed

- Refactored architecture from legacy handlers/pages into focused services and popup modules for better maintainability.
- Strengthened content extraction for Codeforces pages with better route detection, fallback selectors, and access-denied handling.
- Enhanced sync pipeline with safer submission normalization before GitHub push and better historical sync orchestration.
- Updated app shell metadata and package versioning for the 1.2 release.

### Fixed

- Corrected streak counting edge cases when the current day has no accepted submission.
- Improved submission text normalization to reduce escaped newline/tab artifacts in pushed solutions.

### Removed

- Legacy Codeforces API key/secret authentication flow in favor of OAuth-based authentication.

## [1.1] - 2025-xx-xx

### Added

- Completely invisible background processing - Submission fetching now happens entirely in hidden tabs with no visible windows or popups.
- Added Sync Storage for seamless data sync across your devices.
- Faster response times - Reduced timeout periods for quicker submission retrieval (2-3 seconds vs previous longer waits).
- Cleaner interface - Improved the UI and added a few more useful elements.
- Added an option for manual sync (just in case the service worker stops).

## [1.0] - 2025-xx-xx

### Added

- Initial release.
- Automatic push of accepted Codeforces submissions to a connected GitHub repository.
- Basic extension popup with account and repository setup flow.
