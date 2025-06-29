# ArXiv Desktop App - Makefile
# Comprehensive build and development operations

.PHONY: help install clean dev dev-react dev-electron build test lint format pack dist release clean-cache clean-all setup check-deps kill-processes

# Default target
.DEFAULT_GOAL := help

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m # No Color

# Project info
PROJECT_NAME := arxiv-desktop
VERSION := $(shell node -p "require('./package.json').version")
NODE_VERSION := $(shell node --version)
NPM_VERSION := $(shell npm --version)

help: ## Show this help message
	@echo "$(CYAN)ArXiv Desktop App - Development Commands$(NC)"
	@echo "$(YELLOW)Version: $(VERSION)$(NC)"
	@echo "$(YELLOW)Node: $(NODE_VERSION) | NPM: $(NPM_VERSION)$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation and Setup
install: ## Install all dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✓ Dependencies installed successfully$(NC)"

clean: ## Clean node_modules and package-lock.json
	@echo "$(YELLOW)Cleaning dependencies...$(NC)"
	rm -rf node_modules
	rm -f package-lock.json
	@echo "$(GREEN)✓ Dependencies cleaned$(NC)"

clean-cache: ## Clean build caches and temporary files
	@echo "$(YELLOW)Cleaning caches...$(NC)"
	rm -rf .eslintcache
	rm -rf build
	rm -rf dist
	rm -rf node_modules/.cache
	@echo "$(GREEN)✓ Caches cleaned$(NC)"

clean-all: clean clean-cache ## Clean everything (dependencies + caches)
	@echo "$(GREEN)✓ Everything cleaned$(NC)"

setup: clean install ## Complete setup (clean + install)
	@echo "$(GREEN)✓ Setup completed successfully$(NC)"

# Development
dev: ## Start full development environment (React + Electron)
	@echo "$(GREEN)Starting development environment...$(NC)"
	@echo "$(CYAN)This will start both React dev server and Electron$(NC)"
	npm run dev

dev-react: ## Start React development server only
	@echo "$(GREEN)Starting React development server...$(NC)"
	@echo "$(CYAN)App will be available at http://localhost:3000$(NC)"
	npm run dev:react

dev-electron: ## Start Electron app (requires React server to be running)
	@echo "$(GREEN)Starting Electron app...$(NC)"
	@echo "$(YELLOW)Make sure React dev server is running on port 3000$(NC)"
	npm start

# Building and Testing
build: ## Build React app for production
	@echo "$(GREEN)Building React app for production...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build completed successfully$(NC)"

test: ## Run tests
	@echo "$(GREEN)Running tests...$(NC)"
	npm test -- --watchAll=false --verbose
	@echo "$(GREEN)✓ Tests completed$(NC)"

test-watch: ## Run tests in watch mode
	@echo "$(GREEN)Running tests in watch mode...$(NC)"
	npm test

lint: ## Run ESLint
	@echo "$(GREEN)Running ESLint...$(NC)"
	npx eslint src --ext .js,.jsx,.ts,.tsx
	@echo "$(GREEN)✓ Linting completed$(NC)"

lint-fix: ## Run ESLint with auto-fix
	@echo "$(GREEN)Running ESLint with auto-fix...$(NC)"
	npx eslint src --ext .js,.jsx,.ts,.tsx --fix
	@echo "$(GREEN)✓ Linting and fixes completed$(NC)"

format: ## Format code with Prettier
	@echo "$(GREEN)Formatting code with Prettier...$(NC)"
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,css,md}"
	@echo "$(GREEN)✓ Code formatting completed$(NC)"

# Packaging and Distribution
pack: build ## Package the app (requires build)
	@echo "$(GREEN)Packaging Electron app...$(NC)"
	npm run pack
	@echo "$(GREEN)✓ App packaged successfully$(NC)"

dist: build ## Create distribution packages
	@echo "$(GREEN)Creating distribution packages...$(NC)"
	npx electron-builder --publish=never
	@echo "$(GREEN)✓ Distribution packages created$(NC)"

dist-all: build ## Create distribution packages for all platforms
	@echo "$(GREEN)Creating distribution packages for all platforms...$(NC)"
	npx electron-builder --mac --win --linux --publish=never
	@echo "$(GREEN)✓ Multi-platform distribution packages created$(NC)"

# Release and Publishing
release: ## Create a new release (build + dist + git tag)
	@echo "$(GREEN)Creating release $(VERSION)...$(NC)"
	@echo "$(YELLOW)Building app...$(NC)"
	$(MAKE) build
	@echo "$(YELLOW)Creating distribution...$(NC)"
	$(MAKE) dist
	@echo "$(YELLOW)Creating git tag...$(NC)"
	git tag -a v$(VERSION) -m "Release version $(VERSION)"
	@echo "$(GREEN)✓ Release $(VERSION) created successfully$(NC)"
	@echo "$(CYAN)Push tags with: git push origin --tags$(NC)"

