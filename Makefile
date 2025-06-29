# ArXiv Desktop App - Makefile

.PHONY: help install clean dev build test lint format pack dist

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

# Building and Testing
build: ## Build React app for production
	@echo "$(GREEN)Building app for production...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build completed$(NC)"

test: ## Run tests
	@echo "$(GREEN)Running tests...$(NC)"
	npm test -- --watchAll=false --verbose
	@echo "$(GREEN)✓ Tests completed$(NC)"

lint: ## Run ESLint
	@echo "$(GREEN)Running ESLint...$(NC)"
	npx eslint src electron --ext .js,.jsx
	@echo "$(GREEN)✓ Linting completed$(NC)"

format: ## Format code with Prettier
	@echo "$(GREEN)Formatting code...$(NC)"
	npx prettier --write "src/**/*.{js,jsx,css}" "electron/**/*.js"
	@echo "$(GREEN)✓ Code formatting completed$(NC)"

# Packaging and Distribution
pack: build ## Package the Electron app
	@echo "$(GREEN)Packaging Electron app...$(NC)"
	npm run pack
	@echo "$(GREEN)✓ App packaged$(NC)"

dist: build ## Create distribution packages
	@echo "$(GREEN)Creating distribution packages...$(NC)"
	npm run dist
	@echo "$(GREEN)✓ Distribution packages created$(NC)"

# Development Utilities
reset: ## Reset project (clean + install)
	@echo "$(YELLOW)Resetting project...$(NC)"
	$(MAKE) clean
	$(MAKE) install
	@echo "$(GREEN)✓ Project reset completed$(NC)"

start: dev ## Quick start (alias for dev)