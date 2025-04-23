import streakLogo from "../assets/streak.gif"; // Adjust the path as needed

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
  const getStreakCount = () => {
    let count = 0;
    for (let i = solvedDays.length - 1; i >= 0; i--) {
      if (solvedDays[i]) {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  return (
    <div className="text-center bg-white dark:bg-gray-900 rounded-2xl p-4 transition-colors duration-300">
      <div className="flex flex-col items-center">
        {/* Header with GIF */}
        <div className="flex items-center gap-2 mb-1">
          <img
            src={streakLogo}
            alt="Streak Icon"
            className="w-20 h-20 filter dark:invert"
          />
          <h2 className="font-extrabold text-xl text-gray-800 dark:text-white">
            Your Streak!
          </h2>
        </div>

        {/* 🔥 Streak Count Display */}
        <p className="text-3xl text-center font-medium text-blue-500 dark:text-orange-500">
          {getStreakCount()} Day{getStreakCount() !== 1 ? "s" : ""}
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Solve one today to keep it up!
        </p>
      </div>

      <div className="flex justify-center gap-3 mt-4">
        {solvedDays.length > 0 ? (
          solvedDays.map((solved, index) => {
            const isToday = index === 6;
            let bgColor = "bg-red-400";

            if (solved) {
              bgColor = "bg-green-500";
            } else if (isToday) {
              bgColor = "bg-yellow-400 animate-bounce";
            }

            return (
              <div
                key={index}
                className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-base font-semibold shadow-sm ${bgColor}`}
                title={`Day ${index + 1}`}>
                {dayLabels[index]}
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Loading streak data...
          </p>
        )}
      </div>
    </div>
  );
};

export default StreakTracker;
