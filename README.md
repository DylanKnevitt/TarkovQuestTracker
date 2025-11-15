# Tarkov Quest Tracker

An interactive static SPA for tracking Escape from Tarkov quests with optimized paths to Lightkeeper, Setup, and Test Drive quests.

## Features

✨ **Key Features:**
- 📊 Complete quest database from Tarkov.dev API
- 🗺️ Interactive dependency graph visualization
- 🎯 Path finder to specific quests (Lightkeeper, Setup, Test Drive)
- ✅ Progress tracking with localStorage
- 🔍 Advanced filtering and search
- 📱 Responsive design
- 🚀 Fast, static SPA (no backend required)

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Modern web browser

### Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd TarkovQuest
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm start
```

The app will open at `http://localhost:8080`

## Usage

### Quick Paths
Use the sidebar buttons to quickly find paths to:
- **Lightkeeper**: Shows all quests required to unlock Lightkeeper
- **Setup**: Optimal path to Skier's "Setup" quest
- **Test Drive**: Path to Mechanic's "Test Drive - Part 1" quest

### Filtering Quests
- **By Trader**: Check/uncheck traders to filter
- **By Level**: Set min/max level requirements
- **Search**: Find quests by name or objective text
- **View Options**: Toggle completed/locked quests

### Quest List View
- View all quests organized by trader
- Click any quest card for detailed information
- Mark quests as complete to track progress
- Color-coded by status:
  - 🟢 Green = Completed
  - 🔵 Blue = Available (unlocked)
  - ⚫ Gray = Locked (prerequisites not met)

### Dependency Graph
- Visual representation of quest chains
- Interactive nodes (click for details)
- Color-coded by trader and status
- Special markers for Kappa and Lightkeeper quests
- Multiple layout algorithms (Hierarchical, Breadth First, Circle)

### Path Finder
- Select any target quest
- Enter your current level
- Get step-by-step optimal path
- Highlights prerequisites in order

## Data Source

Quest data is fetched from the [Tarkov.dev GraphQL API](https://api.tarkov.dev/):
- Free, community-maintained API
- Real-time game data
- Includes quest requirements, objectives, rewards

Data is cached locally for 24 hours to reduce API calls.

## Project Structure

```
TarkovQuest/
├── index.html              # Main HTML file
├── package.json            # Dependencies
├── src/
│   ├── index.js           # Main application entry
│   ├── api/
│   │   └── tarkov-api.js  # API client & caching
│   ├── models/
│   │   └── quest.js       # Quest data model
│   └── components/
│       ├── quest-list.js  # Quest list UI
│       └── quest-graph.js # Graph visualization
├── styles/
│   ├── main.css           # Base styles
│   ├── quest-list.css     # List view styles
│   └── quest-graph.css    # Graph view styles
├── scripts/
│   └── fetch-quest-data.js # Data fetching script
└── data/
    └── quests.json        # Cached quest data (generated)
```

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Visualization**: Cytoscape.js with Dagre layout
- **API**: Tarkov.dev GraphQL API
- **Styling**: CSS3 with CSS variables
- **Storage**: localStorage for progress tracking

## Development

### Fetch Latest Quest Data
```bash
npm run fetch-data
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
Simply deploy the entire directory to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Any web server

## Key Quest Paths

### Path to Lightkeeper
Lightkeeper is unlocked through a complex quest chain:
1. Complete most quests from all traders
2. Complete Fence's "Collector" quest
3. Complete Jaeger's high-level quests
4. Final quests: "Capturing Outposts" → "Burn the Evidence" → "Meeting Place"

### Path to Setup (Skier - Level 10)
Prerequisites:
- Complete "Friend from the West - Part 2"
- Early Skier and Therapist quests

### Path to Test Drive (Mechanic - Level 30)
Prerequisites:
- Complete all Gunsmith quests (1-16)
- Requires specific weapon modifications

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## API Credits

This project uses the [Tarkov.dev API](https://tarkov.dev/) by [The Hideout](https://github.com/the-hideout).
- Open source community project
- Free to use
- Constantly updated with game data

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Create an issue on GitHub
- Check the [Tarkov.dev Discord](https://discord.gg/WwTvNe356u)

## Roadmap

- [ ] Add map location markers
- [ ] Item requirement tracking
- [ ] Quest rewards calculator
- [ ] Export progress as JSON
- [ ] Import progress from EFT profile
- [ ] Mobile app version
- [ ] Quest guide integration

---

**Note**: This is a community tool and is not affiliated with Battlestate Games or Escape from Tarkov.
