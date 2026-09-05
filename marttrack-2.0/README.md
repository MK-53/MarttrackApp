# MartTrack 2.0

Offline-first inventory and profit management app built with React Native.

## Architecture

The project is organized by responsibility rather than by screen:

- `src/constants` - colors and app-wide config values
- `src/utils` - pure helper functions (validation, formatting, dates)
- `src/services` - AsyncStorage-backed persistence, PIN auth, and backup/export
- `src/domain` - core business logic (inventory, sales/FIFO, returns, accounting, audit)
- `src/state` - the reducer and React context that ties the domain logic to the UI
- `src/components` - shared, presentational UI building blocks
- `src/screens` - top-level screens composed from components + domain logic

## Getting Started

```bash
npm install
npm start
```

Then choose a platform (Android, iOS, or Web) from the Expo CLI prompt.

## Data Model

State is persisted locally via AsyncStorage under a single versioned key. It
tracks items, purchase batches (for FIFO costing), sales, returns, and a full
audit trail (`editHistory`) of every mutating action for accountability.
