/**
 * LaunchDarkly Feature Flags for React
 */

import React from 'react';
import { useFlags, useLDClient, LDProvider } from 'launchdarkly-react-client-sdk';

const LD_CLIENT_SIDE_ID = process.env.REACT_APP_LD_CLIENT_SIDE_ID || '';

// Types
interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Provider wrapper
export function AppWithLaunchDarkly({ user, children }: { user: User | null; children: React.ReactNode }) {
  return (
    <LDProvider
      clientSideID={LD_CLIENT_SIDE_ID}
      context={{
        kind: 'user',
        key: user?.id || 'anonymous',
        email: user?.email,
        custom: { plan: user?.plan || 'free' },
      }}
    >
      {children}
    </LDProvider>
  );
}

// Checkout with feature flag
export function Checkout({ items, onComplete }: { items: CartItem[]; onComplete: () => void }) {
  const { newCheckoutFlow } = useFlags();
  const ldClient = useLDClient();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleComplete = () => {
    ldClient?.track('checkout-completed', { total });
    onComplete();
  };

  if (newCheckoutFlow) {
    return (
      <div className="new-checkout">
        <h2>Checkout</h2>
        {items.map(item => (
          <div key={item.id}>{item.name} - ${item.price} × {item.quantity}</div>
        ))}
        <p>Total: ${total.toFixed(2)}</p>
        <button onClick={handleComplete}>Complete Purchase</button>
      </div>
    );
  }

  return (
    <div className="legacy-checkout">
      <h2>Checkout</h2>
      <div className="steps">1. Cart → 2. Shipping → 3. Payment → 4. Confirm</div>
      {items.map(item => (
        <div key={item.id}>{item.name} - ${item.price} × {item.quantity}</div>
      ))}
      <p>Total: ${total.toFixed(2)}</p>
      <button onClick={handleComplete}>Proceed</button>
    </div>
  );
}

// Premium badge
export function PremiumBadge() {
  const { premiumFeatures } = useFlags();
  return premiumFeatures ? <span className="premium-badge">⭐ Premium</span> : null;
}
