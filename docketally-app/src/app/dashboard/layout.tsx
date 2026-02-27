import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { SubscriptionProvider } from "@/components/SubscriptionProvider";
import TrialBanner from "@/components/TrialBanner";
import type { SubscriptionInfo } from "@/lib/subscription";
import BottomNav from "@/components/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch subscription data from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_plan, trial_ends_at, subscription_ends_at")
    .eq("id", user.id)
    .single();

  const subInfo: SubscriptionInfo = {
    subscriptionStatus: profile?.subscription_status ?? "trial",
    subscriptionPlan: profile?.subscription_plan ?? null,
    trialEndsAt: profile?.trial_ends_at ?? null,
    subscriptionEndsAt: profile?.subscription_ends_at ?? null,
  };

  return (
    <SubscriptionProvider value={subInfo}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar user={user} subscription={subInfo} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <TopBar />
          <TrialBanner />
          <main
            className="da-main-content"
            style={{
              flex: 1,
              overflow: "auto",
              background: "var(--color-surface)",
            }}
          >
            {children}
          </main>
          <BottomNav subscription={subInfo} />
        </div>
      </div>
    </SubscriptionProvider>
  );
}
