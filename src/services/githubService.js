const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_RATE_LIMIT_WINDOW_MS = 60000;
const GITHUB_RATE_LIMIT_MAX_REQUESTS = 60;
const REPO_CHECK_CACHE_TTL_MS = 300000;

const githubRequests = [];
const repositoryCache = new Map();

const getAuthHeaders = (githubToken, extraHeaders = {}) => ({
  Authorization: `token ${githubToken}`,
  Accept: "application/vnd.github+json",
  ...extraHeaders,
});

const canMakeGitHubRequest = () => {
  const now = Date.now();

  while (
    githubRequests.length > 0 &&
    now - githubRequests[0] > GITHUB_RATE_LIMIT_WINDOW_MS
  ) {
    githubRequests.shift();
  }

  return githubRequests.length < GITHUB_RATE_LIMIT_MAX_REQUESTS;
};

const recordGitHubRequest = () => {
  githubRequests.push(Date.now());
};

const getRepoCacheKey = (repoFullName, githubToken) =>
  `${githubToken}:${repoFullName}`;

export const checkRepositoryExists = async (repoFullName, githubToken) => {
  const cacheKey = getRepoCacheKey(repoFullName, githubToken);
  const cached = repositoryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < REPO_CHECK_CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    if (!canMakeGitHubRequest()) {
      return {
        exists: false,
        error: "GitHub request limit reached. Try again shortly.",
      };
    }

    recordGitHubRequest();
    const response = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}`, {
      method: "GET",
      headers: getAuthHeaders(githubToken),
    });

    let result;

    if (response.ok) {
      const repo = await response.json();
      result = { exists: true, repo };
    } else if (response.status === 404) {
      result = { exists: false, error: "Repository not found" };
    } else {
      const error = await response.json();
      result = { exists: false, error: error.message || "Unknown error" };
    }

    if (response.ok || response.status === 404) {
      repositoryCache.set(cacheKey, {
        timestamp: Date.now(),
        value: result,
      });
    }

    return result;
  } catch (error) {
    console.error("Failed to check repository existence:", error);
    return { exists: false, error: error.message };
  }
};

export const createRepository = async (
  repoName,
  githubToken,
  isPrivate = true,
) => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
      method: "POST",
      headers: getAuthHeaders(githubToken, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        name: repoName,
        description: "Codeforces solutions pushed by CFPusher",
        private: isPrivate,
      }),
    });

    if (response.ok) {
      const repo = await response.json();
      return { success: true, repo };
    }

    const error = await response.json();
    return { success: false, error: error.message || "Unknown error" };
  } catch (error) {
    console.error("Error creating repository:", error);
    return { success: false, error: error.message };
  }
};

export const pushToGitHub = async ({
  repoFullName,
  githubToken,
  filePath,
  commitMessage,
  content,
}) => {
  const apiUrl = `${GITHUB_API_BASE}/repos/${repoFullName}/contents/${filePath}`;

  let sha = null;

  try {
    if (!canMakeGitHubRequest()) {
      return false;
    }

    recordGitHubRequest();
    const existingFileResponse = await fetch(apiUrl, {
      method: "GET",
      headers: getAuthHeaders(githubToken),
    });

    if (existingFileResponse.ok) {
      const data = await existingFileResponse.json();
      sha = data.sha;
    } else if (existingFileResponse.status !== 404) {
      const error = await existingFileResponse.json();
      console.error("Unexpected error checking file existence:", error);
      return false;
    }
  } catch (error) {
    console.error("Failed to check file existence:", error);
    return false;
  }

  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  const body = {
    message: commitMessage,
    content: encodedContent,
    ...(sha && { sha }),
  };

  try {
    if (!canMakeGitHubRequest()) {
      return false;
    }

    recordGitHubRequest();
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to push file:", error);
    }

    return response.ok;
  } catch (error) {
    console.error("Error during push:", error);
    return false;
  }
};

export const pushToGitHubWithRetry = async (params, maxRetries = 3) => {
  const { repoFullName, githubToken, filePath } = params;

  const repoCheck = await checkRepositoryExists(repoFullName, githubToken);
  if (!repoCheck.exists) {
    console.error(
      `Repository ${repoFullName} does not exist. Cannot push files.`,
    );
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const success = await pushToGitHub(params);
    if (success) {
      return true;
    }

    if (attempt < maxRetries) {
      const delayMs = Math.pow(2, attempt - 1) * 500;
      console.warn(`Retrying ${filePath} in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error(`Failed to push ${filePath} after ${maxRetries} attempts`);
  return false;
};
