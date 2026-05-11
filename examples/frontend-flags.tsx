/**
 * LaunchDarkly feature flags for the AnyCompanyRead React frontend.
 *
 * The workshop's generated frontend uses Vite + Cloudscape and reads its
 * runtime config from /config.json (apiUrl, etc.). Drop `ldClientSideId`
 * into that file when you deploy so the SDK can wire up.
 *
 * SDK: launchdarkly-react-client-sdk ^3.9.1
 */

import React, { useEffect, useState } from 'react';
import {
  LDProvider,
  useFlags,
  useLDClient,
  asyncWithLDProvider,
} from 'launchdarkly-react-client-sdk';

// ---------- Types ----------
interface User {
  id: string;
  email?: string;
}

interface RuntimeConfig {
  apiUrl: string;
  ldClientSideId: string;
}

interface AppFlags {
  newBookCardDesign: boolean;
  showRecommendationReasons: boolean;
  checkoutFlowVersion: 'v1' | 'v2' | 'v3';
}

// ---------- Provider (sync wrapper) ----------
//
// Use this when the runtime config is already resolved (e.g. from a top-level
// loader). For full SSR-safe init, prefer `asyncWithLDProvider` below.
export function AppWithLaunchDarkly({
  config,
  user,
  children,
}: {
  config: RuntimeConfig;
  user: User | null;
  children: React.ReactNode;
}) {
  return (
    <LDProvider
      clientSideID={config.ldClientSideId}
      context={{
        kind: 'user',
        key: user?.id ?? 'anonymous',
        email: user?.email,
      }}
    >
      {children}
    </LDProvider>
  );
}

// ---------- Provider (async — initializes before first render) ----------
//
// Call at app bootstrap; the returned component already has the SDK initialized.
//   const LDApp = await initLaunchDarkly(config, currentUser);
//   ReactDOM.createRoot(...).render(<LDApp><App /></LDApp>);
export async function initLaunchDarkly(config: RuntimeConfig, user: User | null) {
  return asyncWithLDProvider({
    clientSideID: config.ldClientSideId,
    context: {
      kind: 'user',
      key: user?.id ?? 'anonymous',
      email: user?.email,
    },
  });
}

// ---------- Example: A/B test the book card design ----------
export function BookCard({ book }: { book: { id: string; title: string; author: string } }) {
  const { newBookCardDesign } = useFlags<AppFlags>();
  return newBookCardDesign ? (
    <article className="book-card book-card--v2">
      <h3>{book.title}</h3>
      <p className="author">{book.author}</p>
    </article>
  ) : (
    <div className="book-card-legacy">
      <strong>{book.title}</strong> — {book.author}
    </div>
  );
}

// ---------- Example: toggle a piece of UI copy ----------
export function RecommendationReason({ reason }: { reason: string }) {
  const { showRecommendationReasons } = useFlags<AppFlags>();
  if (!showRecommendationReasons) return null;
  return <p className="recommendation-reason">{reason}</p>;
}

// ---------- Example: multivariate string flag + custom event ----------
export function Checkout({ onComplete }: { onComplete: () => void }) {
  const { checkoutFlowVersion } = useFlags<AppFlags>();
  const ldClient = useLDClient();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    ldClient?.track('checkout-completed', { variant: checkoutFlowVersion });
    onComplete();
  };

  return (
    <div data-variant={checkoutFlowVersion}>
      {checkoutFlowVersion === 'v3' ? (
        <SinglePageCheckout onSubmit={submit} disabled={submitting} />
      ) : checkoutFlowVersion === 'v2' ? (
        <TwoStepCheckout onSubmit={submit} disabled={submitting} />
      ) : (
        <LegacyCheckout onSubmit={submit} disabled={submitting} />
      )}
    </div>
  );
}

// ---------- Stub components used in the multivariate example ----------
function SinglePageCheckout(_: { onSubmit: () => void; disabled: boolean }) { return null; }
function TwoStepCheckout(_: { onSubmit: () => void; disabled: boolean }) { return null; }
function LegacyCheckout(_: { onSubmit: () => void; disabled: boolean }) { return null; }
