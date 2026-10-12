import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chore Divider",
  description:
    "Split household chores fairly — biweekly weekend rotations, special deep-clean cycles, and live shared checklists.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
