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

3. **Configure environment variables (optional for cloud sync):**
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials
# Get these from https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Note**: The app works in LocalStorage-only mode without these credentials. Cloud sync and multi-user features require a Supabase account (free tier available).

4. **Set up Supabase database (required for cloud sync and user comparison):**

If you configured Supabase credentials in step 3, you need to run the SQL migrations:

```bash
# 1. Go to your Supabase Dashboard > SQL Editor
# 2. Create a new query and run the contents of:
#    - supabase-setup.sql (quest_progress table and RLS policies)
#    - supabase-user-profiles-function.sql (user comparison support)
```

These files are in the repository root. Copy and paste their contents into Supabase SQL Editor and run them.

5. **Start the development server:**
```bash
npm run dev
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

### User Comparison (Cloud Sync Required)
Compare quest progress with other users to coordinate squad play:
- **View All Users**: See all registered users with completion statistics
- **Select Users**: Click one or more users to compare (up to 10)
- **Find Common Quests**: Shows quests incomplete for ALL selected users
- **Visual Indicators**: See per-user completion status with checkmarks/circles
- **Share Links**: Generate shareable URLs to coordinate with squadmates
- **Keyboard Shortcuts**: 
  - `Escape` to clear selection
  - `Ctrl+R` to refresh user list

**Requirements**: 
- Supabase configuration required (see Setup step 3-4)
- Users must be authenticated and have quest progress synced

**Use Cases**:
- Duo/trio coordination: Find quests you both need to complete
- Squad planning: Identify common objectives for group raids
- Progress tracking: See which squadmate needs help with specific quests

### Quest & Hideout Item Tracker
Track all items needed for incomplete quests and hideout upgrades:

**Features**:
- **View All Items**: Aggregated list of items from quests and hideout modules
- **Smart Filtering**: 
  - All Items / Quest Items / Hideout Items / Keys
  - Hide Collected toggle
  - Filter persistence across sessions
- **Priority Indicators**:
  - ⚠️ **NEEDED SOON** (red/orange): Items for unlocked quests or buildable hideout modules
  - 🕐 **NEEDED LATER** (blue/gray): Items for locked quests or non-buildable modules
- **Collection Tracking**: Mark items as collected with checkboxes
- **Item Details**: Click any item for detailed info, sources, and wiki link
- **FiR Indicators**: 🔍 badge shows when Found in Raid required
- **Real-time Updates**: Automatically refreshes when you complete quests or hideout modules

**How to Use**:
1. Complete quests and hideout tracking in other tabs
2. Switch to Item Tracker tab to see aggregated items needed
3. Use filters to focus on specific categories (Quest/Hideout/Keys)
4. Mark items as collected when you find them
5. Priority indicators show which items are urgently needed
6. Click any item card for detailed breakdown of requirements

**Performance**:
- < 3 second initial load with 400-500 items
- < 100ms filter response time
- 24-hour API cache with offline fallback

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
│   │   ├── tarkov-api.js  # Quest API client & caching
│   │   └── tarkov-items-api.js  # Items & hideout API client
│   ├── models/
│   │   ├── quest.js       # Quest data model
│   │   ├── item.js        # Item data models (Item, AggregatedItem)
│   │   ├── hideout-module.js  # Hideout module model
│   │   ├── hideout-manager.js  # Hideout tracking manager
│   │   └── item-tracker-manager.js  # Item aggregation engine
│   ├── services/
│   │   ├── priority-service.js  # Priority calculation
│   │   └── item-storage-service.js  # Collection persistence
│   └── components/
│       ├── quest-list.js  # Quest list UI
│       ├── quest-graph.js # Graph visualization
│       ├── item-tracker.js  # Item tracker controller
│       ├── item-list.js   # Item grid renderer
│       ├── item-card.js   # Item card component
│       └── item-detail-modal.js  # Item detail modal
├── styles/
│   ├── main.css           # Base styles
│   ├── quest-list.css     # List view styles
│   ├── quest-graph.css    # Graph view styles
│   └── item-tracker.css   # Item tracker styles
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
```bash
npm run build
npm run preview  # Test production build locally
```

## Deployment

### Vercel Deployment (Recommended)

This app is optimized for deployment on Vercel with automatic CI/CD from GitHub.

**Live URL**: [To be added after deployment]

**Deploy your own:**
1. Push code to GitHub repository
2. Import project to Vercel (https://vercel.com/new)
3. Add environment variables in Vercel dashboard (optional for cloud sync):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automatically on push to main branch

### Other Hosting Options
- GitHub Pages
- Netlify
- AWS S3
- Any static web server
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
