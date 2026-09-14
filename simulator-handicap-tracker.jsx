import { useState, useEffect } from "react";

const PAR = 72;

function calcDifferential(score, par = PAR) {
  return score - par;
}

function calcHandicap(rounds) {
  if (rounds.length === 0) return null;
  // Use best differentials: up to 8 of last 20
  const last20 = rounds.slice(-20);
  const diffs = last20.map((r) => r.score - PAR).sort((a, b) => a - b);
  const count = Math.min(diffs.length, 8);
  const best = diffs.slice(0, count);
  const avg = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

const STORAGE_KEY = "sim-golf-handicap-players";

function loadPlayers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function savePlayers(players) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

// ── Modal ──────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{title}</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Player Card ────────────────────────────────────────────────────────────
function PlayerCard({ player, onAddRound, onDelete }) {
  const handicap = calcHandicap(player.rounds);
  const lastRound = player.rounds[player.rounds.length - 1];
  const trend = player.rounds.length >= 2
    ? calcHandicap(player.rounds) - calcHandicap(player.rounds.slice(0, -1))
    : null;

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div>
          <div style={styles.playerName}>{player.name}</div>
          <div style={styles.roundCount}>{player.rounds.length} round{player.rounds.length !== 1 ? "s" : ""} logged</div>
        </div>
        <div style={styles.hcpBlock}>
          <div style={styles.hcpNumber}>
            {handicap !== null ? (handicap >= 0 ? `+${handicap}` : handicap) : `+${player.startingHandicap}`}
          </div>
          <div style={styles.hcpLabel}>handicap</div>
          {trend !== null && (
            <div style={{ ...styles.trend, color: trend <= 0 ? "#4caf84" : "#e07070" }}>
              {trend <= 0 ? "▼" : "▲"} {Math.abs(Math.round(trend * 10) / 10)}
            </div>
          )}
        </div>
      </div>

      {lastRound && (
        <div style={styles.lastRound}>
          Last round: <strong>{lastRound.score}</strong>
          <span style={styles.lastDate}> · {lastRound.date}</span>
          <span style={{ color: lastRound.score - PAR >= 0 ? "#e07070" : "#4caf84", marginLeft: 6 }}>
            ({lastRound.score - PAR >= 0 ? "+" : ""}{lastRound.score - PAR})
          </span>
        </div>
      )}

      {player.rounds.length > 1 && (
        <div style={styles.miniChart}>
          {player.rounds.slice(-8).map((r, i) => {
            const diff = r.score - PAR;
            const norm = Math.min(Math.max((diff + 20) / 40, 0), 1);
            return (
              <div key={i} style={styles.barWrap}>
                <div style={{ ...styles.bar, height: `${Math.round(norm * 40) + 4}px`, background: diff <= 0 ? "#4caf84" : "#7b9fd4" }} />
                <div style={styles.barLabel}>{r.score}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.cardActions}>
        <button style={styles.addRoundBtn} onClick={() => onAddRound(player)}>+ Add Round</button>
        <button style={styles.deleteBtn} onClick={() => onDelete(player.id)}>Remove</button>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [players, setPlayers] = useState(loadPlayers);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddRound, setShowAddRound] = useState(null); // player object
  const [showHistory, setShowHistory] = useState(null);

  // Add Player form
  const [newName, setNewName] = useState("");
  const [newHcp, setNewHcp] = useState("");

  // Add Round form
  const [roundScore, setRoundScore] = useState("");
  const [roundDate, setRoundDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => savePlayers(players), [players]);

  function handleAddPlayer() {
    const hcp = parseFloat(newHcp);
    if (!newName.trim() || isNaN(hcp)) return;
    const player = {
      id: Date.now(),
      name: newName.trim(),
      startingHandicap: hcp,
      rounds: [],
    };
    setPlayers((prev) => [...prev, player]);
    setNewName("");
    setNewHcp("");
    setShowAddPlayer(false);
  }

  function handleAddRound() {
    const score = parseInt(roundScore);
    if (isNaN(score) || score < 40 || score > 150) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === showAddRound.id
          ? { ...p, rounds: [...p.rounds, { score, date: roundDate }] }
          : p
      )
    );
    setRoundScore("");
    setRoundDate(new Date().toISOString().slice(0, 10));
    setShowAddRound(null);
  }

  function handleDelete(id) {
    if (!confirm("Remove this player?")) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  const sorted = [...players].sort((a, b) => {
    const ha = calcHandicap(a.rounds) ?? a.startingHandicap;
    const hb = calcHandicap(b.rounds) ?? b.startingHandicap;
    return ha - hb;
  });

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>⛳</div>
          <div>
            <div style={styles.appTitle}>Sim Handicaps</div>
            <div style={styles.appSub}>Simulator · Par {PAR}</div>
          </div>
        </div>
        <button style={styles.primaryBtn} onClick={() => setShowAddPlayer(true)}>
          + Player
        </button>
      </div>

      {/* Leaderboard strip */}
      {players.length > 1 && (
        <div style={styles.leaderStrip}>
          <div style={styles.leaderLabel}>Leaderboard</div>
          {sorted.map((p, i) => {
            const hcp = calcHandicap(p.rounds) ?? p.startingHandicap;
            return (
              <div key={p.id} style={styles.leaderRow}>
                <span style={styles.leaderRank}>{i + 1}</span>
                <span style={styles.leaderName}>{p.name}</span>
                <span style={styles.leaderHcp}>{hcp >= 0 ? `+${hcp}` : hcp}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cards */}
      <div style={styles.cardGrid}>
        {players.length === 0 ? (
          <div style={styles.empty}>
            No players yet. Add someone to start tracking.
          </div>
        ) : (
          players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              onAddRound={setShowAddRound}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Add Player Modal */}
      {showAddPlayer && (
        <Modal title="Add Player" onClose={() => setShowAddPlayer(false)}>
          <div style={styles.formBody}>
            <label style={styles.label}>Name</label>
            <input
              style={styles.input}
              placeholder="Player name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <label style={styles.label}>Starting Handicap</label>
            <input
              style={styles.input}
              placeholder="e.g. 12 or -2"
              type="number"
              value={newHcp}
              onChange={(e) => setNewHcp(e.target.value)}
            />
            <div style={styles.hcpHint}>
              Positive = strokes over par &nbsp;·&nbsp; Negative = scratch/plus
            </div>
            <button
              style={{ ...styles.primaryBtn, width: "100%", marginTop: 8 }}
              onClick={handleAddPlayer}
            >
              Add Player
            </button>
          </div>
        </Modal>
      )}

      {/* Add Round Modal */}
      {showAddRound && (
        <Modal title={`Add Round — ${showAddRound.name}`} onClose={() => setShowAddRound(null)}>
          <div style={styles.formBody}>
            <label style={styles.label}>Score (gross)</label>
            <input
              style={styles.input}
              placeholder="e.g. 78"
              type="number"
              value={roundScore}
              onChange={(e) => setRoundScore(e.target.value)}
              autoFocus
            />
            <div style={styles.hcpHint}>Par is {PAR} · enter your total strokes</div>
            <label style={styles.label}>Date</label>
            <input
              style={styles.input}
              type="date"
              value={roundDate}
              onChange={(e) => setRoundDate(e.target.value)}
            />
            {roundScore && !isNaN(parseInt(roundScore)) && (
              <div style={styles.diffPreview}>
                Differential: {parseInt(roundScore) - PAR >= 0 ? "+" : ""}
                {parseInt(roundScore) - PAR}
              </div>
            )}
            <button
              style={{ ...styles.primaryBtn, width: "100%", marginTop: 8 }}
              onClick={handleAddRound}
            >
              Save Round
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0f1a14",
    color: "#e8ede9",
    fontFamily: "'Georgia', serif",
    paddingBottom: 48,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 16px",
    borderBottom: "1px solid #1e3028",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  logo: { fontSize: 28 },
  appTitle: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px", color: "#e8ede9" },
  appSub: { fontSize: 12, color: "#6a9b7e", marginTop: 1 },
  primaryBtn: {
    background: "#2e7d52",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  leaderStrip: {
    background: "#141f18",
    borderBottom: "1px solid #1e3028",
    padding: "12px 20px",
  },
  leaderLabel: { fontSize: 11, color: "#6a9b7e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  leaderRow: { display: "flex", alignItems: "center", gap: 10, padding: "4px 0" },
  leaderRank: { fontSize: 12, color: "#6a9b7e", width: 16 },
  leaderName: { fontSize: 14, flex: 1 },
  leaderHcp: { fontSize: 14, fontWeight: 700, color: "#b8d4bf" },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
    padding: 20,
  },
  card: {
    background: "#141f18",
    border: "1px solid #1e3028",
    borderRadius: 12,
    padding: 20,
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  playerName: { fontSize: 18, fontWeight: 700, color: "#e8ede9" },
  roundCount: { fontSize: 12, color: "#6a9b7e", marginTop: 2 },
  hcpBlock: { textAlign: "right" },
  hcpNumber: { fontSize: 32, fontWeight: 700, color: "#b8d4bf", lineHeight: 1 },
  hcpLabel: { fontSize: 11, color: "#6a9b7e", textTransform: "uppercase", letterSpacing: 0.8 },
  trend: { fontSize: 12, marginTop: 2 },
  lastRound: { fontSize: 13, color: "#a0baa8", marginBottom: 12 },
  lastDate: { color: "#6a9b7e" },
  miniChart: { display: "flex", alignItems: "flex-end", gap: 4, height: 52, marginBottom: 14 },
  barWrap: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
  bar: { width: "100%", borderRadius: 2, transition: "height 0.3s" },
  barLabel: { fontSize: 9, color: "#6a9b7e", marginTop: 2 },
  cardActions: { display: "flex", gap: 8, marginTop: 4 },
  addRoundBtn: {
    flex: 1,
    background: "#2e7d52",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 0",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  deleteBtn: {
    background: "transparent",
    color: "#6a9b7e",
    border: "1px solid #1e3028",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  empty: {
    gridColumn: "1/-1",
    textAlign: "center",
    color: "#6a9b7e",
    padding: "60px 0",
    fontSize: 15,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modal: {
    background: "#141f18",
    border: "1px solid #1e3028",
    borderRadius: 14,
    width: 340,
    maxWidth: "90vw",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px 12px",
    borderBottom: "1px solid #1e3028",
  },
  modalTitle: { fontSize: 16, fontWeight: 700 },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#6a9b7e",
    fontSize: 16,
    cursor: "pointer",
  },
  formBody: { padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#6a9b7e", marginBottom: 2 },
  input: {
    background: "#0f1a14",
    border: "1px solid #2a3f30",
    borderRadius: 8,
    color: "#e8ede9",
    padding: "10px 12px",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  hcpHint: { fontSize: 11, color: "#6a9b7e", marginTop: 2 },
  diffPreview: {
    background: "#0f1a14",
    border: "1px solid #2a3f30",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "#b8d4bf",
    textAlign: "center",
  },
};
