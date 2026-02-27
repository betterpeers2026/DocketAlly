"use client";

import { createContext, useContext } from "react";
import type { SubscriptionInfo } from "@/lib/subscription";

const SubscriptionContext = createContext<SubscriptionInfo>({
  subscriptionStatus: "trial",
  subscriptionPlan: null,
  trialEndsAt: null,
  subscriptionEndsAt: null,
});

export function SubscriptionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SubscriptionInfo;
}) {
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionInfo {
  return useContext(SubscriptionContext);
}
