interface Props { className?: string; height?: string | number }

export function Skeleton({ className = "", height }: Props) {
  return (
    <div
      className={`shimmer rounded-xl ${className}`}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    />
  );
}
