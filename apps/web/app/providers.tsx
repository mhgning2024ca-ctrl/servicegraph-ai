"use client";

import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { LocaleProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <ServiceWorkerRegistration />
      {children}
    </LocaleProvider>
  );
}
