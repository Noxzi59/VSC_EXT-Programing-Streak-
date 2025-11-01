# Programming Time Tracker

A VSCode extension for tracking programming time and maintaining coding streaks, inspired by GitHub's contribution graph.

## Features

- **Real-time Timer**: Start/stop programming sessions with a convenient status bar button
- **Streak Tracking**: Monitor your current and longest coding streaks
- **GitHub-style Dashboard**: Beautiful visualization of your coding activity
- **Persistent Data**: All your coding data is saved and persists across VSCode sessions
- **Session History**: View detailed history of your coding sessions

## Installation

1. Download the `.vsix` file from the releases
2. In VSCode, go to Extensions → Install from VSIX...
3. Select the downloaded file

## Usage

### Basic Timer
- Click the **$(play) Start** button in the status bar to begin tracking
- Click **$(stop) Stop** when you're done
- Your current session time is displayed in the status bar

### View Dashboard
- Open Command Palette (`Ctrl+Shift+P`)
- Search for "Show Coding Streak Dashboard"
- View your streaks, activity graph, and session history

### Commands
- `Programming Time Tracker: Start Programming Timer` - Start a new session
- `Programming Time Tracker: Stop Programming Timer` - End current session
- `Programming Time Tracker: Show Programming Time` - View total time
- `Programming Time Tracker: Show Coding Streak Dashboard` - Open dashboard

## Dashboard Features

- **Current Streak**: Days you've coded consecutively
- **Longest Streak**: Your personal best
- **7-Day Activity Graph**: Visual representation of recent coding
- **Session History**: Detailed list of your coding sessions

## Development

### Prerequisites
- Node.js 16+
- npm

### Setup
```bash
npm install
npm run compile
```

### Testing
```bash
code --extensionDevelopmentPath=. --disable-extensions
```

### Packaging
```bash
npm install -g @vscode/vsce
vsce package
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details