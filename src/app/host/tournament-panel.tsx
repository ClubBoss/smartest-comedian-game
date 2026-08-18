"use client";

import type { LobbyState, TournamentMemberState, TournamentStage } from "@/domain/lobby";
import { resolveTopTwo } from "@/domain/tournament";
import { useEffect, useMemo, useState } from "react";

type Props = {
  lobby: LobbyState;
  hostToken: string;
  onRefresh: () => Promise<unknown>;
  gameMode: boolean;
};

type HostPack = { id: string; name: string; description: string | null; count: number };

function stageLabel(stage: TournamentStage) {
  if (stage === "qualifier_a") return "Group A";
  if (stage === "qualifier_b") return "Group B";
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
  const [packs, setPacks] = useState<HostPack[]>([]);
  const [qualifierAPackId, setQualifierAPackId] = useState("");
  const [qualifierBPackId, setQualifierBPackId] = useState("");
  const [finalPackId, setFinalPackId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advanceArmed, setAdvanceArmed] = useState(false);

  const allPlayerIds = useMemo(() => lobby.players.map((player) => player.id), [lobby.players]);
  const defaultGroupAIds = allPlayerIds.slice(0, 4);
  const effectiveGroupAIds = (groupAIds ?? defaultGroupAIds).filter((id) => allPlayerIds.includes(id));
  const groupBIds = allPlayerIds.filter((id) => !effectiveGroupAIds.includes(id));

  useEffect(() => {
    if (lobby.tournament) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/rooms/${lobby.code}/packs`, {
          headers: { "x-host-token": hostToken },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load Question Packs.");
        if (!cancelled) setPacks(result.packs ?? []);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load Question Packs.");
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [hostToken, lobby.code, lobby.tournament]);

  async function postTournament(path: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${lobby.code}/tournament/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-host-token": hostToken },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Tournament action failed.");
      await onRefresh();
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
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
    const packIds = [qualifierAPackId, qualifierBPackId, finalPackId];
    if (effectiveGroupAIds.length !== 4 || groupBIds.length !== 4 || packIds.some((id) => !id) || new Set(packIds).size !== 3) return;
    const ok = await postTournament("start", {
      groupAPlayerIds: effectiveGroupAIds,
      groupBPlayerIds: groupBIds,
      qualifierAPackId,
      qualifierBPackId,
      finalPackId,
    });
    if (ok) {
      setSelectedAdvancers([]);
      setAdvanceArmed(false);
    }
  }

  const tournament = lobby.tournament;
  if (!tournament) {
    if (gameMode) return null;
    const packIds = [qualifierAPackId, qualifierBPackId, finalPackId];
    const packsReady = packIds.every(Boolean) && new Set(packIds).size === 3;
    return (
      <section className="card stack" aria-label="Tournament Night setup">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Tournament Night</p>
            <h2>8 players · 3 blocks</h2>
            <p className="muted compact">Group A → Group B → Final Four. Choose the three question sets once; the site loads each block automatically.</p>
          </div>
          <span className="status-pill">TOP 2 + TOP 2</span>
        </div>

        {lobby.playerCount !== 8 ? (
          <p className="muted">Join exactly 8 active players first. Current: {lobby.playerCount}/8.</p>
        ) : (
          <>
            <div className="stack">
              <p className="eyebrow">1 · Choose the three sets</p>
              <div className="lobby-grid">
                <label className="field"><span>Group A questions</span><select aria-label="Group A question pack" value={qualifierAPackId} onChange={(event) => setQualifierAPackId(event.target.value)}><option value="">Choose a set...</option>{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} · {pack.count}</option>)}</select></label>
                <label className="field"><span>Group B questions</span><select aria-label="Group B question pack" value={qualifierBPackId} onChange={(event) => setQualifierBPackId(event.target.value)}><option value="">Choose a set...</option>{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} · {pack.count}</option>)}</select></label>
                <label className="field"><span>Final Four questions</span><select aria-label="Final Four question pack" value={finalPackId} onChange={(event) => setFinalPackId(event.target.value)}><option value="">Choose a set...</option>{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} · {pack.count}</option>)}</select></label>
              </div>
              {packIds.every(Boolean) && !packsReady ? <p className="warning">Use three different Question Packs so players do not see repeated questions.</p> : null}
              {packs.length < 3 ? <p className="warning">Create at least three saved Question Packs in Question Bank: one for Group A, one for Group B and one for the Final.</p> : null}
            </div>

            <div className="stack">
              <div className="split-heading"><p className="eyebrow">2 · Split the players 4 + 4</p><button className="secondary" disabled={busy} onClick={shuffleGroups}>Shuffle groups</button></div>
              <div className="tournament-group-picker">
                {lobby.players.map((player) => {
                  const inA = effectiveGroupAIds.includes(player.id);
                  return (
                    <label className={`tournament-player-pick ${inA ? "group-a" : "group-b"}`} key={player.id}>
                      <input type="checkbox" aria-label={`${player.displayName} in Group A`} checked={inA} onChange={() => toggleGroupA(player.id)} disabled={!inA && effectiveGroupAIds.length >= 4} />
                      <strong>{player.displayName}</strong><span>{inA ? "A" : "B"}</span>
                    </label>
                  );
                })}
              </div>
              <div className="lobby-grid">
                <div className="card compact-card"><p className="eyebrow">Group A</p><strong>{effectiveGroupAIds.map((id) => playerName(lobby, id)).join(" · ") || "Choose 4 players"}</strong></div>
                <div className="card compact-card"><p className="eyebrow">Group B</p><strong>{groupBIds.map((id) => playerName(lobby, id)).join(" · ")}</strong></div>
              </div>
            </div>

            <button className="primary" disabled={busy || !packsReady || effectiveGroupAIds.length !== 4 || groupBIds.length !== 4} onClick={() => void startTournament()}>
              {busy ? "Starting..." : "Start Group A"}
            </button>
          </>
        )}
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  const currentStage = tournament.currentStage;
  const activeMembers = currentStage === "complete" ? [] : sortMembers(tournament.members.filter((member) => member.stage === currentStage));
  const qualifierResolution = currentStage === "qualifier_a" || currentStage === "qualifier_b"
    ? activeMembers.length === 4
      ? resolveTopTwo(activeMembers.map((member) => ({ playerId: member.playerId, score: member.score, seedOrder: member.seedOrder })))
      : null
    : null;
  const clearSuggestedIds = qualifierResolution && qualifierResolution.tieBreakPlayerIds.length === 0 ? qualifierResolution.automaticQualifierIds : [];
  const hasCutoffTie = Boolean(qualifierResolution?.tieBreakPlayerIds.length);
  const transitionBlocked = Boolean(lobby.question || lobby.buzz?.status === "open");

  function toggleAdvancer(playerId: string) {
    setAdvanceArmed(false);
    setSelectedAdvancers((current) => current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length >= 2 ? current : [...current, playerId]);
  }

  async function advanceQualifier() {
    if ((currentStage !== "qualifier_a" && currentStage !== "qualifier_b") || selectedAdvancers.length !== 2 || transitionBlocked) return;
    if (!advanceArmed) { setAdvanceArmed(true); return; }
    const ok = await postTournament("advance", { tournamentId: tournament.id, stage: currentStage, advancingPlayerIds: selectedAdvancers });
    if (ok) { setSelectedAdvancers([]); setAdvanceArmed(false); }
  }

  return (
    <section className="card stack tournament-live-panel" aria-label="Tournament Night controller">
      <div className="split-heading">
        <div><p className="eyebrow">Tournament Night</p><h2>{stageLabel(currentStage)}</h2><p className="muted compact">{currentStage === "qualifier_a" ? "First group is playing. The Group A pack is already in the queue." : currentStage === "qualifier_b" ? "Second group is playing. The Group B pack was loaded automatically." : currentStage === "final" ? "Finalists start from zero. The Final Four pack is ready." : "Tournament complete."}</p></div>
        <div className="tournament-prize-badge"><span>Final prize</span><strong>{tournament.currentPrize} AZN</strong></div>
      </div>

      {activeMembers.length > 0 ? <div className="tournament-standings">{activeMembers.map((member, index) => (
        <label className="tournament-standing-row" key={`${member.stage}-${member.playerId}`}>
          {(currentStage === "qualifier_a" || currentStage === "qualifier_b") ? <input type="checkbox" checked={selectedAdvancers.includes(member.playerId)} onChange={() => toggleAdvancer(member.playerId)} /> : <span className="seat">{index + 1}</span>}
          <strong>{playerName(lobby, member.playerId)}</strong><strong className="host-score">{member.score}</strong>{member.qualified ? <span className="status-pill live">QUALIFIED</span> : null}
        </label>
      ))}</div> : null}

      {(currentStage === "qualifier_a" || currentStage === "qualifier_b") && qualifierResolution ? (
        <div className="stack tournament-advance-box">
          {hasCutoffTie ? <p className="warning"><strong>Tiebreak needed.</strong> Run the reserved tiebreak question, then select the two players who advance.</p> : <div className="host-actions"><p className="muted compact">Current top 2: {clearSuggestedIds.map((id) => playerName(lobby, id)).join(" · ")}</p><button className="secondary" onClick={() => { setSelectedAdvancers(clearSuggestedIds); setAdvanceArmed(false); }}>Select top 2</button></div>}
          {transitionBlocked ? <p className="warning">Finish the current question before moving to the next block.</p> : null}
          <button className={advanceArmed ? "danger" : "primary"} disabled={busy || selectedAdvancers.length !== 2 || transitionBlocked} onClick={() => void advanceQualifier()}>
            {busy ? "Loading next block..." : advanceArmed ? `CONFIRM ${selectedAdvancers.map((id) => playerName(lobby, id)).join(" + ")}` : currentStage === "qualifier_a" ? "Finish Group A → Start Group B" : "Finish Group B → Start Final Four"}
          </button>
          {advanceArmed ? <p className="tiny muted">The next block's Question Pack will be loaded automatically.</p> : null}
        </div>
      ) : null}

      {currentStage === "final" ? <p className="muted compact">Final scores are separate from qualification. Group A and Group B results stay in history but do not carry over.</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
