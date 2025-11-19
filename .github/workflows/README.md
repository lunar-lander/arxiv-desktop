# GitHub Actions Workflows

This directory contains automated workflows for building, testing, and releasing the ArXiv Desktop application.

## Workflows

### 1. CI (`ci.yml`)

**Trigger**: Pull requests and pushes to feature branches

**Purpose**: Continuous integration for all code changes

**Jobs**:
- **Lint and Test**: Runs linter, Prettier, and builds the React app
- **Package Test**: Tests packaging on all platforms (macOS, Linux, Windows)

**When it runs**: Automatically on every push to feature branches and pull requests

### 2. Build and Release (`build-release.yml`)

**Trigger**: Pushes to `main`/`master` branch and version tags

**Purpose**: Automated builds and releases

**Jobs**:
- **Test**: Runs linter and builds React app
- **Build**: Builds Electron packages for all platforms
- **Release**: Creates GitHub release (only for version tags like `v1.0.0`)
- **Publish Draft**: Creates draft release for main branch commits

**When it runs**:
- On every push to `main` or `master` → Creates draft release
- On version tags (e.g., `v1.0.0`) → Creates official release

### 3. Manual Release (`manual-release.yml`)

**Trigger**: Manual workflow dispatch

**Purpose**: Create releases on-demand

**Jobs**:
- **Build and Release**: Builds for all platforms and creates release

**How to use**:
1. Go to Actions tab on GitHub
2. Select "Manual Release" workflow
3. Click "Run workflow"
4. Enter version number (e.g., `1.0.0`)
5. Choose if it's a pre-release
6. Click "Run workflow"

## Release Process

### Automatic Release (Recommended)

1. **Update version in package.json**:
   ```bash
   npm version patch  # For bug fixes
   npm version minor  # For new features
   npm version major  # For breaking changes
   ```

2. **Create and push tag**:
   ```bash
   git push origin main
   git push origin --tags
   ```

3. **Wait for builds**: GitHub Actions will automatically:
   - Build for macOS, Linux, and Windows
   - Create a GitHub release
   - Attach all build artifacts

### Manual Release

1. Go to Actions → Manual Release
2. Enter version number
3. Click "Run workflow"
4. Download artifacts from the release

## Build Artifacts

Each successful build produces:

### macOS
- `.dmg` - Disk image installer
- `.zip` - Compressed application

### Windows
- `.exe` - NSIS installer
- Portable `.exe` - Standalone executable

### Linux
- `.AppImage` - Universal Linux package
- `.deb` - Debian/Ubuntu package
- `.rpm` - RedHat/Fedora package

## Environment Variables

The workflows use:
- `GITHUB_TOKEN`: Automatically provided by GitHub
- `CI`: Set to `false` to allow warnings during build

## Troubleshooting

### Build fails on one platform

- Check the workflow logs in Actions tab
- Look for platform-specific errors
- Common issues:
  - Missing dependencies
  - Icon file issues
  - TypeScript errors

### Release not created

- Ensure you pushed a version tag: `git push --tags`
- Check that tag starts with `v` (e.g., `v1.0.0`)
- Verify GITHUB_TOKEN permissions

### Artifacts missing

- Check that `dist` folder was created
- Verify electron-builder config in package.json
- Look for errors in upload-artifact step

## Local Testing

Test packaging locally before pushing:

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Build React app
npm run build

# Test packaging (doesn't upload)
npm run pack

# Check dist folder
ls -la dist/
```

## Maintenance

### Update Node.js version

Edit all workflow files and change:
```yaml
node-version: '18'  # Update this
```

### Add new build targets

Edit `package.json` build configuration:
```json
{
  "build": {
    "linux": {
      "target": ["AppImage", "deb", "rpm", "snap"]  // Add snap
    }
  }
}
```

### Modify workflow triggers

Edit the `on:` section in each workflow file.

## Security

- Never commit secrets or API keys
- Use GitHub Secrets for sensitive data
- GITHUB_TOKEN is automatically provided and scoped
- Review workflow permissions before merging
