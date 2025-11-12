# Cognia Browser Extension

A browser extension that automatically captures and processes your web browsing activity to create a searchable, AI-powered memory network.

## Features

- **Automatic Content Capture**: Monitors web pages and extracts meaningful content
- **AI Processing**: Generates summaries and embeddings using Gemini or Ollama
- **Memory Mesh**: Creates connections between related content and ideas

- **AI Integration**: Works with ChatGPT and other AI tools for context-aware responses
- **Privacy-First**: Never captures private or local content

## Quick Start

### Installation

Since the extension is not yet published to the Chrome Web Store, you'll need to install it manually:

1. **Download**: Get the latest release from [GitHub Releases](https://github.com/virajbhartiya/Cognia/releases/latest)
2. **Extract**: Unzip the downloaded file to a folder on your computer
3. **Install**: Load the extension in Chrome/Edge developer mode
4. **Configure**: Set your API endpoint and preferences

📖 **For detailed installation instructions, see [INSTALLATION.md](./INSTALLATION.md)**

### Usage

1. **Browse Normally**: Just use the web as you normally do
2. **Automatic Capture**: Cognia quietly captures and processes content in the background
3. **Search Memories**: Use the extension popup to search your captured memories
4. **AI Integration**: Chat with AI tools that now have access to your memory network

## Development

### Building the Extension

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch for changes during development
npm run dev
```

### Project Structure

```
extension/
├── src/
│   ├── background.ts      # Background script for content capture
│   ├── content.ts         # Content script for page interaction
│   ├── popup.tsx          # Extension popup interface
│   └── components/        # React components
├── dist/                  # Built extension files
├── public/                # Static assets
└── INSTALLATION.md        # Detailed installation guide
```

### Key Files

- **`manifest.json`**: Extension configuration and permissions
- **`background.ts`**: Handles content capture and API communication
- **`content.ts`**: Extracts content from web pages
- **`popup.tsx`**: User interface for the extension

## Configuration

### Environment Variables

Create a `.env` file in the extension directory:

```env
VITE_API_URL=http://localhost:3001
VITE_AI_PROVIDER=gemini
```

### Permissions

The extension requires the following permissions:

- **`activeTab`**: Access to the current tab for content extraction
- **`storage`**: Store user preferences and captured data
- **`tabs`**: Monitor tab changes and navigation
- **`scripting`**: Inject content scripts for page analysis

## Privacy & Security

- **Local Processing**: Content is processed locally when possible
- **No Private Data**: Never captures localhost, private networks, or sensitive information
- **User Control**: You control what gets captured and stored

## Troubleshooting

### Common Issues

1. **Extension Not Loading**: Ensure Developer mode is enabled and you selected the correct folder
2. **Wallet Connection**: Make sure your wallet is unlocked and on the correct network
3. **Content Not Capturing**: Check that the extension has the necessary permissions

For more detailed troubleshooting, see [INSTALLATION.md](./INSTALLATION.md#troubleshooting).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the main repository for details.

## Support

- **Documentation**: Check the main [README.md](../README.md)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/virajbhartiya/Cognia/issues)
- **Discussions**: Join community discussions in GitHub Discussions

---

**Note**: This is a development version of Cognia. The extension is still in development and may have bugs or incomplete features.
