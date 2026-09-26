"use client";

import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { LocaleProvider } from "@/lib/i18n";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider>
      <LocaleProvider>
        <ServiceWorkerRegistration />
        {children}
      </LocaleProvider>
    </Auth0Provider>
  );
}
