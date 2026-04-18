const CODEFORCES_STATUS_API = "https://codeforces.com/api/user.status";
const CODEFORCES_USER_API = "https://codeforces.com/api/user.info";

const mapSubmission = (submission) => ({
  problemName: submission.problem.name,
  problemRating: submission.problem.rating || "Unrated",
  programmingLanguage: submission.programmingLanguage,
  submissionTime: new Date(
    submission.creationTimeSeconds * 1000,
  ).toLocaleString(),
  submissionTimestamp: submission.creationTimeSeconds * 1000,
  contestId: submission.problem.contestId,
  index: submission.problem.index,
  id: submission.id,
});

export const fetchUserInfo = async (username) => {
  try {
    const response = await fetch(
      `${CODEFORCES_USER_API}?handles=${encodeURIComponent(username)}`,
    );
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error("Failed to fetch user info");
    }

    const user = data.result[0];
    return {
      handle: user.handle,
      rating: user.rating || "Unrated",
      maxRating: user.maxRating || "Unrated",
      rank: user.rank || "Unranked",
      avatar: user.titlePhoto,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

export const fetchAcceptedSubmissions = async (username, count = 20) => {
  try {
    const response = await fetch(
      `${CODEFORCES_STATUS_API}?handle=${encodeURIComponent(
        username,
      )}&count=${count}`,
    );
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error("Failed to fetch submissions");
    }

    return data.result
      .filter((submission) => submission.verdict === "OK")
      .map(mapSubmission);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return [];
  }
};
