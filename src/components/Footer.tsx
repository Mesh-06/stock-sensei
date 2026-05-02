import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="gradient-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">StockSense AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Learn investing the right way. Free, AI-powered stock education for India.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li><Link to="/learn" className="hover:text-foreground">Learn</Link></li>
              <li><Link to="/chatbot" className="hover:text-foreground">AI Chatbot</Link></li>
              <li><Link to="/compare" className="hover:text-foreground">Compare</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Tools</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/sectors" className="hover:text-foreground">Sectors</Link></li>
              <li><Link to="/portfolio" className="hover:text-foreground">Portfolio</Link></li>
              <li><Link to="/watchlist" className="hover:text-foreground">Watchlist</Link></li>
              <li><Link to="/health" className="hover:text-foreground">Health Check</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Disclaimer</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Educational use only. Not investment advice. Consult a SEBI-registered advisor before investing.
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} StockSense AI · Built for learning
        </div>
      </div>
    </footer>
  );
}
