export default function Sparkline({
  data = [40, 45, 42, 55, 60, 58, 72, 70, 78],
  color = "var(--color-marigold-600)",
  width = 96,
  height = 28,
  className,
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = Math.max((max - min) * 0.15, 2);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((v - (min - pad)) / (max + pad - (min - pad))) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}