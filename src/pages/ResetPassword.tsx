import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 8) { toast.error("Use at least 8 characters"); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) toast.error(error);
    else { toast.success("Password updated"); navigate("/login"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 gradient-hero">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-extrabold">Stock<span className="gradient-text">Sense</span></span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-center">Set a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input type="password" placeholder="New password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          <input type="password" placeholder="Confirm password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• At least 8 characters</li>
            <li>• 1 uppercase letter recommended</li>
            <li>• 1 number recommended</li>
          </ul>
          <button disabled={loading} type="submit" className="w-full gradient-primary text-white rounded-xl px-5 py-2.5 font-medium shadow-md hover:opacity-90 transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
