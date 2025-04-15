/* eslint-disable no-undef */

import { fetchAcceptedSubmissions } from "./handlers/codeforcesHandler";
// import { checkFileExistsOnGitHub } from "./handlers/githubHandler";
import { getSubmissionCode } from "./handlers/getSubmissionCode";
import { getProblemHTML } from "./handlers/codeforcesHandler";
import { pushToGitHub } from "./handlers/githubHandler";

const langMapping = {
  "C++": "cpp",
  C: "c",
  Python: "py",
  Java: "java",
  JavaScript: "js",
  Ruby: "rb",
  Rust: "rs",
};

const getExtensionFromLanguage = (language) => {
  for (const key in langMapping) {
    if (language.indexOf(key) !== -1) {
      return langMapping[key];
    }
  }
  return "txt";
};

const cleanHTML = (html) => {
  const cleaned = html.replace(
    /<span[^>]*(class=["']MathJax-Span[^"']*["']|id=["']MathJax_Processed[^"']*["'])[^>]*>.*?<\/span>/g,
    ""
  );
  return cleaned.replace(
    /<script\b[^>]*type=["']math\/tex["'][^>]*>(.*?)<\/script>/g
  );
};

const syncLatestAcceptedSubmission = async (
  githubToken,
  linkedRepo,
  username
) => {
  if (!githubToken || !linkedRepo || !username) return;
  console.log("🔁 Syncing latest accepted submission...");

  try {
    const accepted = await fetchAcceptedSubmissions(username, 10000);
    if (accepted.length === 0) return;
    const latest = accepted[0];

    const {
      contestId,
      id: submissionId,
      index,
      problemName,
      programmingLanguage,
    } = latest;

    const folderName = `${contestId}/${index} - ${problemName}`;
    const extension = getExtensionFromLanguage(programmingLanguage);
    const filePath = `${folderName}/solution.${extension}`;
    const readmePath = `${folderName}/README.md`;

    const cacheKey = `cf-synced-${submissionId}`;
    chrome.storage.local.get([cacheKey], async (result) => {
      if (result[cacheKey]) {
        console.log(`🟡 Already synced ${folderName}, skipping...`);
        return;
      }
      const code = await getSubmissionCode(contestId, submissionId);
      if (!code) return;

      const commitMessage = `Add ${problemName} [${index}] from Codeforces`;
      const problemHTML = await getProblemHTML(contestId, index);
      const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${index}`;
      const cleanedHTML = cleanHTML(problemHTML);
      const readmeContent = cleanedHTML
        ? `<h3><a href="${problemUrl}" target="_blank" rel="noopener noreferrer">${problemName}</a></h3>\n${cleanedHTML}`
        : "Problem statement could not be retrieved.";

      const codePush = await pushToGitHub({
        repoFullName: linkedRepo,
        githubToken,
        filePath,
        commitMessage,
        content: code,
      });

      const readmePush = await pushToGitHub({
        repoFullName: linkedRepo,
        githubToken,
        filePath: readmePath,
        commitMessage: `${commitMessage} (Problem Statement)`,
        content: readmeContent,
      });

      if (codePush && readmePush) {
        const cacheKey = `cf-synced-${submissionId}`;
        chrome.storage.local.set({ [cacheKey]: true }, () => {});
        console.log(`✅ Successfully pushed ${folderName}`);
      } else {
        console.error(`❌ Failed to push one or more files to ${folderName}`);
      }
    });
  } catch (err) {
    console.warn("🚨 Error pushing latest accepted submission:", err);
  }
};

const setupPeriodicSync = async () => {
  console.log("🔄 Setting up periodic sync...");

  try {
    const [githubTokenObj, linkedRepoObj, cfHandleObj] = await Promise.all([
      new Promise((resolve) =>
        chrome.storage.local.get("githubToken", resolve)
      ),
      new Promise((resolve) => chrome.storage.local.get("linkedRepo", resolve)),
      new Promise((resolve) => chrome.storage.local.get("cf_handle", resolve)),
    ]);

    const githubToken = githubTokenObj.githubToken;
    const linkedRepo = linkedRepoObj.linkedRepo;
    const username = cfHandleObj.cf_handle;

    if (githubToken && linkedRepo && username) {
      await syncLatestAcceptedSubmission(githubToken, linkedRepo, username);
      setInterval(() => {
        syncLatestAcceptedSubmission(githubToken, linkedRepo, username);
      }, 30 * 1000);
    } else {
      console.warn("⚠️ One or more credentials missing. Skipping sync.");
    }
  } catch (error) {
    console.error("❌ Error during background sync setup:", error);
  }
};

const attached = chrome.runtime.onInstalled || chrome.runtime.onStartup;
attached.addListener(() => {
  setupPeriodicSync();
});
(async () => {
  await setupPeriodicSync();
})();
