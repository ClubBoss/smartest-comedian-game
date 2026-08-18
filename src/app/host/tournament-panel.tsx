"use client";

import type { LobbyState, TournamentMemberState, TournamentStage } from "@/domain/lobby";
import { resolveTopTwo } from "@/domain/tournament";
import { useMemo, useState } from "react";

type Props = {
  lobby: LobbyState;
  hostToken: string;
  onRefresh: () => Promise<unknown>;
  gameMode: boolean;
};

function stageLabel(stage: TournamentStage) {
  if (stage === "qualifier_a") return "Qualifier A";
  if (stage === "qualifier_b") return "Qualifier B";
  if (stage === "final") return "Final Four";
  return "Complete";
}

function playerName(lobby: LobbyState, playerId: string) {
  return lobby.players.find((player) => player.id === playerId)?.displayName ?? "Unknown player";
}

function sortMembers(members: TournamentMemberState[]) {
  return [...members].sort((left, right) => right.score - left.score || left.seedOrder - right.seedOrder);
}

export function TournamentPanel({ lobby, hostToken, onRefresh, gameMode }: Props) {
  const [groupAIds, setGroupAIds] = useState<string[] | null>(null);
  const [selectedAdvancers, setSelectedAdvancers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advanceArmed, setAdvanceArmed] = useState(false);

  const allPlayerIds = useMemo(() => lobby.players.map((player) => player.id), [lobby.players]);
  const defaultGroupAIds = allPlayerIds.slice(0, 4);
  const effectiveGroupAIds = (groupAIds ?? defaultGroupAIds).filter((id) => allPlayerIds.includes(id));
  const groupBIds = allPlayerIds.filter((id) => !effectiveGroupAIds.includes(id));

  async function postTournament(path: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${lobby.code}/tournament/${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-token": hostToken,
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Tournament action failed.");
      await onRefresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tournament action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function shuffleGroups() {
    const shuffled = [...allPlayerIds];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    setGroupAIds(shuffled.slice(0, 4));
  }

  function toggleGroupA(playerId: string) {
    const current = [...effectiveGroupAIds];
    if (current.includes(playerId)) {
      setGroupAIds(current.filter((id) => id !== playerId));
      return;
    }
    if (current.length >= 4) return;
    setGroupAIds([...current, playerId]);
  }

  async function startTournament() {
    if (effectiveGroupAIds.length !== 4 || groupBIds.length !== 4) return;
    const ok = await postTournament("start", {
      groupAPlayerIds: effectiveGroupAIds,
      groupBPlayerIds: groupBIds,
    });
    if (ok) {
      setSelectedAdvancers([]);
      setAdvanceArmed(false);
    }
  }

  const tournament = lobby.tournament;
  if (!tournament) {
    if (gameMode) return null;
    return (
      <section className="card stack" aria-label="Tournament Night setup">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Tournament Night</p>
            <h2>League 8</h2>
            <p className="muted compact">Two groups of four. Top 2 from each group advance to a fresh-score Final Four.</p>
          </div>
          <span className="status-pill">8 PLAYERS</span>
        </div>

        {lobby.playerCount !== 8 ? (
          <p className="muted">Join exactly 8 active players to enable this preset. Current: {lobby.playerCount}/8.</p>
        ) : (
          <>
            <div className="host-actions">
              <button className="secondary" disabled={busy} onClick={shuffleGroups}>Shuffle 4 + 4</button>
            </div>
            <div className="tournament-group-picker">
              {lobby.players.map((player) => {
                const inA = effectiveGroupAIds.includes(player.id);
                return (
                  <label className={`tournament-player-pick ${inA ? "group-a" : "group-b"}`} key={player.id}>
                    <input
                      type="checkbox"
                      checked={inA}
                      onChange={() => toggleGroupA(player.id)}
                      disabled={!inA && effectiveGroupAIds.length >= 4}
                    />
                    <strong>{player.displayName}</strong>
                    <span>{inA ? "A" : "B"}</span>
                  </label>
                );
              })}
            </div>
            <div className="lobby-grid">
              <div className="card compact-card"><p className="eyebrow">Group A</p><strong>{effectiveGroupAIds.map((id) => playerName(lobby, id)).join(" · ") || "Choose 4 players"}</strong></div>
              <div className="card compact-card"><p className="eyebrow">Group B</p><strong>{groupBIds.map((id) => playerName(lobby, id)).join(" · ")}</strong></div>
            </div>
            <button className="primary" disabled={busy || effectiveGroupAIds.length !== 4 || groupBIds.length !== 4} onClick={() => void startTournament()}>
              {busy ? "Starting..." : "Start Tournament Night"}
            </button>
          </>
        )}
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  const activeTournament = tournament;
  const currentStage = activeTournament.currentStage;
  const activeMembers = currentStage === "complete"
    ? []
    : sortMembers(activeTournament.members.filter((member) => member.stage === currentStage));
  const qualifierResolution = currentStage === "qualifier_a" || currentStage === "qualifier_b"
    ? activeMembers.length === 4
      ? resolveTopTwo(activeMembers.map((member) => ({
        playerId: member.playerId,
        score: member.score,
        seedOrder: member.seedOrder,
      })))
      : null
    : null;
  const clearSuggestedIds = qualifierResolution && qualifierResolution.tieBreakPlayerIds.length === 0
    ? qualifierResolution.automaticQualifierIds
    : [];
  const hasCutoffTie = Boolean(qualifierResolution?.tieBreakPlayerIds.length);
  const transitionBlocked = Boolean(lobby.question || lobby.buzz);

  function toggleAdvancer(playerId: string) {
    setAdvanceArmed(false);
    setSelectedAdvancers((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 2) return current;
      return [...current, playerId];
    });
  }

  async function advanceQualifier() {
    if ((currentStage !== "qualifier_a" && currentStage !== "qualifier_b") || selectedAdvancers.length !== 2 || transitionBlocked) return;
    if (!advanceArmed) {
      setAdvanceArmed(true);
      return;
    }
    const ok = await postTournament("advance", {
      tournamentId: activeTournament.id,
      stage: currentStage,
      advancingPlayerIds: selectedAdvancers,
    });
    if (ok) {
      setSelectedAdvancers([]);
      setAdvanceArmed(false);
    }
  }

  return (
    <section className="card stack tournament-live-panel" aria-label="Tournament Night controller">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Tournament Night</p>
          <h2>{stageLabel(currentStage)}</h2>
          <p className="muted compact">Active players: {activeMembers.map((member) => playerName(lobby, member.playerId)).join(" · ") || "None"}</p>
        </div>
        <div className="tournament-prize-badge"><span>Final prize</span><strong>{activeTournament.currentPrize} AZN</strong></div>
      </div>

      {activeMembers.length > 0 ? (
        <div className="tournament-standings">
          {activeMembers.map((member, index) => (
            <label className="tournament-standing-row" key={`${member.stage}-${member.playerId}`}>
              {(currentStage === "qualifier_a" || currentStage === "qualifier_b") ? (
                <input
                  type="checkbox"
                  checked={selectedAdvancers.includes(member.playerId)}
                  onChange={() => toggleAdvancer(member.playerId)}
                />
              ) : <span className="seat">{index + 1}</span>}
              <strong>{playerName(lobby, member.playerId)}</strong>
              <strong className="host-score">{member.score}</strong>
              {member.qualified ? <span className="status-pill live">QUALIFIED</span> : null}
            </label>
          ))}
        </div>
      ) : null}

      {(currentStage === "qualifier_a" || currentStage === "qualifier_b") && qualifierResolution ? (
        <div className="stack tournament-advance-box">
          {hasCutoffTie ? (
            <p className="warning"><strong>Tiebreak required.</strong> The score cutoff is tied. Run the tiebreak, then select exactly two advancing players here.</p>
          ) : (
            <div className="host-actions">
              <p className="muted compact">Current clear top 2: {clearSuggestedIds.map((id) => playerName(lobby, id)).join(" · ")}</p>
              <button className="secondary" onClick={() => { setSelectedAdvancers(clearSuggestedIds); setAdvanceArmed(false); }}>Select current top 2</button>
            </div>
          )}
          {transitionBlocked ? <p className="warning">Finish the current question and buzzer cycle before changing tournament stage.</p> : null}
          <button
            className={advanceArmed ? "danger" : "primary"}
            disabled={busy || selectedAdvancers.length !== 2 || transitionBlocked}
            onClick={() => void advanceQualifier()}
          >
            {busy
              ? "Saving..."
              : advanceArmed
                ? `CONFIRM ${selectedAdvancers.map((id) => playerName(lobby, id)).join(" + ")}`
                : currentStage === "qualifier_a"
                  ? "Review top 2 → Qualifier B"
                  : "Review top 2 → Final Four"}
          </button>
          {advanceArmed ? <p className="tiny muted">Second click changes the active tournament stage. This is intentionally guarded.</p> : null}
        </div>
      ) : null}

      {currentStage === "final" ? (
        <p className="muted compact">Final standings use only Final-stage score events; qualifier points remain in history but do not carry over.</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
