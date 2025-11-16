# Better Notion

## 🚀 Recent Updates

### TanStack Query Integration ✅

This project now uses **TanStack Query (React Query)** for API state management, providing:
- ⚡ Automatic response caching
- 🔄 Request deduplication
- 🎯 Optimistic updates
- 📊 Built-in loading/error states
- 🛠️ DevTools for debugging

**Quick Links:**
- [Quick Start Guide](./QUICK_START.md) - Get started in 5 minutes
- [Implementation Summary](./TANSTACK_QUERY_IMPLEMENTATION.md) - What's been done
- [Migration Guide](./docs/TANSTACK_QUERY_MIGRATION.md) - Complete documentation
- [Migration Examples](./docs/COMPONENT_MIGRATION_EXAMPLES.md) - Before/after code samples

**For Developers:**
All API hooks are ready to use. Start migrating components from `useApi` to TanStack Query hooks. See [QUICK_START.md](./QUICK_START.md) for examples.

## Setup
Only required on the first setup run

```sh
$ git clone https://github.com/betternotion/frontend.git
$ cd frontend
$ npm install
```

## Available Scripts


#### `dev`
Starts the development environment.
Usage:

```sh
$ npm run dev
```
---
#### `lint`
Runs eslint for potential error & linting issues on the repository

```sh
$ npm run lint
```
---
#### `build`
Build the static files into the `public` folder.

```sh
$ npm run build
```
