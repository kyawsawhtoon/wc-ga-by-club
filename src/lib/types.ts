export interface Player {
  id: number;
  name: string;
  nationality: string;
  position: string | null;
  shirtNumber: number | null;
  dateOfBirth: string;
  section: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface PlayerStats {
  player: Player;
  team: Team;           // club team (one of the 5)
  playedMatches: number;
  goals: number;
  assists: number;
  penalties: number;
  goalContributions: number;
  nationalTeam: string;
}

export interface WCScorer {
  player: { id: number; name: string; nationality: string };
  nationalTeam: string;
  club: Team | null;    // null if not from one of the 5 clubs
  goals: number;
  assists: number;
  goalContributions: number;
  playedMatches: number;
}

export interface ClubStats {
  team: Team;
  totalGoals: number;
  totalAssists: number;
  totalContributions: number;
  players: PlayerStats[];
}
