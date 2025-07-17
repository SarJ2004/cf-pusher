// 🚀 Check if repository exists
export const checkRepositoryExists = async (repoFullName, githubToken) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}`,
      {
        method: "GET",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (response.ok) {
      const repoData = await response.json();
      console.log(`✅ Repository ${repoFullName} exists`);
      return { exists: true, repo: repoData };
    } else if (response.status === 404) {
      console.log(`❌ Repository ${repoFullName} does not exist`);
      return { exists: false, error: "Repository not found" };
    } else {
      const error = await response.json();
      console.error("Error checking repository:", error);
      return { exists: false, error: error.message || "Unknown error" };
    }
  } catch (error) {
    console.error("Failed to check repository existence:", error);
    return { exists: false, error: error.message };
  }
};

// 🚀 Create repository if it doesn't exist
export const createRepository = async (
  repoName,
  githubToken,
  isPrivate = true
) => {
  try {
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        name: repoName,
        description: "Codeforces solutions pushed by CFPusher",
        private: isPrivate,
      }),
    });

    if (response.ok) {
      const repoData = await response.json();
      console.log(`✅ Repository ${repoData.full_name} created successfully`);
      return { success: true, repo: repoData };
    } else {
      const error = await response.json();
      console.error("Failed to create repository:", error);
      return { success: false, error: error.message || "Unknown error" };
    }
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
  const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;

  let sha = null;

  try {
    const existingFileRes = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (existingFileRes.ok) {
      const data = await existingFileRes.json();
      sha = data.sha;
    } else if (existingFileRes.status !== 404) {
      const error = await existingFileRes.json();
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
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Failed to push file:", error);
    }

    return res.ok;
  } catch (error) {
    console.error("Error during push:", error);
    return false;
  }
};

// 🚀 Enhanced version with retry logic and repository validation
export const pushToGitHubWithRetry = async (params, maxRetries = 3) => {
  const { repoFullName, githubToken, filePath } = params;

  // 🚀 CRITICAL: Check if repository exists before attempting to push
  console.log(`🔍 Checking if repository ${repoFullName} exists...`);
  const repoCheck = await checkRepositoryExists(repoFullName, githubToken);

  if (!repoCheck.exists) {
    console.error(
      `❌ Repository ${repoFullName} does not exist. Cannot push files.`
    );
    console.error(
      `💡 Please create the repository first or link to an existing repository.`
    );
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`📤 Attempt ${attempt}/${maxRetries} for ${filePath}`);

    const success = await pushToGitHub(params);

    if (success) {
      if (attempt > 1) {
        console.log(`✅ Success on retry ${attempt} for ${filePath}`);
      }
      return true;
    }

    if (attempt < maxRetries) {
      // Faster exponential backoff: 0.5s, 1s, 2s
      const delay = Math.pow(2, attempt - 1) * 500;
      console.log(`⏳ Retrying ${filePath} in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      console.error(
        `❌ Failed to push ${filePath} after ${maxRetries} attempts`
      );
    }
  }

  return false;
};
