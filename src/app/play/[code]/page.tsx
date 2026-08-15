import { PlayerLobby } from "./player-lobby";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PlayerLobby code={code.toUpperCase()} />;
}
