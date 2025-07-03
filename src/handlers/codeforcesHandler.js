import sha512 from "crypto-js/sha512";

const CODEFORCES_API = "https://codeforces.com/api/user.status";
const USER_INFO_API = "https://codeforces.com/api/user.info";
export const fetchUserInfoWithAuth = async (apiKey, apiSecret, handle) => {
  const method = "user.info";
  const time = Math.floor(Date.now() / 1000);
  const rand = Math.floor(Math.random() * 900000 + 100000);

  const params = {
    apiKey: apiKey,
    handles: handle,
    time: time,
  };

  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const sigBase = `${rand}/user.info?${paramString}#${apiSecret}`;
  const hash = sha512(sigBase).toString();
  const apiSig = `${rand}${hash}`;

  const url = `https://codeforces.com/api/${method}?${paramString}&apiSig=${apiSig}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    console.error("Response error:", data);
    throw new Error(data.comment || "Failed to fetch user info");
  }

  const user = data.result[0];
  return {
    handle: user.handle,
    rank: user.rank,
    rating: user.rating,
    maxRating: user.maxRating,
    avatar: user.titlePhoto,
  };
};

export const fetchUserInfo = async (username) => {
  try {
    const res = await fetch(`${USER_INFO_API}?handles=${username}`);
    const data = await res.json();

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
  } catch (err) {
    console.error("Error fetching user info:", err);
    return null;
  }
};

export const fetchAcceptedSubmissions = async (username, count = 10) => {
  try {
    const response = await fetch(
      `${CODEFORCES_API}?handle=${username}&count=${count}`
    );
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error("Failed to fetch submissions");
    }
    const acceptedSubmissions = data.result.filter(
      (submission) => submission.verdict === "OK"
    );
    return acceptedSubmissions.map((submission) => ({
      problemName: submission.problem.name,
      problemRating: submission.problem.rating || "Unrated",
      programmingLanguage: submission.programmingLanguage,
      submissionTime: new Date(
        submission.creationTimeSeconds * 1000
      ).toLocaleString(),
      contestId: submission.problem.contestId,
      index: submission.problem.index,
      id: submission.id,
    }));
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return [];
  }
};
