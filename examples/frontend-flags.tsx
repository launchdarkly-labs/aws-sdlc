/**
 * LaunchDarkly Feature Flag Integration for AnyCompanyRead
 *
 * This example shows how to add feature flags to the React frontend
 * of the AnyCompanyRead e-commerce application.
 *
 * For the AWS AI-DLC workshop, this enables:
 * - Progressive rollout of new features
 * - A/B testing UI variations
 * - Instant feature toggles without deployment
 * - User-segment targeting (premium, beta, etc.)
 */

import React from 'react';
import {
  useFlags,
  useLDClient,
  withLDProvider,
  LDProvider,
} from 'launchdarkly-react-client-sdk';

// =============================================================================
// Configuration
// =============================================================================

const LD_CLIENT_SIDE_ID = process.env.REACT_APP_LD_CLIENT_SIDE_ID || 'your-client-side-id';

// User context for targeting (in real app, comes from auth)
const getUserContext = (user: User | null) => ({
  kind: 'user',
  key: user?.id || 'anonymous',
  email: user?.email,
  name: user?.name,
  custom: {
    plan: user?.plan || 'free',
    signupDate: user?.signupDate,
  },
});

// =============================================================================
// Types
// =============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  signupDate: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// =============================================================================
// Feature Flag Hooks
// =============================================================================

/**
 * Custom hook for typed flag access with defaults
 */
function useTypedFlags() {
  const flags = useFlags();

  return {
    // Boolean flags
    newCheckoutFlow: flags.newCheckoutFlow ?? false,
    premiumFeatures: flags.premiumFeatures ?? false,
    aiRecommendations: flags.aiRecommendations ?? false,
    darkMode: flags.darkMode ?? false,

    // String/variant flags
    checkoutButtonStyle: flags.checkoutButtonStyle ?? 'default',

    // JSON/complex flags
    promoConfig: flags.promoConfig ?? { enabled: false, discount: 0 },
  };
}

// =============================================================================
// Checkout Component with Feature Flags
// =============================================================================

interface CheckoutProps {
  items: CartItem[];
  onComplete: () => void;
}

/**
 * Checkout component demonstrating feature flag usage
 */
export function Checkout({ items, onComplete }: CheckoutProps) {
  const { newCheckoutFlow, checkoutButtonStyle, promoConfig } = useTypedFlags();
  const ldClient = useLDClient();

  // Track checkout started for experimentation
  const handleCheckoutStart = () => {
    ldClient?.track('checkout-started', { itemCount: items.length });
  };

  // Render new or legacy checkout based on flag
  if (newCheckoutFlow) {
    return (
      <NewCheckout
        items={items}
        onComplete={onComplete}
        buttonStyle={checkoutButtonStyle}
        promo={promoConfig}
        onStart={handleCheckoutStart}
      />
    );
  }

  return (
    <LegacyCheckout
      items={items}
      onComplete={onComplete}
      onStart={handleCheckoutStart}
    />
  );
}

// =============================================================================
// New Checkout Flow (Behind Flag)
// =============================================================================

interface NewCheckoutProps extends CheckoutProps {
  buttonStyle: string;
  promo: { enabled: boolean; discount: number };
  onStart: () => void;
}

