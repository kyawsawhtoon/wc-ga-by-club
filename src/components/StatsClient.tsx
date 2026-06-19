"use client";

import { useState, useMemo, useEffect } from "react";
import type { PlayerStats, ClubStats } from "@/lib/types";

type SortKey = "goals" | "assists" | "goalContributions";
type View = "leaderboard" | "clubs";

interface ManualPlayer {
  name: string;
  clubId: number;
  nationalTeam: string;
  assists: number;
}

const STORAGE_KEY = "wc2026-manual-assists-v1";

// ─── helpers ─────────────────────────────────────────────────────────────────

function ClubCrest({ src, name, size = 28 }: { src: string; name: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className="object-contain flex-shrink-0" style={{ width: size, height: size }} />
  );
}

function StatBadge({ value, color }: { value: number; color: string }) {
  return (
    <span className={`inline-block min-w-[2rem] rounded-lg px-2 py-0.5 text-center text-sm font-bold ${color}`}>
      {value}
    </span>
  );
}

// ─── Add-player modal ─────────────────────────────────────────────────────────

function AddPlayerModal({
  clubs,
  onAdd,
  onClose,
}: {
  clubs: ClubStats[];
  onAdd: (p: ManualPlayer) => void;
  onClose: () => void;
}) {
  const [name, setName]           = useState("");
  const [clubId, setClubId]       = useState(clubs[0]?.team.id ?? 57);
  const [national, setNational]   = useState("");
  const [assists, setAssists]     = useState(1);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !national.trim()) return;
    onAdd({ name: name.trim(), clubId, nationalTeam: national.trim(), assists });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-lg font-black text-gray-900">Add assist-only player</h2>
        <p className="mb-5 text-xs text-gray-400">
          Use this for WC players who have assists but no goals (the API only tracks scorers).
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Player name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bukayo Saka"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Club</label>
            <select
              value={clubId}
              onChange={(e) => setClubId(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
            >
              {clubs.map((c) => (
                <option key={c.team.id} value={c.team.id}>{c.team.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">National team</label>
            <input
              value={national}
              onChange={(e) => setNational(e.target.value)}
              placeholder="e.g. England"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Assists</label>
            <input
              type="number"
              min={1}
              max={20}
              value={assists}
              onChange={(e) => setAssists(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #003DA5, #C41E3A)" }}
          >
            Add player
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function SortTh({
  label,
  active,
  color,
  onClick,
  align = "center",
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  align?: "left" | "center";
}) {
  return (
    <th
      onClick={onClick}
      className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${
        align === "center" ? "text-center" : "text-left"
      } ${active ? color : "text-gray-400 hover:text-gray-600"}`}
    >
      {label}
      <span className="ml-1 opacity-60">{active ? "▼" : "⇅"}</span>
    </th>
  );
}

function LeaderboardView({ players }: { players: PlayerStats[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("goals");

  const sorted = useMemo(
    () => [...players].sort((a, b) => (b[sortKey] - a[sortKey]) || b.goals - a.goals || b.assists - a.assists),
    [players, sortKey]
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">#</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Player</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Country</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Club</th>
              <SortTh label="Goals"   active={sortKey === "goals"}             color="text-emerald-600" onClick={() => setSortKey("goals")} />
              <SortTh label="Assists" active={sortKey === "assists"}           color="text-blue-600"    onClick={() => setSortKey("assists")} />
              <SortTh label="G+A"     active={sortKey === "goalContributions"} color="text-violet-600"  onClick={() => setSortKey("goalContributions")} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.player.id} className="border-b border-gray-50 transition-colors hover:bg-blue-50/30">
                <td className="px-5 py-3.5">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-gray-300 text-gray-700" :
                    i === 2 ? "bg-orange-300 text-orange-800" :
                    "text-gray-400"
                  }`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{p.player.name}</td>
                <td className="px-5 py-3.5 text-gray-500">{p.nationalTeam}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <ClubCrest src={p.team.crest} name={p.team.name} size={24} />
                    <span className="hidden sm:inline text-gray-600 text-sm">{p.team.shortName}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatBadge value={p.goals}             color="bg-emerald-50 text-emerald-700" />
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatBadge value={p.assists}           color="bg-blue-50 text-blue-700" />
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatBadge value={p.goalContributions} color="bg-violet-50 text-violet-700" />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">No players yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-right text-xs text-gray-400">{sorted.length} players</p>
    </div>
  );
}

// ─── Club Leaderboard ─────────────────────────────────────────────────────────

function ClubsView({
  clubs,
  onAddPlayer,
  onRemoveManual,
}: {
  clubs: ClubStats[];
  onAddPlayer: () => void;
  onRemoveManual: (name: string, clubId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<"totalGoals" | "totalAssists" | "totalContributions">("totalGoals");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...clubs].sort((a, b) => b[sortKey] - a[sortKey] || b.totalGoals - a.totalGoals),
    [clubs, sortKey]
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">#</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Club</th>
              <SortTh label="Goals"   active={sortKey === "totalGoals"}         color="text-emerald-600" onClick={() => setSortKey("totalGoals")} />
              <SortTh label="Assists" active={sortKey === "totalAssists"}       color="text-blue-600"    onClick={() => setSortKey("totalAssists")} />
              <SortTh label="G+A"     active={sortKey === "totalContributions"} color="text-violet-600"  onClick={() => setSortKey("totalContributions")} />
              <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">Players</th>
              <th className="px-5 py-3.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((club, i) => (
              <>
                <tr
                  key={club.team.id}
                  onClick={() => setExpandedId(expandedId === club.team.id ? null : club.team.id)}
                  className="border-b border-gray-50 cursor-pointer transition-colors hover:bg-blue-50/30"
                >
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-yellow-400 text-yellow-900" :
                      i === 1 ? "bg-gray-300 text-gray-700" :
                      i === 2 ? "bg-orange-300 text-orange-800" :
                      "text-gray-400"
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ClubCrest src={club.team.crest} name={club.team.name} size={20} />
                      <span className="font-semibold text-gray-900">{club.team.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <StatBadge value={club.totalGoals}         color="bg-emerald-50 text-emerald-700" />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <StatBadge value={club.totalAssists}       color="bg-blue-50 text-blue-700" />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <StatBadge value={club.totalContributions} color="bg-violet-50 text-violet-700" />
                  </td>
                  <td className="px-5 py-3.5 text-center text-gray-400 text-sm">
                    {club.players.length || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-gray-300 text-xs text-right">
                    {club.players.length > 0 ? (expandedId === club.team.id ? "▲" : "▼") : ""}
                  </td>
                </tr>

                {expandedId === club.team.id && club.players.length > 0 && (
                  <tr key={`${club.team.id}-expand`} className="border-b border-gray-100 bg-gray-50/50">
                    <td colSpan={7} className="px-8 py-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="pb-2 text-left font-semibold">Player</th>
                            <th className="pb-2 text-left font-semibold">Country</th>
                            <th className="pb-2 text-center font-semibold text-emerald-600">G</th>
                            <th className="pb-2 text-center font-semibold text-blue-600">A</th>
                            <th className="pb-2 text-center font-semibold text-violet-600">G+A</th>
                            <th className="pb-2 w-4" />
                          </tr>
                        </thead>
                        <tbody>
                          {[...club.players]
                            .sort((a, b) => b.goalContributions - a.goalContributions || b.goals - a.goals)
                            .map((p) => (
                              <tr key={p.player.id} className="border-t border-gray-100 group">
                                <td className="py-1.5 font-medium text-gray-700">{p.player.name}</td>
                                <td className="py-1.5 text-gray-400">{p.nationalTeam}</td>
                                <td className="py-1.5 text-center font-bold text-emerald-600">{p.goals}</td>
                                <td className="py-1.5 text-center font-bold text-blue-600">{p.assists}</td>
                                <td className="py-1.5 text-center font-bold text-violet-600">{p.goalContributions}</td>
                                <td className="py-1.5 text-right">
                                  {p.player.id < 0 && (
                                    <button
                                      onClick={() => onRemoveManual(p.player.name, club.team.id)}
                                      className="hidden group-hover:inline text-gray-300 hover:text-red-400"
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onAddPlayer}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-400 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Add assist-only player
        </button>
        <span className="text-xs text-gray-400">For players who only assisted (API limitation)</span>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function StatsClient({ clubs }: { clubs: ClubStats[] }) {
  const [view, setView]           = useState<View>("leaderboard");
  const [showModal, setShowModal] = useState(false);
  const [manualPlayers, setManualPlayers] = useState<ManualPlayer[]>([]);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setManualPlayers(JSON.parse(raw) as ManualPlayer[]);
    } catch { /* ignore */ }
  }, []);

  const saveManual = (updated: ManualPlayer[]) => {
    setManualPlayers(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const addPlayer = (p: ManualPlayer) => saveManual([...manualPlayers, p]);

  const removePlayer = (name: string, clubId: number) =>
    saveManual(manualPlayers.filter((p) => !(p.name === name && p.clubId === clubId)));

  // Merge manual players into club stats
  const enrichedClubs = useMemo<ClubStats[]>(() => {
    return clubs.map((club) => {
      const extras = manualPlayers.filter((p) => p.clubId === club.team.id);
      if (extras.length === 0) return club;

      const extraStats: PlayerStats[] = extras.map((p, i) => ({
        player: {
          id: -(club.team.id * 1000 + i + 1),
          name: p.name,
          nationality: p.nationalTeam,
          position: null,
          shirtNumber: null,
          dateOfBirth: "",
          section: "",
        },
        team: club.team,
        playedMatches: 0,
        goals: 0,
        assists: p.assists,
        penalties: 0,
        goalContributions: p.assists,
        nationalTeam: p.nationalTeam,
      }));

      return {
        ...club,
        totalAssists:      club.totalAssists      + extras.reduce((s, p) => s + p.assists, 0),
        totalContributions: club.totalContributions + extras.reduce((s, p) => s + p.assists, 0),
        players: [...club.players, ...extraStats],
      };
    });
  }, [clubs, manualPlayers]);

  const allPlayers = useMemo(() => enrichedClubs.flatMap((c) => c.players), [enrichedClubs]);

  // Summary badges for the header area
  const totalManual = manualPlayers.length;

  return (
    <div>
      {/* View tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm p-1 shadow-sm w-fit">
        {(["leaderboard", "clubs"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              view === v ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            style={view === v ? { background: "linear-gradient(135deg,#003DA5,#C41E3A)" } : {}}
          >
            {v === "leaderboard" ? "🏅 Leaderboard" : "🏟️ By Club"}
          </button>
        ))}
      </div>

      {totalManual > 0 && view === "leaderboard" && (
        <p className="mb-3 text-xs text-gray-400">
          Includes {totalManual} manually-added assist-only player{totalManual !== 1 ? "s" : ""}.{" "}
          <button className="underline hover:text-gray-600" onClick={() => setView("clubs")}>
            Manage in By Club view
          </button>
        </p>
      )}

      {view === "leaderboard" ? (
        <LeaderboardView players={allPlayers} />
      ) : (
        <ClubsView
          clubs={enrichedClubs}
          onAddPlayer={() => setShowModal(true)}
          onRemoveManual={removePlayer}
        />
      )}

      {showModal && (
        <AddPlayerModal
          clubs={clubs}
          onAdd={addPlayer}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
