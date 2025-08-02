# ArXiv Desktop App

A desktop application for browsing, searching, and managing academic papers from arXiv and bioRxiv.

## Features

- **Search Papers**: Search academic papers from both arXiv and bioRxiv
- **Advanced Search**: Filters by author, title, date range, and categories
- **PDF Viewer**: Built-in PDF viewer with zoom, navigation controls, and text selection/copy functionality
- **Paper Management**: 
  - Open multiple papers in tabs
  - Bookmark papers for later reading
  - Star favorite papers
  - Automatic local caching of downloaded papers
- **Citation Export**: Export citations in multiple formats (APA, MLA, Chicago, BibTeX, RIS, EndNote)
- **User Authentication**: Login to arXiv and bioRxiv with local credential storage
- **Multiple Themes**: Choose from 30 different themes with system preference detection and visual theme cycling
- **Sidebar Navigation**: Easy access to open papers, bookmarks, and starred papers
- **Offline Reading**: Papers are cached locally for offline access
- **AI Research Assistant**: Intelligent chat assistant for paper analysis and research guidance
  - **Conversation Context Maintenance** - maintains context across multiple messages for meaningful discussions
  - Contextual chat with current, open, or starred papers
  - **Full PDF content extraction** - automatically extracts and analyzes complete paper text
  - Paper suggestion and search assistance
  - Multi-service AI support (OpenAI, Anthropic, Ollama, custom endpoints)
  - Enhanced paper context with metadata, abstracts, and full PDF content
  - **Automatic chat session saving** - conversations are automatically saved after a few messages
  - **Chat history management** - browse, search, delete, and export previous conversations
  - **Persistent UI settings** - sidebar sizes and visibility states remembered across restarts
  - **Multiple export formats** - save chats as JSON, Text, or Markdown files
  - **Fresh chat startup** - always starts with blank conversation for clean experience

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
│   │   ├── AIChat.js       # AI chat sidebar component
│   │   ├── AIChat.module.css
│   │   ├── AISearchHelper.js # AI search assistance component
│   │   ├── AISearchHelper.module.css
│   │   └── ThemeToggle.js  # Dark/light mode toggle
│   ├── context/            # React context for state management
│   │   ├── PaperContext.js # Paper state management
│   │   └── ThemeContext.js # Theme state management
│   ├── hooks/              # Custom React hooks
│   │   ├── useAIChat.js    # AI chat functionality and settings management
│   │   ├── useUISettings.js # Persistent UI settings management
│   │   ├── useChatHistory.js # Chat session management and history
│   │   └── usePDFContent.js # PDF text extraction and content management
│   └── services/           # API and storage services
│       ├── arxivService.js # arXiv and bioRxiv API integration
│       ├── authService.js  # Authentication service
│       ├── aiService.js    # AI chat service with multi-provider support
│       ├── storageService.js # Local storage management
│       ├── settingsService.js # Persistent settings and chat history storage
│       └── pdfExtractionService.js # PDF text extraction and processing
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

- **Run all tests:** `npm test`
- **Run tests in a specific file:** `npm test -- <path_to_file>`
- **Lint all files:** `npm run lint`
- **Build the application:** `npm run build`

## Code Style Guidelines

- **Formatting:** Code is formatted with Prettier using the project's `.prettierrc` configuration. Key settings include a print width of 80 characters, 2-space indentation, and the use of semicolons.
- **Linting:** ESLint is used for linting, with rules defined in `eslint.config.js`. It enforces modern JavaScript standards, such as preferring `const` over `let` and disallowing `var`.
- **Imports:** Follow a standard import order, grouping imports from external libraries, project components, and local files.
- **Components:** Components should be functional and utilize hooks for state and side effects. All components must have an associated CSS module for styling.
- **Styling:** Use CSS modules for component-level styling to avoid global scope conflicts.
- **Naming Conventions:**
  - Components: `PascalCase` (e.g., `PaperViewer.js`)
  - CSS Modules: `PascalCase` with `.module.css` extension (e.g., `PaperViewer.module.css`)
  - Functions/Variables: `camelCase`
- **Error Handling:** Implement proper error handling for all asynchronous operations, API calls, and file system interactions to prevent application crashes.

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

## AI Research Assistant

The app includes an intelligent AI assistant to help with research tasks and paper analysis.

