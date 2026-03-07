# Fridgit

A smart fridge inventory app with barcode scanning, recipe suggestions, meal planning, and calorie tracking. Built for local network use -- run it on any machine, access it from any device on your network.

## Features

- **Fridge Inventory** -- Track what's in your fridge, freezer, and pantry with quantities and expiry dates
- **Barcode Scanning** -- Scan product barcodes with your phone camera to auto-fill item details via Open Food Facts
- **Product Search** -- Look up products by name to get nutrition info automatically
- **Expiry Alerts** -- See at a glance which items are expiring soon
- **Recipe Suggestions** -- Get recipe ideas based on ingredients you already have (via Spoonacular API)
- **Shopping List** -- Manual and auto-generated lists from expiring/low inventory items
- **Meal Planning** -- Save recipes to your meal plan
- **Calorie Tracking** -- Log consumed items and track daily calories
- **Multi-User** -- Multiple household members can register and share items
- **Mobile-First UI** -- Responsive design that works great on phones and desktops

## Prerequisites

- **Node.js 18+** -- [Download here](https://nodejs.org/)
- **PostgreSQL** -- Running and accessible (local or remote). [Download here](https://www.postgresql.org/download/)

## Quick Start

```bash
# 1. Clone or download the project
cd fridgit

# 2. Install all dependencies
npm run install:all

# 3. Start the app
npm run dev
```

Then open **http://localhost:5173** in your browser.

### First Run Setup

On first launch, you'll see a setup wizard. Enter your PostgreSQL connection details:

| Field | Default | Description |
|-------|---------|-------------|
| Host | localhost | PostgreSQL server IP/hostname |
| Port | 5432 | PostgreSQL port |
| Username | postgres | Database user |
| Password | (none) | Database password |
| Database | fridgit | Database name (created automatically) |
| Spoonacular Key | (optional) | [Get a free key](https://spoonacular.com/food-api) for recipe suggestions |

Click **Test** to verify the connection, then **Save & Initialize**. The app will:
1. Create the database if it doesn't exist
2. Create all required tables
3. Generate a secure JWT secret
4. Save the config to `server/.env`

### Accessing from Other Devices

The app listens on all network interfaces. Find your machine's local IP and access it from any device on the same network:

```bash
# Find your IP (macOS/Linux)
ifconfig | grep "inet "

# Find your IP (Windows)
ipconfig
```

Then visit `http://YOUR_IP:5173` from your phone or another computer.

## Project Structure

```
fridgit/
├── package.json          # Root scripts (dev, start)
├── server/
│   ├── index.js          # Express server (HTTP, port 3000)
│   ├── db/
│   │   ├── index.js      # PostgreSQL connection pool
│   │   └── schema.js     # Auto-migration (CREATE IF NOT EXISTS)
│   ├── routes/
│   │   ├── setup.js      # Setup wizard API
│   │   ├── auth.js       # Register, login, /me
│   │   ├── items.js      # Fridge items CRUD + consume
│   │   ├── barcode.js    # Open Food Facts lookup
│   │   ├── shopping-list.js
│   │   ├── meals.js      # Meal planning
│   │   ├── recipes.js    # Spoonacular recipe search
│   │   ├── calories.js   # Calorie logging
│   │   └── settings.js   # User preferences
│   ├── middleware/auth.js # JWT auth middleware
│   ├── services/openfoodfacts.js
│   └── utils/            # JWT + password helpers
├── client/
│   ├── index.html
│   ├── vite.config.js    # Dev server + API proxy
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx       # Router + setup check
│       ├── hooks/useAuth.jsx
│       ├── services/api.js
│       ├── components/Layout.jsx
│       └── pages/
│           ├── Setup.jsx       # First-run wizard
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Home.jsx        # Dashboard
│           ├── Fridge.jsx      # Inventory view
│           ├── NewItem.jsx     # Add item + barcode scan
│           ├── ShoppingList.jsx
│           ├── Recipes.jsx
│           └── Settings.jsx
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Frontend | React 18, Vite |
| Styling | Tailwind CSS (custom Fridgit theme) |
| Auth | JWT (bcrypt password hashing) |
| Barcode | html5-qrcode + Open Food Facts API |
| Recipes | Spoonacular API |
| Icons | Lucide React |
| Animations | Framer Motion |
| Notifications | React Hot Toast |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/setup/status | No | Check if app is configured |
| POST | /api/setup/test | No | Test DB connection |
| POST | /api/setup/configure | No | Save config + init DB |
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Sign in |
| GET | /api/auth/me | Yes | Get current user |
| GET | /api/items | Yes | List fridge items |
| POST | /api/items | Yes | Add item |
| PUT | /api/items/:id | Yes | Update item |
| DELETE | /api/items/:id | Yes | Delete item |
| POST | /api/items/:id/consume | Yes | Consume quantity |
| GET | /api/items/expiring | Yes | List expiring items |
| GET | /api/barcode/:code | No | Lookup barcode |
| GET | /api/barcode/search/:query | No | Search products |
| GET/POST/PUT/DELETE | /api/shopping-list | Yes | Shopping list CRUD |
| POST | /api/shopping-list/auto-generate | Yes | Auto-add from inventory |
| GET/POST/DELETE | /api/meals | Yes | Meal planning |
| GET | /api/recipes/suggestions | No | Recipe search |
| GET | /api/recipes/:id | No | Recipe details |
| GET/POST | /api/calories | Yes | Calorie logging |
| GET/PUT | /api/settings | Yes | User settings |

## License

MIT
