import { getWCData } from "@/lib/api";
import StatsClient from "@/components/StatsClient";

export const revalidate = 1800;

export default async function HomePage() {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">⚽</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">API Key Required</h1>
        <p className="mb-6 max-w-md text-gray-500">
          Add your football-data.org key to{" "}
          <code className="rounded bg-gray-100 px-1 text-sm">.env.local</code>.
        </p>
      </div>
    );
  }

  let data;
  try {
    data = await getWCData();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Failed to load stats</h1>
        <p className="text-gray-500">{message}</p>
      </div>
    );
  }

  const { clubs } = data;
  const clubPlayers = clubs.flatMap((c) => c.players);
  const totalGoals   = clubs.reduce((s, c) => s + c.totalGoals, 0);
  const totalAssists = clubs.reduce((s, c) => s + c.totalAssists, 0);

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-3xl font-black text-gray-900">⚽ WC 2026 Club Tracker</h1>
        <p className="mt-1 text-gray-500">
          All 20 EPL clubs · {clubPlayers.length} players contributed
        </p>
      </div>

      <div className="mb-8 mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/60" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
          <div className="text-4xl font-black">{totalGoals}</div>
          <div className="mt-1 text-sm font-semibold text-emerald-100">Total Goals</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg shadow-blue-200/60" style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
          <div className="text-4xl font-black">{totalAssists}</div>
          <div className="mt-1 text-sm font-semibold text-blue-100">Total Assists</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg shadow-violet-200/60" style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
          <div className="text-4xl font-black">{clubPlayers.length}</div>
          <div className="mt-1 text-sm font-semibold text-violet-100">Players Contributed</div>
        </div>
      </div>

      <StatsClient clubs={clubs} />
    </div>
  );
}
