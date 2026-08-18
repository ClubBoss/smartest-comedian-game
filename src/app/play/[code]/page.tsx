import { PlayerLobby } from "./player-lobby";
import { PlayerSpecialAnswerDock } from "./player-special-answer-dock";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  return (
    <>
      <PlayerLobby code={normalized} />
      <PlayerSpecialAnswerDock code={normalized} />
    </>
  );
}
