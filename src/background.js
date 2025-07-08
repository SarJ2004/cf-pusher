/* eslint-disable no-undef */
import { fetchAcceptedSubmissions } from "./handlers/codeforcesHandler";
import {
  getSubmissionCode,
  getProblemStatement,
} from "./handlers/getSubmissionCode";
import { pushToGitHubWithRetry } from "./handlers/githubHandler";
let isSyncing = false;

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
  if (!html) return "Problem statement could not be retrieved.";

  let cleaned = html;

  // Step 1: Extract LaTeX from script tags and convert to GitHub math syntax
  cleaned = cleaned.replace(
    /<script\b[^>]*type=["']math\/tex["'][^>]*>(.*?)<\/script>/g,
    (match, mathContent) => {
      // Convert inline math to GitHub format
      return `$${mathContent.trim()}$`;
    }
  );

  // Step 2: Extract LaTeX from script tags with display mode
  cleaned = cleaned.replace(
    /<script\b[^>]*type=["']math\/tex;\s*mode=display["'][^>]*>(.*?)<\/script>/g,
    (match, mathContent) => {
      // Convert display math to GitHub format
      return `$$${mathContent.trim()}$$`;
    }
  );

  // Step 3: Remove processed MathJax spans but try to extract any remaining math
  cleaned = cleaned.replace(
    /<span[^>]*class=["'][^"']*MathJax[^"']*["'][^>]*>(.*?)<\/span>/g,
    (match, content) => {
      // Try to extract any text content from MathJax spans
      const textContent = content.replace(/<[^>]*>/g, "").trim();
      return textContent || "";
    }
  );

  // Step 4: Clean up other MathJax artifacts
  cleaned = cleaned.replace(
    /<span[^>]*id=["']MathJax[^"']*["'][^>]*>.*?<\/span>/g,
    ""
  );

  // Step 5: Remove MathJax configuration and other scripts
  cleaned = cleaned.replace(/<script[^>]*MathJax[^>]*>.*?<\/script>/gs, "");

  // Step 6: Convert common HTML entities and clean up formatting
  cleaned = cleaned
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Step 7: Remove empty paragraphs and extra whitespace
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, "");
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n");

  return cleaned;
};

// Alternative: Simpler approach that preserves more HTML structure
const simpleCleanHTML = (html) => {
  if (!html) return "Problem statement could not be retrieved.";

  let cleaned = html;

  // Extract math expressions first
  cleaned = cleaned.replace(
    /<script\b[^>]*type=["']math\/tex["'][^>]*>(.*?)<\/script>/g,
    (match, mathContent) => `$${mathContent.trim()}$`
  );

  cleaned = cleaned.replace(
    /<script\b[^>]*type=["']math\/tex;\s*mode=display["'][^>]*>(.*?)<\/script>/g,
    (match, mathContent) => `$$${mathContent.trim()}$$`
  );

  // Remove all other scripts and MathJax artifacts
  cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gs, "");
  cleaned = cleaned.replace(/<[^>]*MathJax[^>]*>/g, "");

  // Clean up HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");

  return cleaned;
};

const syncLatestAcceptedSubmission = async (
  githubToken,
  linkedRepo,
  username
) => {
  if (!githubToken || !linkedRepo || !username || isSyncing) return;

  isSyncing = true;
  console.log("🔁 Syncing latest accepted submission...");
  const startTime = Date.now();

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

    const cacheKey = `cf-synced-problems`;
    const problemCacheKey = `cf-problem-${contestId}-${index}`;

    const result = await chrome.storage.sync.get([cacheKey]);
    let syncedProblems = result[cacheKey] || {};
    if (syncedProblems[submissionId]) {
      console.log(`🟡 Already synced ${folderName}, skipping...`);
      return;
    }

    console.log("⚡ Starting parallel fetch operations...");

    // 🚀 OPTIMIZATION 1: Run code and problem fetching in parallel
    const [codeResult, problemResult] = await Promise.allSettled([
      getSubmissionCode(contestId, submissionId),
      getProblemStatementCached(contestId, index, problemCacheKey),
    ]);

    // Handle code result
    if (codeResult.status === "rejected" || !codeResult.value) {
      console.error(
        "❌ Failed to get submission code:",
        codeResult.reason?.message
      );
      return;
    }
    const code = codeResult.value;

    // Handle problem result (non-blocking)
    let problemHTML = null;
    if (problemResult.status === "fulfilled" && problemResult.value) {
      problemHTML = problemResult.value;
    } else {
      console.warn(
        "⚠️ Could not retrieve problem statement:",
        problemResult.reason?.message
      );
    }

    console.log("⚡ Processing content...");
    const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${index}`;

    // 🚀 OPTIMIZATION 2: Use simpler HTML cleaning by default
    const cleanedHTML = problemHTML ? simpleCleanHTML(problemHTML) : null;
    const readmeContent = cleanedHTML
      ? `<h3><a href="${problemUrl}" target="_blank" rel="noopener noreferrer">${problemName}</a></h3>\n\n${cleanedHTML}`
      : `<h3><a href="${problemUrl}" target="_blank" rel="noopener noreferrer">${problemName}</a></h3>\n\nProblem statement could not be retrieved. Please visit the link above.`;

    const commitMessage = `Add ${problemName} [${index}] from Codeforces`;

    console.log("⚡ Starting GitHub push operations...");

    // 🚀 OPTIMIZATION 3: Push README first to create folder, then code
    // This prevents race conditions when creating the same folder simultaneously

    let codePushSuccess = false;
    let readmePushSuccess = false;

    try {
      // Step 1: Push README first (creates the folder structure)
      console.log("📝 Pushing README first...");
      readmePushSuccess = await pushToGitHubWithRetry({
        repoFullName: linkedRepo,
        githubToken,
        filePath: readmePath,
        commitMessage: `${commitMessage} (Problem Statement)`,
        content: readmeContent,
      });

      if (readmePushSuccess) {
        console.log("✅ README pushed successfully");

        // Small delay to ensure GitHub processes the folder creation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Step 2: Push code after README succeeds (folder now exists)
        console.log("💻 Pushing code...");
        codePushSuccess = await pushToGitHubWithRetry({
          repoFullName: linkedRepo,
          githubToken,
          filePath,
          commitMessage,
          content: code,
        });

        if (codePushSuccess) {
          console.log("✅ Code pushed successfully");
        } else {
          console.error("❌ Code push failed after retries");
        }
      } else {
        console.error("❌ README push failed, skipping code push");
      }
    } catch (error) {
      console.error("❌ Error during GitHub push operations:", error);
    }

    if (codePushSuccess && readmePushSuccess) {
      syncedProblems[submissionId] = true;
      await chrome.storage.sync.set({ [cacheKey]: syncedProblems });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Successfully pushed ${folderName} in ${elapsed}s`);
    } else {
      console.error(`❌ Failed to push one or more files to ${folderName}`);
      if (codePushSuccess === false) {
        console.error("Code push failed");
      }
      if (readmePushSuccess === false) {
        console.error("README push failed");
      }
    }
  } catch (err) {
    console.warn("🚨 Error pushing latest accepted submission:", err);
  } finally {
    isSyncing = false;
  }
};