### Features
- **Multi-service Support**: Compatible with OpenAI, Anthropic, Ollama, and custom OpenAI-compatible endpoints
- **Contextual Chat**: Discuss papers with AI using context from:
  - Current paper being viewed
  - All open papers
  - Starred papers
  - No context (general research discussion)
- **Search Assistance**: Get intelligent suggestions for paper searches
- **Paper Analysis**: Ask questions about paper content, methodology, and implications

### Supported AI Services

#### OpenAI
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Default Model**: `gpt-3.5-turbo`
- **Authentication**: API key required

#### Anthropic
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Default Model**: `claude-3-sonnet-20240229`
- **Authentication**: API key required

#### Ollama (Local)
- **Endpoint**: `http://localhost:11434/v1/chat/completions`
- **Default Model**: `llama2`
- **Authentication**: Not required (local deployment)

#### Custom Endpoints
- Support for any OpenAI-compatible API
- Configurable endpoint URL and model
- Bearer token authentication

### Configuration
1. Click the "AI Assistant" button in the sidebar
2. Click the settings gear icon
3. Configure:
   - AI Service (OpenAI, Anthropic, Ollama, Custom)
   - API Endpoint URL
   - Model name
   - API Key (if required)
   - Context Mode (None, Current Paper, Open Papers, Starred Papers)

### Usage Examples
- "Explain the methodology used in this paper"
- "What are the key findings of these starred papers?"
- "Suggest papers related to transformer architectures"
- "Compare the approaches in these open papers"
- "What research directions should I explore for computer vision?"

### Chat Session Management
- **Automatic Saving**: Conversations are automatically saved after reaching 3+ messages
- **Session Naming**: Auto-generated names based on the first user message
- **New Chat**: Start fresh conversations with the "+" button
- **Chat History**: Browse all saved sessions with search functionality
- **Export Options**: Download conversations in JSON, TXT, or Markdown formats
- **Bulk Operations**: Select multiple sessions for batch export
- **Storage Management**: Monitor storage usage and manage old sessions

### PDF Content Extraction
- **Automatic Download & Extraction**: Full PDF text is extracted when papers are selected for AI context, automatically downloading PDFs if not already cached
- **Smart Caching**: Extracted content is cached to avoid re-processing
- **Visual Indicators**: 📄✓ (extracted), 📄... (extracting), 📄✗ (error) status icons
- **Content Limits**: Extracts up to 30 pages per paper to optimize LLM performance
- **Metadata Inclusion**: PDF title, author, creation date, and page count included
- **Error Handling**: Graceful fallback to abstract-only analysis if extraction fails
- **Performance Optimized**: Background extraction with progress indicators
- **No Pre-Opening Required**: Papers can be analyzed immediately after starring without opening in PaperViewer first

### Persistent UI Settings
- **Chat Sidebar Width**: Resizable sidebar that remembers its size across restarts
- **Left Sidebar Visibility**: Hidden/shown state persists between sessions  
- **Chat Window State**: Whether the AI chat is open or closed is remembered
- **Fresh Startup**: Always starts with blank chat for clean experience
- **Automatic Restore**: All UI customizations are restored when the app starts

## Local Storage

Papers and app data are stored locally:
- **Papers**: `~/ArxivDesktop/papers/` (PDF files with sanitized filenames)
- **App Data**: `~/ArxivDesktop/app-data.json` (bookmarks, starred papers, settings)
- **PDF State**: Zoom levels, page positions, and view preferences per paper
- **Chat History**: Browser localStorage for chat sessions and temporary conversations
- **UI Settings**: Browser localStorage for sidebar sizes, visibility states, and preferences
- **AI Settings**: Browser localStorage for API keys, service configurations, and model preferences

### Storage Management
- **Automatic Cleanup**: Old chat sessions are limited to 50 most recent
- **Export Capability**: All data can be exported for backup or transfer
- **Storage Monitoring**: Built-in storage usage tracking
- **Privacy**: All data stored locally, no cloud synchronization

## Implementation Status

