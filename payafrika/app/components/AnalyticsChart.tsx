import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface ChartProps {
  data: Record<string, unknown>[];
  type: "line" | "bar";
  dataKeys: { key: string; color: string; name?: string }[];
  xKey?: string;
  height?: number;
}

export function AnalyticsChart({
  data,
  type,
  dataKeys,
  xKey = "month",
  height = 300,
}: ChartProps) {
  const Chart = type === "line" ? LineChart : BarChart;
  const DataElement = type === "line" ? Line : Bar;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        {dataKeys.map(({ key, color, name }) =>
          type === "line" ? (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              name={name || key}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ) : (
            <Bar key={key} dataKey={key} fill={color} name={name || key} />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
