# Gull Lake Golf Tournament Management Application

A comprehensive web application for managing golf tournaments, team competitions, player matching, and scoring. Built with Next.js, React, Prisma ORM, and PostgreSQL.

## Features

- **Tournament Management**: Create and manage golf tournaments with customizable settings
- **Team & Player Management**: Organize players into teams with handicap tracking
- **Course Management**: Set up golf courses with hole details and handicap indexes
- **Match Scheduling**: Create and manage match schedules with various formats
- **Scoring System**: Record and calculate scores with proper handicap allocations
- **Format Support**: Multiple match formats including Singles, Best Ball, Alternate Shot, Chapman, and Scramble
- **Home/Away Designation**: Supports proper home and away team designation
- **Responsive Design**: Works on mobile, tablet, and desktop devices
- **Player Pairing**: Automatic and manual player pairing for matches
- **Prize Calculations**: Support for CTP (Closest to Pin) and Skins competitions

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- PostgreSQL (v12 or newer)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gull-lake-golf.git
cd gull-lake-golf
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following contents:
```
DATABASE_URL="postgresql://username:password@localhost:5432/gull_lake_db"
JWT_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3050"
NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"
```

4. Initialize database:
```bash
npx prisma migrate dev
npx prisma db seed
```

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3050](http://localhost:3050) in your browser

### Database Management

- Generate Prisma client: `npm run prisma:generate`
- Run migrations: `npm run prisma:migrate`
- Reset database: `npm run prisma:reset`
- Seed database: `npm run prisma:seed`
- Open Prisma Studio: `npx prisma studio`

## Documentation

- See [CLAUDE.md](./CLAUDE.md) for development guidelines and commands
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system architecture details
- See [SUGGESTIONS.md](./SUGGESTIONS.md) for future improvement ideas

## Project Structure

```
gull-lake/
├── prisma/                  # Database schema and migrations
│   ├── migrations/          # Database migrations
│   ├── schema.prisma        # Prisma schema definition
│   ├── seed.ts              # Database seed script
│   └── db_backup/           # Database backup files
├── public/                  # Static files
│   ├── images/              # Image assets
│   └── uploads/             # User uploaded files
├── src/
│   ├── components/          # React components
│   │   ├── layout/          # Layout components
│   │   └── tournaments/     # Tournament-specific components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Library code
│   ├── pages/               # Next.js pages and API routes
│   │   ├── api/             # API routes
│   │   └── ...              # Page components
│   ├── styles/              # Global styles and Tailwind config
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── .env                     # Environment variables (create this)
├── .eslintrc.json          # ESLint configuration
├── CLAUDE.md                # Development guidelines
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies and scripts
├── postcss.config.js       # PostCSS configuration for Tailwind
└── tailwind.config.js      # Tailwind CSS configuration
```

## Authentication

This application uses Next-Auth for authentication and JWT tokens for API security. The user authentication flow is:

1. User signs in via the `/auth/signin` page
2. JWT token is generated and stored in cookies
3. API routes are protected by verifying the JWT token
4. Frontend requests include the JWT token in Authorization header

## Golf Tournament Logic

The application handles multiple golf formats with different scoring rules:

- **Singles**: 1v1 player matches (2 players per team)
- **Best Ball**: Uses 90% of lowest handicap player
- **Alternate Shot**: Uses average of players' handicaps
- **Scramble**: Uses 35% of lowest handicap + 15% of highest
- **Chapman**: Uses 60% of lower handicap + 40% of higher
- **4-Man Team**: Team vs team format

Handicap allocation follows standard golf rules, where strokes are given based on hole difficulty index.

## License

[MIT](LICENSE)

## Contact

For more information, please contact [your-email@example.com](mailto:your-email@example.com).