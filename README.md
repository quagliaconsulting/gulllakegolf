# Gull Lake Golf Tournament App

## Overview
The Gull Lake Golf Tournament App is a comprehensive platform to organize and manage golf tournaments with a specific focus on team-based competition. The app replicates and enhances the functionality found in traditional spreadsheet-based tournament management while making all elements customizable by users.

This application is built for the "Spring Classic" tournament held annually at Gull Lake, but is designed to be configurable for any golf tournament.

## Core System Requirements

### 1. Tournament Configuration Module

#### Event Settings
- **Tournament Name**: Configurable (e.g., "Spring Classic")
- **Year**: Configurable (e.g., 2023)
- **Location**: Configurable (e.g., "Gull Lake")
- **Dates**: Configurable with support for multi-day tournaments
- **Team Names**: Configurable (e.g., "Spartan Dawgs", "Invited Guests")
- **Branding**: Custom logo, colors, and tournament graphics

#### Course Management
- **Course Names**: Configurable (e.g., "Stoatin Brae")
- **Hole Details**: Configurable par, handicap, and distance for each hole
- **Multiple Course Support**: Ability to add multiple courses for a single tournament
- **Course Pictures/Maps**: Upload and display course layouts and hole pictures

#### Accommodation Management
- **Housing Groups**: Configurable accommodation units (e.g., "Villa 1", "Villa 2", etc.)
- **Room Assignments**: Ability to assign players to specific accommodations
- **Location Details**: Add accommodation details, maps, contact info

### 2. Player Management Module

#### Player Profiles
- **Player Database**: Store player information (name, contact, photo)
- **Team Assignment**: Assign players to teams (e.g., "Spartan Dawgs" or "Invited Guests")
- **Handicap Management**: Record and track individual handicaps
- **Historical Data**: Track player participation and performance across tournaments

#### Handicap System
- **Base Handicap**: Store individual handicap index (e.g., James: 16, Dan: 7.8)
- **Format Multipliers**: Configurable handicap adjustments for different formats:
  * Standard: Configurable (default 1.0)
  * Scramble: Configurable (default 0.4)
  * Alternate Shot: Configurable (default 0.7)
  * Chapman: Configurable (default 0.6)
  * Support for adding custom formats with custom multipliers
- **Automatic Calculation**: Calculate adjusted handicaps based on selected format

### 3. Match Format & Scheduling

#### Format Configuration
- **Match Formats**: Support for multiple formats:
  * Best Ball (BB)
  * Scramble
  * Alternate Shot (AltShot)
  * Chapman
  * Custom formats
- **Format Mixing**: Allow different formats for different matches or days
- **Rules Settings**: Configurable rules for each format

#### Tee Groupings
- **Tee Assignments**: Create configurable tee groups (e.g., "1st Tee", "2nd Tee")
- **Player Pairings**: Assign player pairs to specific tee times and holes
- **Matchup Management**: Create matches between opposing team pairs
- **Starting Hole**: Support for shotgun starts or sequential tee times

#### Schedule Management
- **Daily Schedules**: Configure different formats/matches for each tournament day
- **Tee Time Intervals**: Set customizable tee time spacing
- **Schedule Publishing**: Generate and share tournament schedules with players

### 4. Scoring System

#### Score Entry
- **Mobile-Friendly Entry**: Easy hole-by-hole score input via mobile devices
- **Scorecard View**: Digital representation of traditional scorecards
- **Real-Time Updates**: Instant calculation of standings as scores are entered
- **Score Verification**: Process for score review and confirmation

#### Calculation Engine
- **Handicap Application**: Apply format-specific handicaps to gross scores
- **Net Score Calculation**: Calculate net scores based on handicaps
- **Match Play Logic**: Determine hole winners based on net scores
- **Points System**: Award points for match wins (preserve existing calculation logic)
- **Automatic Totals**: Calculate front nine, back nine, and overall scores

#### Match Results Tracking
- **Hole Results**: Track "Spartan Dawgs", "Invited Guests", or "No Blood" (tie) for each hole
- **Match Points**: Track points earned per match (1 point per win)
- **Team Totals**: Aggregate points across all matches
- **Tournament Leaderboard**: Real-time overall standings

### 5. Historical Data & Gallery

#### Tournament Archive
- **Past Events**: Store complete records of previous tournaments
- **Historical Results**: Searchable archive of past scores and winners
- **Player History**: Individual player performance across multiple events

#### Photo Gallery
- **Year-Based Albums**: Organize photos by tournament year
- **Tagging System**: Tag players, holes, or specific events in photos
- **Upload Interface**: Easy bulk upload for tournament photos
- **Sharing Capabilities**: Share albums or individual photos
- **Comments**: Allow comments on photos for memories and stories
- **Slideshow**: Create slideshows of tournament highlights

