import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) toast.error(error);
    else setSent(true);
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
        {sent ? (
          <div className="text-center">
            <h1 className="text-xl font-extrabold">Check your email</h1>
            <p className="text-sm text-muted-foreground mt-2">We sent a reset link to <strong>{email}</strong>.</p>
            <Link to="/login" className="mt-6 inline-block text-primary font-medium hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-center">Reset your password</h1>
            <p className="text-sm text-muted-foreground text-center mt-1">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
              <button disabled={loading} type="submit" className="w-full gradient-primary text-white rounded-xl px-5 py-2.5 font-medium shadow-md hover:opacity-90 transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