function NewCheckout({ items, onComplete, buttonStyle, promo, onStart }: NewCheckoutProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountedTotal = promo.enabled ? total * (1 - promo.discount / 100) : total;

  return (
    <div className="new-checkout">
      <h2>Checkout</h2>

      {/* Streamlined single-page checkout */}
      <div className="checkout-grid">
        <section className="order-summary">
          <h3>Order Summary</h3>
          {items.map(item => (
            <div key={item.id} className="checkout-item">
              <span>{item.name}</span>
              <span>{item.quantity} × ${item.price}</span>
            </div>
          ))}

          {promo.enabled && (
            <div className="promo-applied">
              {promo.discount}% discount applied!
            </div>
          )}

          <div className="checkout-total">
            Total: ${discountedTotal.toFixed(2)}
          </div>
        </section>

        <section className="payment-section">
          <h3>Payment</h3>
          {/* Payment form fields */}
          <button
            className={`checkout-button checkout-button--${buttonStyle}`}
            onClick={() => {
              onStart();
              onComplete();
            }}
          >
            Complete Purchase
          </button>
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Legacy Checkout (Control)
// =============================================================================

interface LegacyCheckoutProps extends CheckoutProps {
  onStart: () => void;
}

function LegacyCheckout({ items, onComplete, onStart }: LegacyCheckoutProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="legacy-checkout">
      <h2>Checkout</h2>

      {/* Multi-step checkout wizard */}
      <div className="checkout-steps">
        <div className="step">1. Review Cart</div>
        <div className="step">2. Shipping</div>
        <div className="step">3. Payment</div>
        <div className="step">4. Confirm</div>
      </div>

      <div className="cart-items">
        {items.map(item => (
          <div key={item.id} className="cart-item">
            {item.name} - {item.quantity} × ${item.price}
          </div>
        ))}
      </div>

      <div className="cart-total">Total: ${total.toFixed(2)}</div>

      <button
        className="checkout-button"
        onClick={() => {
          onStart();
          onComplete();
        }}
      >
        Proceed to Checkout
      </button>
    </div>
  );
}

// =============================================================================
// Premium Features Component
// =============================================================================

export function PremiumBadge() {
  const { premiumFeatures } = useTypedFlags();

  if (!premiumFeatures) {
    return null;
  }

  return (
    <div className="premium-badge">
      ⭐ Premium Member
    </div>
  );
}

// =============================================================================
// AI Recommendations Component
// =============================================================================

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface AIRecommendationsProps {
  userId: string;
  currentProductId?: string;
}

export function AIRecommendations({ userId, currentProductId }: AIRecommendationsProps) {
  const { aiRecommendations } = useTypedFlags();
  const [recommendations, setRecommendations] = React.useState<Product[]>([]);

  React.useEffect(() => {
    if (aiRecommendations) {
      // Fetch AI-powered recommendations
      fetch(`/api/recommendations?userId=${userId}&productId=${currentProductId}`)
        .then(res => res.json())
        .then(data => setRecommendations(data.products))
        .catch(console.error);
    }
  }, [aiRecommendations, userId, currentProductId]);

  if (!aiRecommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="ai-recommendations">
      <h3>Recommended for You</h3>
      <div className="recommendation-grid">
        {recommendations.map(product => (
          <div key={product.id} className="recommendation-card">
            <img src={product.image} alt={product.name} />
            <h4>{product.name}</h4>
            <p>${product.price}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// App Provider Setup
// =============================================================================

interface AppProps {
  user: User | null;
  children: React.ReactNode;
}

/**
 * Wrap your app with this provider to enable feature flags
 */
export function AppWithLaunchDarkly({ user, children }: AppProps) {
  return (
    <LDProvider
      clientSideID={LD_CLIENT_SIDE_ID}
      context={getUserContext(user)}
      options={{
        bootstrap: 'localStorage', // Fast initial render
      }}
    >
      {children}
    </LDProvider>
  );
}

// Alternative: HOC pattern for class components
export const withLaunchDarkly = withLDProvider({
  clientSideID: LD_CLIENT_SIDE_ID,
});

// =============================================================================
// Workshop Notes
// =============================================================================

/*
Setting up in LaunchDarkly Dashboard:

1. Create flags:

   Flag: new-checkout-flow
   - Type: Boolean
   - Default: false
   - Description: Enable streamlined single-page checkout

   Flag: premium-features
   - Type: Boolean
   - Default: false
   - Description: Show premium member features
   - Targeting: user.plan in ["pro", "enterprise"]

   Flag: ai-recommendations
   - Type: Boolean
   - Default: false
   - Description: Show AI-powered product recommendations
   - Targeting: Percentage rollout starting at 10%

   Flag: checkout-button-style
   - Type: String
   - Variations: "default", "prominent", "minimal"
   - Description: A/B test checkout button styles

2. Set up experiments:
   - Metric: checkout-started (custom event)
   - Metric: purchase-completed (custom event)
   - Compare conversion rates across variations

3. Demo:
   - Load app, see legacy checkout
   - Toggle new-checkout-flow in dashboard
   - Refresh app, see new checkout (no redeploy!)
   - View experiment results in LD dashboard
*/