### 6. Reporting & Exports

#### Tournament Reports
- **Match Summaries**: Detailed reports for each match
- **Team Standings**: Overall team performance reports
- **Player Statistics**: Individual player stats and performance
- **PDF Generation**: Create printable tournament summaries

#### Data Exports
- **Export to Excel**: Generate spreadsheets for offline analysis
- **Printable Scorecards**: Create printable scorecards with player names, handicaps
- **Results Sharing**: Easy sharing of results via email/social media

## User Roles & Permissions

### Tournament Organizer/Admin
- Full access to all configuration settings
- Create/edit tournaments, players, teams, formats
- Manage user accounts and permissions
- Access to all reports and data

### Team Captain
- View and edit team roster
- Enter scores for team matches
- View all tournament data and results
- Limited configuration abilities

### Player
- View personal schedule, pairings, and tee times
- Enter personal scores (if permitted)
- View tournament results and standings
- Access photo gallery and tournament information

### Spectator/Guest
- View public tournament information
- View published results and standings
- Browse photo gallery (if made public)
- No editing capabilities

## Technical Requirements

### Platform Requirements
- **Web Application**: Responsive design for desktop and mobile access
- **Native Mobile Support**: iOS and Android applications
- **Offline Capability**: Score entry without continuous internet connection
- **Cloud Storage**: Secure data storage with backups
- **API Interface**: For potential integration with other golf systems

### Data Security
- **User Authentication**: Secure login system
- **Role-Based Access**: Permissions based on user role
- **Data Protection**: Compliance with data privacy regulations
- **Backup System**: Regular automated backups of all tournament data

### Integration Capabilities
- **Calendar Integration**: Export schedules to personal calendars
- **Email/SMS Notifications**: Alerts for pairings, tee times, results
- **Social Media Sharing**: Share results and photos to social platforms
- **Weather API**: Integration with weather services for tournament conditions

## User Interface Requirements

### Administrative Dashboard
- Tournament setup wizard
- Player/team management interface
- Format and schedule configuration tools
- Reporting and analytics section

### Mobile Scoring Interface
- Simple, touch-friendly score entry
- Offline capability with sync when connection returns
- Real-time leaderboard updates
- Individual scorecard view

### Player Portal
- Personalized schedule view
- Individual performance stats
- Tournament information and rules
- Photo gallery access

### Public Results Page
- Tournament leaderboard
- Match results and standings
- Schedule of upcoming matches
- Featured photos and highlights

## Development Priorities

### Phase 1: Core Tournament Management
- Tournament configuration
- Player and team management
- Basic scoring system
- Essential reporting

### Phase 2: Enhanced Scoring & Formats
- Full match play scoring logic
- All format types (BB, Scramble, Alternate Shot, Chapman)
- Mobile score entry
- Real-time leaderboard

### Phase 3: Gallery & Historical Data
- Photo gallery implementation
- Tournament archive
- Player history tracking
- Social sharing features

### Phase 4: Advanced Features
- Analytics and statistics
- API integrations
- Enhanced mobile applications
- Weather and course condition integration

## Key Considerations

1. **Flexibility**: The system must maintain the existing scoring logic while making all names, courses, formats, and other variables fully configurable.

2. **Usability**: Score entry must be simple and intuitive, especially from mobile devices during play.

3. **Scalability**: The platform should support tournaments of various sizes, from small friend groups to larger club events.

4. **Historical Integrity**: When migrating existing data, preserve all historical records and ensure consistency with previous spreadsheet calculations.

5. **Offline Functionality**: Many golf courses have limited connectivity; the app must function without continuous internet access.

## Installation and Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- PostgreSQL (v15.0 or higher)

### Getting Started

1. Clone the repository
```bash
git clone <repository-url>
cd gull_lake
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
# Copy the example .env file
cp .env.example .env
# Edit the .env file with your database credentials
```

4. Set up the database
```bash
# Initialize the database
npx prisma migrate dev --name init
# Seed the database with sample data (optional)
npx prisma db seed
```

5. Start the development server
```bash
npm run dev
```

6. Open your browser
```
http://localhost:3000
```

## Key Features
- Tournament creation and management with customizable settings
- Team and player management
- Multiple golf formats (Best Ball, Scramble, Alternate Shot, Chapman)
- Configurable handicap multipliers by format
- Dynamic match scheduling
- Mobile-friendly score entry
- Real-time leaderboard and standings
- Course and hole management
- Results history and archive

## Technology Stack
- **Frontend**: React.js with Next.js, Tailwind CSS
- **Backend**: Node.js with Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Form Management**: React Hook Form with Zod validation
- **State Management**: React Context API and SWR for data fetching

## Development Commands
- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check code style
- `npm run typecheck` - Run TypeScript compiler check