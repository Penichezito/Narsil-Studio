import type { Metadata } from "next";
import MaintenanceScreen, { type TerminalLink } from "@/components/MaintenanceScreen";

export const metadata: Metadata = {
  title: "Narsil Studio — Building Worlds, Coding Art",
};

export default function MaintenancePage() {
  const links: TerminalLink[] = [
    { command: "open --linkedin", href: process.env.NEXT_PUBLIC_LINKEDIN_URL },
    { command: "git clone --github", href: process.env.NEXT_PUBLIC_GITHUB_URL },
    { command: "play --youtube", href: process.env.NEXT_PUBLIC_YOUTUBE_URL },
  ].filter((l): l is TerminalLink => Boolean(l.href));

  return <MaintenanceScreen links={links} />;
}
