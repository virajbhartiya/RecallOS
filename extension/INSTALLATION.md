# RecallOS Extension Installation Guide

## Quick Start (4 Steps)

1. **Download**: [Get the latest release](https://github.com/virajbhartiya/RecallOS/releases/latest)
2. **Extract**: Unzip the downloaded file
3. **Enable**: Chrome/Edge → Extensions → Developer mode → ON
4. **Load**: Click "Load unpacked" → Select the extracted folder

**System Requirements**: Chrome 88+ or Edge 88+, 4GB RAM minimum, stable internet connection

---

## Overview

RecallOS is a browser extension that automatically captures and processes your web browsing activity to create a searchable, AI-powered memory network. Since the extension is not yet published to the Chrome Web Store, you'll need to install it manually using Chrome's developer mode.

## Prerequisites

- **Chrome Browser** (version 88+) or **Microsoft Edge** (version 88+)
- **GitHub Account** (to download the extension)
- **Basic computer skills** (extracting zip files, navigating browser settings)

## Installation Steps

### Step 1: Download the Extension

1. Go to the [RecallOS GitHub Releases page](https://github.com/virajbhartiya/RecallOS/releases/latest)
2. Look for the latest release with a file named `recallos-extension-vX.X.X.zip`
3. Click the download link to save the zip file to your computer
4. Note the location where you saved the file (usually your Downloads folder)

### Step 2: Extract the Extension Files

1. Navigate to the folder where you downloaded the zip file
2. Right-click on the `recallos-extension-vX.X.X.zip` file
3. Select "Extract All" or "Extract Here" (depending on your operating system)
4. This will create a new folder with the extension files
5. **Important**: Remember the location of this extracted folder - you'll need it in the next step

### Step 3: Enable Developer Mode in Chrome/Edge

#### For Google Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. In the top-right corner, toggle **"Developer mode"** to ON
3. You should see new buttons appear: "Load unpacked", "Pack extension", and "Update"

#### For Microsoft Edge:

1. Open Edge and navigate to `edge://extensions/`
2. In the left sidebar, click on **"Developer mode"** to enable it
3. You should see new options appear for loading unpacked extensions

### Step 4: Load the Extension

1. Click the **"Load unpacked"** button (Chrome) or **"Load unpacked"** option (Edge)
2. Navigate to the folder where you extracted the extension files
3. Select the folder containing the extension files (it should contain files like `manifest.json`, `popup.html`, etc.)
4. Click **"Select Folder"** (Chrome) or **"Select Folder"** (Edge)

### Step 5: Verify Installation

1. You should see the RecallOS extension appear in your extensions list
2. Look for the RecallOS icon in your browser toolbar (top-right area)
3. Click on the RecallOS icon to open the extension popup
4. You should see the RecallOS interface with connection options

## Post-Installation Setup

### Configure Settings (Optional)

1. Click the RecallOS extension icon
2. Click on **"Settings"** or the gear icon
3. Configure your preferences:
   - **Monitoring frequency**: How often to capture page content
   - **Privacy settings**: Which sites to skip monitoring
   - **AI provider**: Choose between Gemini and Ollama
   - **Capture rules**: Define sites to include/exclude

## Troubleshooting

### Extension Not Loading

**Problem**: The extension doesn't appear after clicking "Load unpacked"

**Solutions**:

- Make sure you selected the correct folder (the one containing `manifest.json`)
- Check that Developer mode is enabled
- Try refreshing the extensions page (`chrome://extensions/` or `edge://extensions/`)
- Restart your browser and try again

### Extension Icon Not Visible

**Problem**: Can't find the RecallOS icon in the toolbar

**Solutions**:

- Click the puzzle piece icon (Chrome) or extensions icon (Edge) in the toolbar
- Look for RecallOS in the list and click the pin icon to pin it to the toolbar
- Check if the extension is enabled in the extensions page

### API Connection Issues

**Problem**: Can't connect the extension to the API

**Solutions**:

- Ensure the API server is running and reachable
- Verify the API URL in the extension settings
- Check browser DevTools console for errors

### Permission Errors

**Problem**: Extension shows permission errors

**Solutions**:

- Go to the extensions page and click "Details" on RecallOS
- Review and approve all required permissions
- Make sure the extension has access to the sites you want to monitor

## Security Notes

- **Developer Mode**: Installing unpacked extensions requires Developer mode, which is intended for developers
- **Source Verification**: Only download the extension from the official RecallOS GitHub repository
- **Permissions**: Review the extension permissions before installation
- **Updates**: You'll need to manually update the extension by downloading new releases

## Uninstalling the Extension

If you need to remove the extension:

1. Go to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
2. Find RecallOS in the list
3. Click **"Remove"** or the trash icon
4. Confirm the removal

## Getting Help

If you encounter issues not covered in this guide:

1. **Check the Issues**: Visit the [GitHub Issues page](https://github.com/virajbhartiya/RecallOS/issues)
2. **Read the Documentation**: Check the main [README.md](../README.md) for more information
3. **Join the Community**: Look for community discussions in GitHub Discussions
4. **Report Bugs**: Create a new issue on GitHub with detailed information about your problem

## System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Browser**: Chrome 88+ or Edge 88+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 100MB free space for extension files
- **Internet**: Stable connection for AI processing

## Privacy and Data

- **Local Processing**: Content is processed locally when possible
- **Cloud/Local AI**: Content is optionally processed locally via Ollama
- **No Tracking**: The extension doesn't track your browsing habits for advertising
- **User Control**: You control what gets captured and stored

## Quick Reference

### Installation Checklist

- [ ] Downloaded extension from GitHub releases
- [ ] Extracted zip file to a folder
- [ ] Enabled Developer mode in Chrome/Edge
- [ ] Loaded unpacked extension
- [ ] Set API endpoint in extension popup
- [ ] Started browsing to test capture

### Common Commands

- **Extensions Page**: `chrome://extensions/` or `edge://extensions/`
- **Developer Mode**: Toggle in top-right corner (Chrome) or left sidebar (Edge)
- **Load Unpacked**: Click button to select extension folder

### Need Help?

- 📖 **This Guide**: Complete installation and troubleshooting
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/virajbhartiya/RecallOS/issues)
- 💬 **Get Support**: [GitHub Discussions](https://github.com/virajbhartiya/RecallOS/discussions)
- 📚 **Documentation**: [Main README](../README.md)

---

**Note**: This is a development version of RecallOS. The extension is still in development and may have bugs or incomplete features. Use at your own discretion and report any issues you encounter.
