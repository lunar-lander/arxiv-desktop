# ArXiv Desktop App - Makefile

.PHONY: help install clean dev dev-react build test lint format pack dist dist-linux dist-mac dist-win info setup reset start

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Project info
PROJECT_NAME := arxiv-desktop
VERSION := $(shell node -p "require('./package.json').version")

help: ## Show this help message
	@echo "$(BLUE)ArXiv Desktop App - Development Commands$(NC)"
	@echo "$(YELLOW)Version: $(VERSION)$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation and Setup
install: ## Install all dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

setup: clean install ## Complete setup (clean + install)
	@echo "$(GREEN)✓ Setup complete$(NC)"

clean: ## Clean node_modules and build artifacts
	@echo "$(YELLOW)Cleaning project...$(NC)"
	rm -rf node_modules
	rm -rf build
	rm -rf dist
	rm -f package-lock.json
	@echo "$(GREEN)✓ Project cleaned$(NC)"

# Development
dev: ## Start Electron desktop app in development mode
	@echo "$(GREEN)Starting ArXiv Desktop App...$(NC)"
	@echo "$(YELLOW)This will start both React dev server and Electron$(NC)"
	npm run dev

dev-react: ## Start React development server only
	@echo "$(GREEN)Starting React dev server...$(NC)"
	npm run dev:react

# Building and Testing
build: ## Build React app for production
	@echo "$(GREEN)Building app for production...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build completed$(NC)"

test: ## Run tests
	@echo "$(GREEN)Running tests...$(NC)"
	npm test
	@echo "$(GREEN)✓ Tests completed$(NC)"

lint: ## Run ESLint
	@echo "$(GREEN)Running ESLint...$(NC)"
	npm run lint
	@echo "$(GREEN)✓ Linting completed$(NC)"

format: ## Format code with Prettier
	@echo "$(GREEN)Formatting code...$(NC)"
	npm run format
	@echo "$(GREEN)✓ Code formatting completed$(NC)"

# Packaging and Distribution
pack: build ## Package the Electron app (unpacked)
	@echo "$(GREEN)Packaging Electron app...$(NC)"
	npm run pack
	@echo "$(GREEN)✓ App packaged$(NC)"

dist: build ## Create distribution package for current platform
	@echo "$(GREEN)Creating distribution package...$(NC)"
	npm run dist
	@echo "$(GREEN)✓ Distribution package created in dist/$(NC)"

dist-linux: build ## Create Linux distribution (AppImage, deb, rpm)
	@echo "$(GREEN)Creating Linux distribution...$(NC)"
	npm run dist:linux
	@echo "$(GREEN)✓ Linux packages created in dist/$(NC)"

dist-mac: build ## Create macOS distribution (dmg, zip)
	@echo "$(GREEN)Creating macOS distribution...$(NC)"
	npm run dist:mac
	@echo "$(GREEN)✓ macOS packages created in dist/$(NC)"

dist-win: build ## Create Windows distribution (nsis, portable)
	@echo "$(GREEN)Creating Windows distribution...$(NC)"
	npm run dist:win
	@echo "$(GREEN)✓ Windows packages created in dist/$(NC)"

# Development Utilities
reset: clean install ## Reset project (clean + install)

start: dev ## Quick start (alias for dev)

info: ## Show environment information
	@echo "$(BLUE)Environment Info$(NC)"
	@echo "  Node: $$(node --version)"
	@echo "  npm:  $$(npm --version)"
	@echo "  App:  $(PROJECT_NAME) v$(VERSION)"
	@echo "  OS:   $$(uname -s) $$(uname -m)"