### ✅ Completed Features
- [x] Electron + React desktop app architecture
- [x] CSS modules for component styling (migrated from styled-components)
- [x] Paper search functionality for arXiv and bioRxiv
- [x] Advanced search filters (author, title, date, categories)
- [x] PDF viewer with zoom, navigation controls, and text selection/copy functionality
- [x] Sidebar with paper management (open, bookmarks, starred)
- [x] Local caching system for offline reading
- [x] Citation export in multiple formats (APA, MLA, Chicago, BibTeX, RIS, EndNote)
- [x] Multiple theme support (30 themes including Light, Dark, Cyberpunk, Brogrammer, Bearded, Neon, Forest, Ocean, Sunset, Midnight, Matrix, Vampire, Synthwave, Terminal, Arctic, Autumn, Cherry, Galaxy, Vintage, Monochrome, Pastel, Coffee, Lavender, Emerald, Ruby, Copper, Slate, Coral, Ninja, Royal) with system preference detection
- [x] User authentication framework (local storage)
- [x] Persistent state management with automatic saving
- [x] AI Research Assistant with multi-service support (OpenAI, Anthropic, Ollama, custom)
- [x] Contextual AI chat with paper metadata and abstracts
- [x] AI-powered search suggestions and research guidance
- [x] Automatic chat session saving and management
- [x] Chat history with search, export, and organization features
- [x] Persistent UI settings (sidebar sizes, visibility states)
- [x] Streaming chat responses with real-time text appearance
- [x] New chat functionality with automatic session creation
- [x] Full PDF content extraction for comprehensive paper analysis
- [x] Automatic PDF text processing with caching and error handling
- [x] Enhanced AI context with complete paper content (not just abstracts)
- [x] Fresh chat startup (blank state on app launch)

### 🚧 TODO
- [ ] Add paper annotations and highlighting
- [ ] Implement paper collections/folders
- [ ] Add automatic paper updates notification
- [ ] Enhanced PDF search within documents
- [ ] Export/import of bookmarks and settings
- [ ] Full-text PDF content extraction for enhanced AI context
- [ ] Paper sharing and collaboration features
- [ ] AI-powered paper recommendations based on reading history
- [ ] Voice-to-text support for AI chat
- [ ] Advanced AI features (summarization, key points extraction)

## Current Status

✅ **Production Ready** - The app is fully functional with:
- Complete Electron + React desktop application
- CSS modules styling (converted from styled-components)
- Full paper search and management system
- PDF viewing with advanced controls
- Citation export in multiple formats
- Theme switching and persistent state
- Local paper caching for offline access
- AI Research Assistant with multi-service support
- Contextual AI chat and search assistance

### Recent Updates
- **2025-07-30**: **CRITICAL FIX** - AI chat now maintains conversation context across multiple messages, enabling proper continuous discussions instead of treating each message as a new conversation
- **2025-07-30**: Enhanced PDF extraction workflow - AI chat now auto-downloads PDFs for immediate analysis without requiring papers to be opened first
- **2025-07-30**: Fixed critical AI chat network error bug by properly delegating to AI service
- **2025-07-30**: Implemented full PDF content extraction for comprehensive paper analysis
- **2025-07-30**: Added automatic PDF text processing with smart caching and visual status indicators
- **2025-07-30**: Enhanced AI context with complete paper content (beyond just abstracts)
- **2025-07-30**: Changed to fresh chat startup - app now starts with blank conversation
- **2025-07-30**: Added automatic chat session saving - conversations are saved without user intervention
- **2025-07-30**: Implemented "New Chat" functionality with automatic session management
- **2025-07-30**: Added comprehensive chat history management with search, export, and organization
- **2025-07-30**: Implemented persistent UI settings - sidebar sizes and visibility remembered across restarts
- **2025-07-30**: Enhanced chat export with multiple formats (JSON, TXT, Markdown)
- **2025-07-30**: Added streaming text improvements with better markdown rendering and spacing
- **2025-07-29**: Added AI Research Assistant with multi-service support (OpenAI, Anthropic, Ollama, Custom)
- **2025-07-29**: Implemented contextual AI chat with paper metadata and abstract analysis
- **2025-07-29**: Added AI search helper for intelligent paper suggestions and research guidance
- **2025-07-29**: Enhanced paper context management for AI interactions
- **2025-01-18**: Expanded theme collection to 30 themes including Neon, Forest, Ocean, Sunset, Midnight, Matrix, Vampire, Synthwave, Terminal, Arctic, Autumn, Cherry, Galaxy, Vintage, Monochrome, Pastel, Coffee, Lavender, Emerald, Ruby, Copper, Slate, Coral, Ninja, and Royal themes
- **2025-01-07**: Added publish/update dates to search results and fixed text color issues in dark themes
- **2025-01-07**: Added text selection and copy functionality to PDF viewer with floating copy button
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