import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { canAccessFeature } from '../../utils/premiumUtils';
import PremiumPaywall from './PremiumPaywall';

/**
 * Conditional renderer that shows children if the user has access,
 * or a paywall if they don't.
 *
 * Props:
 *   feature   – feature key from premiumUtils (e.g. 'advancedStats')
 *   fallback  – optional custom fallback component (default: PremiumPaywall)
 *   compact   – if true, passes compact to PremiumPaywall
 *   message   – optional custom paywall message
 *   children  – the gated content
 */
export default function PremiumGate({ feature, fallback, compact, message, children }) {
  const { userProfile } = useAuth();
  const hasAccess = canAccessFeature(feature, userProfile);

  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return <PremiumPaywall feature={feature} compact={compact} message={message} />;
}
