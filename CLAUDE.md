# ArXiv Desktop App

A desktop application for browsing, searching, and managing academic papers from arXiv and bioRxiv.

## Features

- **Search Papers**: Search academic papers from both arXiv and bioRxiv
- **Advanced Search**: Filters by author, title, date range, and categories
- **PDF Viewer**: Built-in PDF viewer with zoom and navigation controls
- **Paper Management**: 
  - Open multiple papers in tabs
  - Bookmark papers for later reading
  - Star favorite papers
  - Automatic local caching of downloaded papers
- **Citation Export**: Export citations in multiple formats (APA, MLA, Chicago, BibTeX, RIS, EndNote)
- **User Authentication**: Login to arXiv and bioRxiv with local credential storage
- **Multiple Themes**: Choose from 5 different themes (Light, Dark, Cyberpunk, Brogrammer, Bearded) with system preference detection
- **Sidebar Navigation**: Easy access to open papers, bookmarks, and starred papers
- **Offline Reading**: Papers are cached locally for offline access

## Project Structure

```
arxiv-desktop/
├── electron/                # Electron main process files
│   ├── main.js             # Electron main process
│   └── preload.js          # Electron preload script (IPC bridge)
├── src/
│   ├── index.js            # React entry point
│   ├── App.js              # Main React component
│   ├── components/         # React components with CSS modules
│   │   ├── HomePage.js     # Search and home page
│   │   ├── HomePage.module.css
│   │   ├── Sidebar.js      # Navigation sidebar
│   │   ├── Sidebar.module.css
│   │   ├── PaperViewer.js  # PDF viewer component
│   │   ├── PaperViewer.module.css
│   │   ├── CitationModal.js # Citation export modal
│   │   ├── CitationModal.module.css
│   │   ├── LoginModal.js   # Authentication modal
│   │   ├── LoginModal.module.css
│   │   ├── SearchFilters.js # Advanced search filters
│   │   ├── SearchFilters.module.css
│   │   └── ThemeToggle.js  # Dark/light mode toggle
│   ├── context/            # React context for state management
│   │   ├── PaperContext.js # Paper state management
│   │   └── ThemeContext.js # Theme state management
│   └── services/           # API and storage services
│       ├── arxivService.js # arXiv and bioRxiv API integration
│       ├── authService.js  # Authentication service
│       └── storageService.js # Local storage management
├── public/                 # Static assets
├── build/                  # Production build output
└── package.json           # Dependencies and scripts
```

## Technology Stack

- **Electron**: Desktop app framework
- **React**: UI framework with hooks
- **CSS Modules**: Component-scoped styling
- **React PDF**: PDF viewing with zoom and navigation
- **PDF.js**: PDF rendering engine
- **Lucide React**: Modern icon library
- **Axios**: HTTP client for API requests

## Development Commands

### Using Makefile (Recommended)
```bash
make help           # Show all available commands
make setup          # Complete setup (clean + install)
make dev            # Start full development environment
make dev-react      # Start React development server only
make build          # Build for production
make pack           # Package the app
make test           # Run tests
make lint           # Run linting
make info           # Show environment information
```

### Using NPM directly
```bash
npm install          # Install dependencies
npm run dev         # Start development server (React + Electron)
npm run dev:react   # Start React development server only
npm run build       # Build for production
npm start           # Start Electron app (production)
npm run pack        # Package app for distribution
npm run dist        # Build and distribute app
```

### Quick Start
```bash
make setup          # First time setup
make start          # Start development (React only)
# OR
make dev            # Start full development (React + Electron)
```

## API Integration

### arXiv API
- Search endpoint: `http://export.arxiv.org/api/query`
- Returns XML format, parsed to JSON
- Supports full-text search with advanced filters

### bioRxiv API
- API endpoint: `https://api.biorxiv.org`
- JSON format responses
- Date-based filtering with search capabilities

## Local Storage

Papers and app data are stored locally:
- **Papers**: `~/ArxivDesktop/papers/` (PDF files with sanitized filenames)
- **App Data**: `~/ArxivDesktop/app-data.json` (bookmarks, starred papers, settings)
- **PDF State**: Zoom levels, page positions, and view preferences per paper

## Implementation Status

### ✅ Completed Features
- [x] Electron + React desktop app architecture
- [x] CSS modules for component styling (migrated from styled-components)
- [x] Paper search functionality for arXiv and bioRxiv
- [x] Advanced search filters (author, title, date, categories)
- [x] PDF viewer with zoom and navigation controls
- [x] Sidebar with paper management (open, bookmarks, starred)
- [x] Local caching system for offline reading
- [x] Citation export in multiple formats (APA, MLA, Chicago, BibTeX, RIS, EndNote)
- [x] Multiple theme support (Light, Dark, Cyberpunk, Brogrammer, Bearded) with system preference detection
- [x] User authentication framework (local storage)
- [x] Persistent state management with automatic saving

### 🚧 TODO
- [ ] Add paper annotations and highlighting
- [ ] Implement paper collections/folders
- [ ] Add automatic paper updates notification
- [ ] Implement paper recommendation system
- [ ] Enhanced PDF search within documents
- [ ] Export/import of bookmarks and settings
- [ ] Full-text search across cached papers
- [ ] Paper sharing and collaboration features

## Current Status

✅ **Production Ready** - The app is fully functional with:
- Complete Electron + React desktop application
- CSS modules styling (converted from styled-components)
- Full paper search and management system
- PDF viewing with advanced controls
- Citation export in multiple formats
- Theme switching and persistent state
- Local paper caching for offline access

### Recent Updates
- **2025-01-07**: Added multiple theme support (Cyberpunk, Brogrammer, Bearded) with enhanced theme toggle
- **2025-06-29**: Converted all components from styled-components to CSS modules
- **2025-06-29**: Fixed compilation errors and verified build process
- **2025-06-29**: All features tested and working correctly

## Commands for Development

```bash
# Lint and type checking
npm run lint        # Run ESLint (if configured)
npm run typecheck   # Run TypeScript checking (if configured)

# Testing
npm test           # Run Jest tests
npm test -- --coverage  # Run tests with coverage

# Building and packaging
npm run build      # Create production build
npm run pack       # Package for current platform
npm run dist       # Create distributable packages
npm run dist:all   # Create packages for all platforms (Windows, macOS, Linux)
```

## Environment Setup

The app works on:
- **Windows** (x64)
- **macOS** (Intel and Apple Silicon)
- **Linux** (x64)

Required:
- Node.js 16+
- npm or yarn
- Git