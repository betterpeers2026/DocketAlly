export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled" | "expired";
export type SubscriptionPlan = "monthly" | "quarterly" | "yearly";

export interface SubscriptionInfo {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}

/** Check if the user has active access (trial still valid OR paid subscription) */
export function hasActiveAccess(info: SubscriptionInfo): boolean {
  if (info.subscriptionStatus === "active" || info.subscriptionStatus === "past_due") {
    return true;
  }
  if (info.subscriptionStatus === "trial" && info.trialEndsAt) {
    return new Date(info.trialEndsAt) > new Date();
  }
  return false;
}

/** Check if the user can create new records */
export function canCreateRecords(info: SubscriptionInfo): boolean {
  return hasActiveAccess(info);
}

/** Get days remaining in trial */
export function trialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Whether to show the trial banner */
export function shouldShowTrialBanner(info: SubscriptionInfo): boolean {
  return info.subscriptionStatus === "trial" && trialDaysLeft(info.trialEndsAt) > 0;
}
