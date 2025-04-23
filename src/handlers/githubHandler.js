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
