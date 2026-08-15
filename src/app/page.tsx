import Link from "next/link";

export default function HomePage() {
  return (
    <main className="stack">
      <h1>Smartest Comedian Game</h1>
      <p>Realtime party-game controller for 2-10 players.</p>
      <div className="card stack">
        <Link href="/host">Host console</Link>
        <Link href="/host/questions">Question Bank</Link>
      </div>
    </main>
  );
}
