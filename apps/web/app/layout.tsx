import type { Metadata, Viewport } from "next";
import { Providers } from "@/app/providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ServiceGraph AI",
  description: "From complaint to root cause to safe resolution."
};

export const viewport: Viewport = {
  themeColor: "#07111F",
  colorScheme: "dark light"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