# Development Utilities
check-deps: ## Check for outdated dependencies
	@echo "$(GREEN)Checking for outdated dependencies...$(NC)"
	npm outdated

update-deps: ## Update dependencies (be careful!)
	@echo "$(YELLOW)Updating dependencies...$(NC)"
	@echo "$(RED)⚠️  This will update package.json. Make sure to test afterwards!$(NC)"
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	npm update
	@echo "$(GREEN)✓ Dependencies updated$(NC)"

audit: ## Run security audit
	@echo "$(GREEN)Running security audit...$(NC)"
	npm audit
	@echo "$(GREEN)✓ Security audit completed$(NC)"

audit-fix: ## Fix security vulnerabilities
	@echo "$(GREEN)Fixing security vulnerabilities...$(NC)"
	npm audit fix
	@echo "$(GREEN)✓ Security vulnerabilities fixed$(NC)"

# Process Management
kill-processes: ## Kill any running React/Electron processes
	@echo "$(YELLOW)Killing React and Electron processes...$(NC)"
	-pkill -f "react-scripts start" 2>/dev/null || true
	-pkill -f "electron" 2>/dev/null || true
	-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)✓ Processes killed$(NC)"

# Git Operations
git-status: ## Show git status with file count
	@echo "$(GREEN)Git Status:$(NC)"
	git status --short
	@echo ""
	@echo "$(CYAN)Branch:$(NC) $(shell git branch --show-current)"
	@echo "$(CYAN)Commits ahead/behind:$(NC) $(shell git rev-list --left-right --count HEAD...origin/$(shell git branch --show-current) 2>/dev/null || echo "No upstream")"
	@echo "$(CYAN)Last commit:$(NC) $(shell git log -1 --pretty=format:'%h - %s (%cr)')"

git-clean: ## Clean git repository (removes untracked files)
	@echo "$(YELLOW)This will remove all untracked files and directories$(NC)"
	@echo "$(RED)⚠️  This action cannot be undone!$(NC)"
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	git clean -fd
	@echo "$(GREEN)✓ Git repository cleaned$(NC)"

# Environment Information
info: ## Show environment information
	@echo "$(CYAN)=== Environment Information ===$(NC)"
	@echo "$(YELLOW)Project:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)Version:$(NC) $(VERSION)"
	@echo "$(YELLOW)Node.js:$(NC) $(NODE_VERSION)"
	@echo "$(YELLOW)NPM:$(NC) $(NPM_VERSION)"
	@echo "$(YELLOW)Platform:$(NC) $(shell uname -s)"
	@echo "$(YELLOW)Architecture:$(NC) $(shell uname -m)"
	@echo "$(YELLOW)Working Directory:$(NC) $(PWD)"
	@echo "$(YELLOW)Git Branch:$(NC) $(shell git branch --show-current 2>/dev/null || echo 'Not a git repository')"
	@echo ""
	@echo "$(CYAN)=== Package Scripts ===$(NC)"
	@node -p "Object.entries(require('./package.json').scripts || {}).map(([k,v]) => '  ' + k.padEnd(15) + v).join('\n')"

# Quick shortcuts
start: dev-react ## Quick start (alias for dev-react)

all: clean install build test pack ## Do everything (clean, install, build, test, pack)

# Emergency commands
emergency-reset: ## Emergency reset (kill processes + clean + install)
	@echo "$(RED)🚨 EMERGENCY RESET 🚨$(NC)"
	@echo "$(YELLOW)This will kill all processes and reset the project$(NC)"
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(MAKE) kill-processes
	$(MAKE) clean-all
	$(MAKE) install
	@echo "$(GREEN)✓ Emergency reset completed$(NC)"

# Development workflow shortcuts
quick-dev: kill-processes dev-react ## Quick development start (kill processes + start React)

quick-build: clean-cache build ## Quick build (clean cache + build)

quick-test: lint test ## Quick test (lint + test)

# CI/CD helpers
ci-install: ## Install dependencies for CI
	@echo "$(GREEN)Installing dependencies for CI...$(NC)"
	npm ci
	@echo "$(GREEN)✓ CI dependencies installed$(NC)"

ci-test: ## Run tests for CI
	@echo "$(GREEN)Running CI tests...$(NC)"
	npm run test -- --coverage --watchAll=false --verbose
	@echo "$(GREEN)✓ CI tests completed$(NC)"

ci-build: ## Build for CI
	@echo "$(GREEN)Building for CI...$(NC)"
	CI=true npm run build
	@echo "$(GREEN)✓ CI build completed$(NC)"

ci: ci-install lint ci-test ci-build ## Full CI pipeline