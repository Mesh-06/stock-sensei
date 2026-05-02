import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function strengthLabel(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return ["weak", "weak", "medium", "strong", "very strong"][s];
}

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 8) { toast.error("Use at least 8 characters"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) toast.error(error);
    else { toast.success("Welcome to StockSense AI! 🎉"); navigate("/"); }
  };

  const s = strengthLabel(password);
  const sColor = s === "weak" ? "text-danger" : s === "medium" ? "text-yellow-500" : "text-success";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 gradient-hero">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-extrabold">Stock<span className="gradient-text">Sense</span></span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-center">Create your account</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
            {password && <p className={`mt-1 text-xs ${sColor}`}>Strength: {s}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          </div>
          <button disabled={loading} type="submit" className="w-full gradient-primary text-white rounded-xl px-5 py-2.5 font-medium shadow-md hover:opacity-90 transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </button>
        </form>
        <p className="text-sm text-center mt-6 text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
