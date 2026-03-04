/**
 * Renders SubscriptionBottomSheet using SubscriptionContext.
 * Lives in a separate file to avoid require cycle: SubscriptionContext → SubscriptionBottomSheet → SubscriptionContext.
 */

import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import SubscriptionBottomSheet from './SubscriptionBottomSheet';

export default function SubscriptionSheetRenderer() {
  const {
    subscriptionSheetVisible,
    subscriptionSheetParams,
    closeSubscriptionBottomSheet,
  } = useSubscription();

  return (
    <SubscriptionBottomSheet
      visible={subscriptionSheetVisible}
      onClose={closeSubscriptionBottomSheet}
      offerId={subscriptionSheetParams?.offerId ?? null}
      offerProductId={subscriptionSheetParams?.offerProductId ?? null}
    />
  );
}
