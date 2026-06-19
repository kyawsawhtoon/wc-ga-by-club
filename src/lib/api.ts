import type { PlayerStats, ClubStats, Team } from "./types";

// ─── football-data.org (club rosters only) ───────────────────────────────────

const FD_BASE = "https://api.football-data.org/v4";
const API_KEY  = process.env.FOOTBALL_DATA_API_KEY ?? "";

async function fdFetch<T>(path: string, revalidate = 86400): Promise<T> {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── ESPN public API (WC match events — no auth required) ────────────────────

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD";

async function espnFetch<T>(path: string, revalidate = 1800): Promise<T> {
  const res = await fetch(`${ESPN_BASE}${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`ESPN API ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────────────────────

// All 20 EPL clubs — no filter applied

interface PLTeamsResponse {
  teams: Array<{
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
    squad: Array<{ id: number; name: string }>;
  }>;
}

interface ESPNScoreboard {
  events?: Array<{
    id: string;
    competitions?: Array<{
      status?: { type?: { name?: string } };
    }>;
  }>;
}

interface ESPNSummary {
  keyEvents?: Array<{
    scoringPlay?: boolean;
    shootout?: boolean;
    type?: { type?: string };
    team?: { displayName?: string };
    participants?: Array<{ athlete?: { displayName?: string } }>;
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s'-]/g, "")
    .trim();
}

/** Every date YYYYMMDD from WC start up to today */
function wcDatesUpToToday(): string[] {
  const dates: string[] = [];
  const start = new Date("2026-06-11T00:00:00Z");
  const today = new Date();
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return dates;
}

// ─── Core data fetch ─────────────────────────────────────────────────────────

export interface WCData {
  clubs: ClubStats[];
}

export async function getWCData(): Promise<WCData> {
  // 1. Club rosters from football-data.org (cached 24 h)
  const plTeams = await fdFetch<PLTeamsResponse>("/competitions/PL/teams?season=2025");

  // Build name → club map (normalized)
  const nameToClub = new Map<string, Team>();
  const clubTeams  = new Map<number, Team>();

  for (const t of plTeams.teams) {
    const club: Team = { id: t.id, name: t.name, shortName: t.shortName, tla: t.tla, crest: t.crest };
    clubTeams.set(t.id, club);
    for (const p of t.squad ?? []) {
      nameToClub.set(normalizeName(p.name), club);
    }
  }

  // 2. Get all finished WC match IDs from ESPN
  const dates = wcDatesUpToToday();
  const scoreboardResults = await Promise.allSettled(
    dates.map((d) => espnFetch<ESPNScoreboard>(`/scoreboard?dates=${d}`, 86400))
  );

  const finishedIds: string[] = [];
  for (const r of scoreboardResults) {
    if (r.status !== "fulfilled") continue;
    for (const ev of r.value.events ?? []) {
      const status = ev.competitions?.[0]?.status?.type?.name ?? "";
      if (status === "STATUS_FULL_TIME" || status === "STATUS_FINAL") {
        finishedIds.push(ev.id);
      }
    }
  }
  const uniqueIds = [...new Set(finishedIds)];

  // 3. Fetch all match summaries in parallel (cached per match indefinitely once finished)
  const summaryResults = await Promise.allSettled(
    uniqueIds.map((id) => espnFetch<ESPNSummary>(`/summary?event=${id}`, 86400))
  );

  // 4. Accumulate goals + assists per player (by normalized name + national team)
  interface PlayerAccum {
    displayName: string;
    nationalTeam: string;
    goals: number;
    assists: number;
  }
  const playerMap = new Map<string, PlayerAccum>();

  const accumulate = (displayName: string | undefined, nationalTeam: string | undefined, type: "goal" | "assist") => {
    if (!displayName) return;
    const key = normalizeName(displayName);
    const existing = playerMap.get(key) ?? { displayName, nationalTeam: nationalTeam ?? "", goals: 0, assists: 0 };
    if (type === "goal") existing.goals++;
    else existing.assists++;
    playerMap.set(key, existing);
  };

  for (const r of summaryResults) {
    if (r.status !== "fulfilled") continue;
    for (const ke of r.value.keyEvents ?? []) {
      if (!ke.scoringPlay || ke.shootout) continue;
      // Own goals have type "own-goal" — skip for attribution
      if (ke.type?.type === "own-goal") continue;

      const team = ke.team?.displayName;
      const pts  = ke.participants ?? [];
      accumulate(pts[0]?.athlete?.displayName, team, "goal");
      accumulate(pts[1]?.athlete?.displayName, team, "assist");
    }
  }

  // 5. Match players to clubs and build ClubStats
  const clubMap = new Map<number, ClubStats>();
  for (const [id, team] of clubTeams) {
    clubMap.set(id, { team, totalGoals: 0, totalAssists: 0, totalContributions: 0, players: [] });
  }

  let playerIdSeq = 1;
  for (const [normName, accum] of playerMap) {
    const club = nameToClub.get(normName);
    if (!club) continue;
    if (accum.goals === 0 && accum.assists === 0) continue;

    const ps: PlayerStats = {
      player: {
        id: playerIdSeq++,
        name: accum.displayName,
        nationality: accum.nationalTeam,
        position: null,
        shirtNumber: null,
        dateOfBirth: "",
        section: "",
      },
      team: club,
      playedMatches: 0,
      goals: accum.goals,
      assists: accum.assists,
      penalties: 0,
      goalContributions: accum.goals + accum.assists,
      nationalTeam: accum.nationalTeam,
    };

    const cs = clubMap.get(club.id)!;
    cs.totalGoals        += accum.goals;
    cs.totalAssists      += accum.assists;
    cs.totalContributions += accum.goals + accum.assists;
    cs.players.push(ps);
  }

  const clubs = Array.from(clubMap.values()).sort((a, b) => b.totalGoals - a.totalGoals);
  return { clubs };
}
