export const buildWeeklySolvedDays = (acceptedSubmissions = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const solvedDays = Array(7).fill(false);

  acceptedSubmissions.forEach((submission) => {
    const baseTime = submission.submissionTimestamp
      ? new Date(submission.submissionTimestamp)
      : new Date(submission.submissionTime);

    baseTime.setHours(0, 0, 0, 0);

    const daysAgo = Math.floor((today - baseTime) / (1000 * 60 * 60 * 24));
    if (daysAgo >= 0 && daysAgo < 7) {
      solvedDays[6 - daysAgo] = true;
    }
  });

  return solvedDays;
};

export const buildSolvedDataByRating = (acceptedSubmissions = []) => {
  const ratingMap = acceptedSubmissions.reduce((acc, submission) => {
    const rating = submission.problemRating || "Unrated";
    if (!acc[rating]) {
      acc[rating] = { name: rating, count: 0 };
    }

    acc[rating].count += 1;
    return acc;
  }, {});

  return Object.values(ratingMap);
};
