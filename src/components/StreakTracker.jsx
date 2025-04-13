const StreakTracker = ({ solvedDays = [] }) => {
  const getLast7DayLabels = () => {
    const labels = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayShort = d.toLocaleDateString("en-US", { weekday: "short" });
      labels.push(dayShort[0]);
    }
    return labels;
  };

  const dayLabels = getLast7DayLabels();

  return (
    <div className="text-center">
      <h2 className="font-bold text-lg">🔥 Your Streak!</h2>
      <p className="text-sm text-gray-600">Solve one today to keep it up!</p>
      <div className="flex justify-center gap-2 mt-2">
        {solvedDays.length > 0 ? (
          solvedDays.map((solved, index) => {
            const isToday = index === 6;
            let bgColor = "bg-red-400";

            if (solved) {
              bgColor = "bg-green-400";
            } else if (isToday) {
              bgColor = "bg-yellow-400";
            }

            return (
              <div
                key={index}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm ${bgColor}`}
                title={`Day ${index + 1}`}>
                {dayLabels[index]}
              </div>
            );
          })
        ) : (
          <p className="text-gray-500">Loading streak data...</p>
        )}
      </div>
    </div>
  );
};

export default StreakTracker;
