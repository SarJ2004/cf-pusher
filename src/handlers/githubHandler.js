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

// 🚀 Enhanced version with retry logic
export const pushToGitHubWithRetry = async (params, maxRetries = 3) => {
  const { filePath } = params;

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
