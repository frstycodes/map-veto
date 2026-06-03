# VetoSession 🎮

A modern web platform that helps gamers and teams coordinate map/game veto sessions efficiently. Create and manage veto sessions for your favorite games with real-time updates.


## Features ✨

- Create custom veto sessions for different games
- Real-time updates through long polling
- Clean and intuitive user interface
- Support for multiple veto formats (Single elimination, Best of X)
- No account required to participate
- Share sessions easily with a unique link

## Tech Stack 🛠️

- **Frontend:**

  - React with TypeScript
  - TanStack Router for type-safe routing
  - Tailwind CSS for styling
  - shadcn/ui for component library
  - Long polling for real-time updates

- **Backend:**
  - Go (Golang)
  - RESTful API architecture
  - PostgreSQL for data persistence
  - Long polling implementation for real-time communication

## Getting Started 🚀

### Prerequisites

- Bun
- Go (v1.20 or higher)

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/imsandeshpandey/map-veto.git
   cd map-veto
   ```

2. Frontend setup:

   ```bash
   cd frontend
   bun install
   bun dev
   ```

3. Backend setup:
   ```bash
   cd server
   go mod download
   go run main.go
   ```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8000`.
