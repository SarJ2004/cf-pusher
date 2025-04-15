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

// export const checkFileExistsOnGitHub = async ({
//   repoFullName,
//   githubToken,
//   filePath,
// }) => {
//   const url = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;

//   try {
//     const res = await fetch(url, {
//       method: "GET",
//       headers: {
//         Authorization: `token ${githubToken}`,
//         Accept: "application/vnd.github+json",
//       },
//     });

//     if (res.status === 200) {
//       return true;
//     }

//     if (res.status === 404) {
//       return false;
//     }
//     const errorData = await res.json();
//     console.error(
//       `Unexpected response from GitHub (status ${res.status}):`,
//       errorData.message || errorData
//     );

//     return false;
//   } catch (error) {
//     console.error("Network/fetch error in checkFileExistsOnGitHub:", error);
//     return false;
//   }
// };
