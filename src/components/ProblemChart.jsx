import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Label,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#0ea5e9",
  "#64748b",
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, count } = payload[0].payload;
    const percentage = payload[0].payload.percentage;

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-600 rounded-lg shadow-lg text-sm dark:text-white transition-all duration-200">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: payload[0].color }}></div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            Rating: {name}
          </p>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Problems: <span className="font-medium">{count}</span>
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          {percentage}% of total
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => {
  if (!payload || payload.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
        Rating Distribution
      </h4>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5 p-1">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-600 dark:text-gray-400 truncate">
              {entry.value}: {entry.payload.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProblemChart = ({ solvedData = [] }) => {
  if (!solvedData || solvedData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 transition-all duration-300 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">
            Problem Distribution
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No solved problems data available yet.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Start solving problems to see your rating distribution!
          </p>
        </div>
      </div>
    );
  }

  const sortedSolvedData = [...solvedData].sort((a, b) => {
    if (a.name === "Unrated") return 1;
    if (b.name === "Unrated") return -1;
    return parseInt(a.name) - parseInt(b.name);
  });

  const total = sortedSolvedData.reduce((sum, entry) => sum + entry.count, 0);
  const dataWithPercentages = sortedSolvedData.map((entry) => ({
    ...entry,
    percentage: ((entry.count / total) * 100).toFixed(1),
  }));

  const getStats = () => {
    const ratedProblems = dataWithPercentages.filter(
      (item) => item.name !== "Unrated"
    );
    const avgRating =
      ratedProblems.length > 0
        ? Math.round(
            ratedProblems.reduce(
              (sum, item) => sum + parseInt(item.name) * item.count,
              0
            ) / ratedProblems.reduce((sum, item) => sum + item.count, 0)
          )
        : 0;

    const highestRating =
      ratedProblems.length > 0
        ? Math.max(...ratedProblems.map((item) => parseInt(item.name)))
        : 0;

    return { avgRating, highestRating, totalProblems: total };
  };

  const stats = getStats();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800">
      {/* Header with stats */}
      <div className="text-center mb-4">
        <h2 className="font-bold text-xl text-gray-800 dark:text-gray-200 mb-2">
          📊 Problem Analysis
        </h2>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalProblems}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.avgRating || "N/A"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Avg Rating
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.highestRating || "N/A"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Highest</p>
          </div>
        </div>
      </div>

      {/* Enhanced pie chart */}
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={dataWithPercentages}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="count"
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out">
              {dataWithPercentages.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                />
              ))}

              {/* Enhanced center label with multiple lines */}
              <Label
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox;
                  return (
                    <g>
                      <text
                        x={cx}
                        y={cy - 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-2xl font-bold fill-gray-800 dark:fill-gray-200">
                        {total}
                      </text>
                      <text
                        x={cx}
                        y={cy + 12}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-sm fill-gray-500 dark:fill-gray-400">
                        Problems
                      </text>
                    </g>
                  );
                }}
              />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend with grid layout */}
      <CustomLegend
        payload={dataWithPercentages.map((item, index) => ({
          value: item.name,
          color: COLORS[index % COLORS.length],
          payload: item,
        }))}
      />
    </div>
  );
};

export default ProblemChart;
