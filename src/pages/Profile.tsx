import { useEffect, useState } from "react";
import { Save, LogOut, User as UserIcon, Bell } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const RISK_OPTIONS = [
  { value: "low", label: "Conservative", desc: "Low risk, steady returns" },
  { value: "medium", label: "Balanced", desc: "Mix of growth & stability" },
  { value: "high", label: "Aggressive", desc: "High risk, high reward" },
];

const SECTORS = ["Banking", "IT", "Auto", "Pharma", "FMCG", "Energy", "Metals", "Telecom", "Infra", "Consumer"];

export default function Profile() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState("");
  const [risk, setRisk] = useState("medium");
  const [sectors, setSectors] = useState<string[]>([]);
  const [notif, setNotif] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setName(data.name || "");
        setRisk(data.risk_appetite || "medium");
        setSectors(data.preferred_sectors || []);
        setNotif(data.notifications_enabled ?? true);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name,
      risk_appetite: risk,
      preferred_sectors: sectors,
      notifications_enabled: notif,
      theme,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const toggleSector = (s: string) =>
    setSectors((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 lg:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-white">
            {(name || user?.email || "U")[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{name || "Your Profile"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-6">
            <Section title="Personal Info" icon={<UserIcon size={16} />}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </Section>

            <Section title="Risk Appetite" desc="We tailor AI explanations to your comfort with risk.">
              <div className="grid gap-2 sm:grid-cols-3">
                {RISK_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setRisk(o.value)}
                    className={`text-left rounded-xl border p-3 transition ${risk === o.value ? "border-primary bg-accent" : "border-border bg-background hover:bg-accent/50"}`}
                  >
                    <div className="font-semibold text-sm">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Preferred Sectors" desc="Get more relevant suggestions and ideas.">
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((s) => {
                  const on = sectors.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSector(s)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent"}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Preferences" icon={<Bell size={16} />}>
              <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3 cursor-pointer">
                <div>
                  <div className="text-sm font-medium">Notifications</div>
                  <div className="text-xs text-muted-foreground">Price alerts and important updates</div>
                </div>
                <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} className="h-4 w-4 accent-primary" />
              </label>
              <button onClick={toggle} className="mt-3 w-full text-left rounded-xl border border-border bg-background px-3 py-3 hover:bg-accent transition">
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-muted-foreground capitalize">{theme} mode — tap to switch</div>
              </button>
            </Section>

            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 flex-1">
                <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={signOut} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent transition">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, desc, icon, children }: { title: string; desc?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}
