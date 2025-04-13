import { PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = [
  "#ff6b6b",
  "#ffcc5c",
  "#4ecdc4",
  "#1a535c",
  "#5e60ce",
  "#845ec2",
  "#ffc75f",
  "#f9f871",
  "#00c9a7",
  "#f67280",
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, count } = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-2 border dark:border-gray-700 rounded shadow text-sm dark:text-white">
        <p className="font-semibold text-gray-700 dark:text-gray-200">
          Rating: {name}
        </p>
        <p className="text-gray-600 dark:text-gray-300">Solved: {count}</p>
      </div>
    );
  }
  return null;
};

const ProblemChart = ({ solvedData = [] }) => {
  if (!solvedData || solvedData.length === 0) {
    return (
      <div className="text-center mt-4">
        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">
          📊 Solved Problems
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No data available.
        </p>
      </div>
    );
  }

  const sortedSolvedData = [...solvedData].sort((a, b) => {
    if (a.name === "Unrated") return 1;
    if (b.name === "Unrated") return -1;
    return parseInt(a.name) - parseInt(b.name);
  });

  return (
    <div className="text-center mt-4">
      <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200">
        📊 Solved Problems
      </h2>

      <PieChart width={200} height={200}>
        <Pie
          data={sortedSolvedData}
          cx="50%"
          cy="50%"
          outerRadius={60}
          fill="#8884d8"
          dataKey="count"
          label>
          {sortedSolvedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </div>
  );
};

export default ProblemChart;