// 🚀 OPTIMIZATION 4: Cached problem statement fetching
const getProblemStatementCached = async (contestId, index, cacheKey) => {
  try {
    // Check cache first
    const cached = await chrome.storage.local.get([cacheKey]);
    if (cached[cacheKey]) {
      console.log(
        `📦 Using cached problem statement for ${contestId}/${index}`
      );
      return cached[cacheKey];
    }

    // Fetch from source
    console.log(`🌐 Fetching problem statement for ${contestId}/${index}`);
    const problemHTML = await getProblemStatement(contestId, index);

    // Cache the result (only if successful)
    if (problemHTML) {
      await chrome.storage.local.set({ [cacheKey]: problemHTML });
    }

    return problemHTML;
  } catch (error) {
    console.error("Error in getProblemStatementCached:", error);
    return null;
  }
};

const setupPeriodicSync = async () => {
  console.log("🔄 Setting up periodic sync...");

  try {
    const [githubTokenObj, linkedRepoObj, cfHandleObj] = await Promise.all([
      new Promise((resolve) => chrome.storage.sync.get("githubToken", resolve)),
      new Promise((resolve) => chrome.storage.sync.get("linkedRepo", resolve)),
      new Promise((resolve) => chrome.storage.sync.get("cf_handle", resolve)),
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
