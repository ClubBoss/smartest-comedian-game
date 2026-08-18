import type { Metadata } from "next";
import "./globals.css";
import "./ev-cycle.css";
import "./sound-pack.css";
import "./tournament.css";

export const metadata: Metadata = {
  title: "Smartest Comedian Game",
  description: "Realtime party-game controller for 2-10 players",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
