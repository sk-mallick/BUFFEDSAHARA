import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { w: "W1", score: 32 },
  { w: "W2", score: 38 },
  { w: "W3", score: 34 },
  { w: "W4", score: 46 },
  { w: "W5", score: 52 },
  { w: "W6", score: 48 },
  { w: "W7", score: 60 },
  { w: "W8", score: 66 },
  { w: "W9", score: 72 },
  { w: "W10", score: 68 },
  { w: "W11", score: 78 },
  { w: "W12", score: 84 },
];

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E9DFCE",
  borderRadius: 12,
  boxShadow: "0 2px 4px rgba(31,39,51,.05), 0 8px 20px -4px rgba(31,39,51,.10)",
  fontSize: 12,
  color: "#1F2733",
};

/** Distress trend — caseworker surface. Threshold line at 70 (elevated). */
export default function CaseTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={130} initialDimension={{ width: 240, height: 130 }}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#E9DFCE" vertical={false} />
        <XAxis dataKey="w" tick={{ fontSize: 10, fill: "#66707C" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#66707C" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Week ${l.replace("W", "")}`} />
        <ReferenceLine y={70} stroke="#E0B75E" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="score" stroke="#9E4A26" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}