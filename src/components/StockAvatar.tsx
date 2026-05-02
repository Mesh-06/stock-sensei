import { useMemo } from "react";

interface Props {
  symbol: string;
  size?: number;
  className?: string;
}

// Deterministic gradient avatar based on symbol initials
export function StockAvatar({ symbol, size = 40, className = "" }: Props) {
  const initials = symbol.slice(0, 2).toUpperCase();
  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
    return h % 360;
  }, [symbol]);
  const fontSize = Math.round(size * 0.4);
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 80% 60%))`,
        fontSize,
      }}
    >
      {initials}
    </div>
  );
}
