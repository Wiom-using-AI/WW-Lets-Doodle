import DoodleWall from "@/components/DoodleWall";

export const metadata = { title: "The Doodle Showdown — Live Wall" };

// Public office-TV wall. Open on any screen (fullscreen the browser) — no login needed.
export default function WallPage() {
  return <DoodleWall />;
}
