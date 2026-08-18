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
  if (stage === "qualifier_a") return "Игра 1";
  if (stage === "qualifier_b") return "Игра 2";
  if (stage === "final") return "Финал";
  return "Игра завершена";
}

function playerName(lobby: LobbyState, playerId: string) {
  return lobby.players.find((player) => player.id === playerId)?.displayName ?? "Игрок";
}

function sortMembers(members: TournamentMemberState[]) {
  return [...members].sort((left, right) => right.score - left.score || left.seedOrder - right.seedOrder);
}

export function TournamentPanel({ lobby, hostToken, onRefresh, gameMode }: Props) {
  const [groupAIds, setGroupAIds] = useState<string[] | null>(null);
  const [selectedAdvancers, setSelectedAdvancers] = useState<string[]>([]);
  const [selectedChampionId, setSelectedChampionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advanceArmed, setAdvanceArmed] = useState(false);
  const [championArmed, setChampionArmed] = useState(false);

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
      if (!response.ok) throw new Error(result.error ?? "Не удалось выполнить действие.");
      await onRefresh();
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить действие.");
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
      <section className="card stack" aria-label="Game Night setup">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Вечер игры</p>
            <h2>8 игроков · 3 отдельные игры</h2>
            <p className="muted compact">Четверо играют Игру 1, другие четверо — Игру 2. По два лучших выходят в отдельный Финал с нулевым счётом.</p>
          </div>
          <span className="status-pill">8 ИГРОКОВ</span>
        </div>

        {lobby.playerCount !== 8 ? (
          <p className="muted">Для этого сценария нужно 8 активных игроков. Сейчас: {lobby.playerCount}/8.</p>
        ) : (
          <>
            <div className="host-actions">
              <button className="secondary" disabled={busy} onClick={shuffleGroups}>Перемешать 4 + 4</button>
            </div>
            <div className="tournament-group-picker">
              {lobby.players.map((player) => {
                const inA = effectiveGroupAIds.includes(player.id);
                return (
                  <label className={`tournament-player-pick ${inA ? "group-a" : "group-b"}`} key={player.id}>
                    <input
                      type="checkbox"
                      aria-label={`Игра 1 · ${player.displayName}`}
                      checked={inA}
                      onChange={() => toggleGroupA(player.id)}
                      disabled={!inA && effectiveGroupAIds.length >= 4}
                    />
                    <strong>{player.displayName}</strong>
                    <span>{inA ? "Игра 1" : "Игра 2"}</span>
                  </label>
                );
              })}
            </div>
            <div className="lobby-grid">
              <div className="card compact-card"><p className="eyebrow">Игра 1</p><strong>{effectiveGroupAIds.map((id) => playerName(lobby, id)).join(" · ") || "Выбери 4 игроков"}</strong></div>
              <div className="card compact-card"><p className="eyebrow">Игра 2</p><strong>{groupBIds.map((id) => playerName(lobby, id)).join(" · ")}</strong></div>
            </div>
            <button className="primary" disabled={busy || effectiveGroupAIds.length !== 4 || groupBIds.length !== 4} onClick={() => void startTournament()}>
              {busy ? "Запускаю..." : "Начать Игру 1"}
            </button>
            <p className="tiny muted">После старта загрузи отдельный пакет «Игра 1» в блоке вопросов. Перед Игрой 2 и Финалом загружаются их собственные пакеты.</p>
          </>
        )}
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  const currentStage = tournament.currentStage;
  const activeMembers = currentStage === "complete"
    ? []
    : sortMembers(tournament.members.filter((member) => member.stage === currentStage));
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
  const transitionBlocked = Boolean(lobby.question || lobby.buzz?.status === "open");

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
      tournamentId: tournament.id,
      stage: currentStage,
      advancingPlayerIds: selectedAdvancers,
    });
    if (ok) {
      setSelectedAdvancers([]);
      setAdvanceArmed(false);
    }
  }

  async function lockChampion() {
    if (currentStage !== "final" || !selectedChampionId || transitionBlocked) return;
    if (!championArmed) {
      setChampionArmed(true);
      return;
    }
    const ok = await postTournament("final", { action: "complete", championPlayerId: selectedChampionId });
    if (ok) setChampionArmed(false);
  }

  if (currentStage === "complete") {
    const championName = tournament.championPlayerId ? playerName(lobby, tournament.championPlayerId) : "Победитель";
    return (
      <section className="card stack tournament-live-panel" aria-label="Game Night result">
        <div className="split-heading">
          <div><p className="eyebrow">Игра завершена</p><h2>{championName}</h2><p className="muted compact">Победитель Финала.</p></div>
          <div className="tournament-prize-badge"><span>Приз</span><strong>{tournament.finalPayout ?? tournament.currentPrize} AZN</strong></div>
        </div>
        {!tournament.doubleResolved ? (
          <div className="stack tournament-advance-box">
            <strong>Последний выбор</strong>
            <p className="muted compact">Победитель может забрать {tournament.currentPrize} AZN сейчас или сыграть заранее подготовленный вопрос «Удвоение приза».</p>
            <div className="host-actions">
              <button className="primary" disabled={busy} onClick={() => void postTournament("final", { action: "take" })}>Забрать {tournament.currentPrize} AZN</button>
              <span className="status-pill">ИЛИ ЗАГРУЗИ ВОПРОС «УДВОЕНИЕ»</span>
            </div>
          </div>
        ) : (
          <p className="notice">Финальный денежный результат зафиксирован: {tournament.finalPayout ?? 0} AZN.</p>
        )}
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="card stack tournament-live-panel" aria-label="Game Night controller">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Вечер игры</p>
          <h2>{stageLabel(currentStage)}</h2>
          <p className="muted compact">Сейчас играют: {activeMembers.map((member) => playerName(lobby, member.playerId)).join(" · ") || "—"}</p>
        </div>
        {currentStage === "final" ? <div className="tournament-prize-badge"><span>Приз финала</span><strong>{tournament.currentPrize} AZN</strong></div> : null}
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
              ) : (
                <input
                  type="radio"
                  name="final-champion"
                  checked={selectedChampionId === member.playerId}
                  onChange={() => { setSelectedChampionId(member.playerId); setChampionArmed(false); }}
                />
              )}
              <span className="seat">{index + 1}</span>
              <strong>{playerName(lobby, member.playerId)}</strong>
              <strong className="host-score">{member.score}</strong>
              {member.qualified ? <span className="status-pill live">ПРОШЁЛ</span> : null}
            </label>
          ))}
        </div>
      ) : null}

      {(currentStage === "qualifier_a" || currentStage === "qualifier_b") && qualifierResolution ? (
        <div className="stack tournament-advance-box">
          {hasCutoffTie ? (
            <p className="warning"><strong>Нужен тай-брейк.</strong> На проходном месте ничья. Проведи резервный вопрос, затем выбери двух прошедших.</p>
          ) : (
            <div className="host-actions">
              <p className="muted compact">Сейчас проходят: {clearSuggestedIds.map((id) => playerName(lobby, id)).join(" · ")}</p>
              <button className="secondary" onClick={() => { setSelectedAdvancers(clearSuggestedIds); setAdvanceArmed(false); }}>Выбрать этих двоих</button>
            </div>
          )}
          {transitionBlocked ? <p className="warning">Сначала закончи текущий вопрос и закрой buzzer.</p> : null}
          <button
            className={advanceArmed ? "danger" : "primary"}
            disabled={busy || selectedAdvancers.length !== 2 || transitionBlocked}
            onClick={() => void advanceQualifier()}
          >
            {busy
              ? "Сохраняю..."
              : advanceArmed
                ? `ПОДТВЕРДИТЬ: ${selectedAdvancers.map((id) => playerName(lobby, id)).join(" + ")}`
                : currentStage === "qualifier_a"
                  ? "Завершить Игру 1 → Игру 2"
                  : "Завершить Игру 2 → Финал"}
          </button>
          <p className="tiny muted">После перехода счёт новой игры начинается с 0. Затем просто загрузи её отдельный пакет вопросов.</p>
        </div>
      ) : null}

      {currentStage === "final" ? (
        <div className="stack tournament-advance-box">
          <p className="muted compact">Финал имеет отдельный счёт с нуля. Командный вопрос может поднять приз до 12 AZN.</p>
          {transitionBlocked ? <p className="warning">Победителя можно зафиксировать только после завершения последнего вопроса.</p> : null}
          <button
            className={championArmed ? "danger" : "primary"}
            disabled={busy || !selectedChampionId || transitionBlocked}
            onClick={() => void lockChampion()}
          >
            {busy ? "Сохраняю..." : championArmed ? `ПОДТВЕРДИТЬ ПОБЕДИТЕЛЯ: ${playerName(lobby, selectedChampionId)}` : "Зафиксировать победителя Финала"}
          </button>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
