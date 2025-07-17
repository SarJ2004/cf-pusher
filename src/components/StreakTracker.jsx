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

  const getDayNames = () => {
    const names = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const dayDate = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      names.push(`${dayName}, ${dayDate}`);
    }
    return names;
  };

  const dayLabels = getLast7DayLabels();
  const dayNames = getDayNames();

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

  const streakCount = getStreakCount();
  const todaySolved = solvedDays[6]; // Today is the last index

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800">
      <div className="flex flex-col items-center">
        {/* Header with animated GIF */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <img
              src={streakLogo}
              alt="Streak Icon"
              className="w-16 h-16 filter dark:invert transition-transform duration-300 hover:scale-110"
            />
            {/* Glow effect for active streak */}
            {streakCount > 0 && (
              <div className="absolute inset-0 w-16 h-16 bg-sky-400 dark:bg-orange-400 rounded-full blur-xl opacity-20 dark:opacity-30 animate-pulse"></div>
            )}
          </div>
          <div className="text-center">
            <h2 className="font-bold text-xl text-gray-800 dark:text-white">
              Your Streak!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Keep it going! 🔥
            </p>
          </div>
        </div>

        {/* Streak Count Display with enhanced styling */}
        <div className="mb-4">
          <div className="relative">
            <p className="text-4xl font-extrabold text-center transition-all duration-500 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
              {streakCount}
            </p>
            <p className="text-lg font-medium text-center text-gray-600 dark:text-gray-300 -mt-1">
              Day{streakCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Motivational message */}
        <div className="text-center mb-4">
          {todaySolved ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✅ Great! You solved today!
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💪 Solve one today to keep it up!
            </p>
          )}
        </div>
      </div>

      {/* Enhanced day circles with better animations */}
      <div className="flex justify-center gap-2 mt-4">
        {solvedDays.length > 0 ? (
          solvedDays.map((solved, index) => {
            const isToday = index === 6;
            const isYesterday = index === 5;

            let bgColor = "bg-gray-200 dark:bg-gray-700";
            let textColor = "text-gray-500 dark:text-gray-400";
            let borderColor = "border-gray-300 dark:border-gray-600";
            let animation = "";

            if (solved) {
              bgColor = "bg-gradient-to-br from-green-400 to-green-600";
              textColor = "text-white";
              borderColor = "border-green-500";
              animation = "hover:scale-110";
            } else if (isToday) {
              bgColor = "bg-gradient-to-br from-yellow-400 to-orange-500";
              textColor = "text-white";
              borderColor = "border-yellow-500";
              animation = "animate-bounce hover:animate-none hover:scale-110";
            } else if (isYesterday && !solved) {
              bgColor = "bg-gradient-to-br from-red-400 to-red-600";
              textColor = "text-white";
              borderColor = "border-red-500";
            }

            return (
              <div
                key={index}
                className={`
                  relative group w-10 h-10 flex items-center justify-center 
                  rounded-full text-white text-sm font-bold shadow-sm 
                  border-2 transition-all duration-300 cursor-pointer
                  ${bgColor} ${textColor} ${borderColor} ${animation}
                `}
                title={dayNames[index]}
                role="button"
                tabIndex={0}
                aria-label={`${dayNames[index]} - ${
                  solved ? "Solved" : "Not solved"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    // Could trigger some action if needed
                  }
                }}>
                {dayLabels[index]}

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                  <div className="text-center">
                    <p className="font-medium">{dayNames[index]}</p>
                    <p className="text-xs text-gray-300">
                      {solved ? "✅ Solved" : "❌ Not solved"}
                    </p>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-900"></div>
                </div>

                {/* Success indicator for solved days */}
                {solved && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  </div>
                )}

                {/* Pulse effect for today */}
                {isToday && !solved && (
                  <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-50 animate-ping"></div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 dark:border-orange-500"></div>
            <p className="text-gray-500 dark:text-gray-400 ml-2 text-sm">
              Loading streak data...
            </p>
          </div>
        )}
      </div>

      {/* Progress bar for weekly goal */}
      {solvedDays.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Weekly Progress
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {solvedDays.filter((day) => day).length}/7 days
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-orange-400 dark:to-red-500 h-2.5 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${(solvedDays.filter((day) => day).length / 7) * 100}%`,
              }}></div>
          </div>

          {/* Achievement badge for perfect week */}
          {solvedDays.filter((day) => day).length === 7 && (
            <div className="flex justify-center mt-3">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                🏆 Perfect Week!
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StreakTracker;
