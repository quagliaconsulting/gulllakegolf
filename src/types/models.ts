// Type definitions for database models

// Common types for UI components
export interface SelectOption {
  id: string;
  name: string;
  tournamentId?: string;
}

export interface TeamOption extends SelectOption {
  tournamentId: string;
}

export interface FormatOption {
  id: string;
  formatName: string;
  multiplier: number;
  points?: number;
  halfPoints?: number;
  isFourManTeam?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  year: number;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
  buyIn?: number;
  totalPrize?: number;
  hasCTP?: boolean;
  ctpPrizeAmount?: number;
  hasSkins?: boolean;
  skinsPrizeAmount?: number;
  payoutStructure?: Record<string, number>; // e.g., {"1": 50, "2": 30, "3": 20} for percentages
  createdAt?: Date | string;
  updatedAt?: Date | string;
  teams?: Team[];
  courses?: Course[];
  accommodations?: Accommodation[];
  matches?: Match[];
  schedules?: Schedule[];
  formatMultipliers?: FormatMultiplier[];
  galleryPhotos?: GalleryPhoto[];
  reports?: Report[];
  payments?: PlayerPayment[];
  ctpResults?: CTPResult[];
  skinsResults?: SkinsResult[];
}

export interface Team {
  id: string;
  name: string;
  tournamentId: string;
  metadata?: string; // JSON string containing team metadata like isHomeTeam status
  tournament?: Tournament;
  players?: Player[];
  homeTeam?: Match[];
  awayTeam?: Match[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // Virtual fields not in database but used in UI
  isHomeTeam?: boolean; // Derived from metadata
}

export interface Player {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  handicapIndex: number;
  teamId: string;
  team?: Team;
  accommodationId?: string;
  accommodation?: Accommodation;
  playerPairings?: PlayerPairing[];
  payments?: PlayerPayment[];
  ctpWins?: CTPResult[];
  skinsWins?: SkinsResult[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Course {
  id: string;
  name: string;
  tournamentId: string;
  tournament?: Tournament;
  holes?: Hole[];
  matches?: Match[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Hole {
  id: string;
  number: number;
  par: number;
  handicap: number;
  distance: number;
  isPar3?: boolean;
  courseId: string;
  course?: Course;
  holeResults?: HoleResult[];
  ctpResults?: CTPResult[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Accommodation {
  id: string;
  name: string;
  details?: string;
  tournamentId: string;
  tournament?: Tournament;
  players?: Player[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface FormatMultiplier {
  id: string;
  formatName: string;
  multiplier: number;
  tournamentId: string;
  tournament?: Tournament;
  matches?: Match[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Match {
  id: string;
  tournamentId: string;
  tournament?: Tournament;
  scheduleId: string;
  schedule?: Schedule;
  formatId: string;
  format?: FormatMultiplier;
  homeTeamId: string;
  homeTeam?: Team;
  awayTeamId: string;
  awayTeam?: Team;
  courseId: string;
  course?: Course;
  startingHole: number;
  teeTime: Date | string;
  playerPairings?: PlayerPairing[];
  holeResults?: HoleResult[];
  points?: MatchPoints;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PlayerPairing {
  id: string;
  matchId: string;
  match?: Match;
  playerId: string;
  player?: Player;
  isHomeTeam: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface HoleResult {
  id: string;
  matchId: string;
  match?: Match;
  holeId: string;
  hole?: Hole;
  homeTeamGrossScore?: number;
  awayTeamGrossScore?: number;
  homeTeamNetScore?: number;
  awayTeamNetScore?: number;
  winnerTeamId?: string;
  isSkin?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MatchPoints {
  id: string;
  matchId: string;
  match?: Match;
  homeTeamPoints: number;
  awayTeamPoints: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Schedule {
  id: string;
  tournamentId: string;
  tournament?: Tournament;
  day: number;
  date: Date | string;
  matches?: Match[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface GalleryPhoto {
  id: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  description?: string;
  tags?: string;
  year: number;
  tournamentId: string;
  tournament?: Tournament;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  filePath: string;
  fileUrl: string;
  tournamentId: string;
  tournament?: Tournament;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  TEAM_CAPTAIN = 'TEAM_CAPTAIN',
  PLAYER = 'PLAYER',
  SPECTATOR = 'SPECTATOR'
}

// Financial and Competition Tracking Models

export enum PaymentType {
  BUY_IN = 'BUY_IN',
  CTP_ENTRY = 'CTP_ENTRY',
  SKINS_ENTRY = 'SKINS_ENTRY',
  PRIZE_PAYOUT = 'PRIZE_PAYOUT',
  CTP_PAYOUT = 'CTP_PAYOUT',
  SKINS_PAYOUT = 'SKINS_PAYOUT',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  RECEIVED = 'RECEIVED',
  REFUNDED = 'REFUNDED'
}

export interface PlayerPayment {
  id: string;
  tournamentId: string;
  tournament?: Tournament;
  playerId: string;
  player?: Player;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  notes?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CTPResult {
  id: string;
  tournamentId: string;
  tournament?: Tournament;
  holeId: string;
  hole?: Hole;
  playerId: string;
  player?: Player;
  distance?: number; // Distance in feet/inches from the hole
  round: number;
  prize?: number;
  paid: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SkinsResult {
  id: string;
  tournamentId: string;
  tournament?: Tournament;
  playerId: string;
  player?: Player;
  matchId?: string;
  holeNumber: number;
  score: number;
  prize?: number;
  paid: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}