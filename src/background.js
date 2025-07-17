/* eslint-disable no-undef */
import { fetchAcceptedSubmissions } from "./handlers/codeforcesHandler";
import {
  getSubmissionCode,
  getProblemStatement,
} from "./handlers/getSubmissionCode";
import { pushToGitHubWithRetry } from "./handlers/githubHandler";

let isSyncing = false;
let lastSyncTime = 0;
let lastSubmissionId = null;

// 🚀 PERFORMANCE IMPROVEMENT: Ultra-fast sync for instant response
const SYNC_INTERVAL_MINUTES = 0.1; // 6 seconds for ultra-fast response
const MIN_SYNC_INTERVAL_MS = 2000; // Minimum 2 seconds between syncs for maximum responsiveness

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

// 🚀 IMPROVEMENT: Add rate limiting protection
const rateLimitTracker = {
  codeforcesRequests: [],
  githubRequests: [],

  canMakeRequest(type) {
    const now = Date.now();
    const requests =
      type === "codeforces" ? this.codeforcesRequests : this.githubRequests;
    const limit = type === "codeforces" ? 5 : 60; // CF: 5 per minute, GitHub: 60 per minute

    // Remove requests older than 1 minute
    while (requests.length > 0 && now - requests[0] > 60000) {
      requests.shift();
    }

    return requests.length < limit;
  },

  recordRequest(type) {
    const requests =
      type === "codeforces" ? this.codeforcesRequests : this.githubRequests;
    requests.push(Date.now());
  },
};

// 🚀 IMPROVEMENT: Enhanced caching with TTL - optimized for ultra-fast sync
const cache = {
  submissions: { data: null, timestamp: 0, ttl: 30000 }, // 30 seconds TTL for ultra-fast updates
  problems: new Map(), // Map for problem statements with individual TTL

  get(key) {
    if (key === "submissions") {
      const now = Date.now();
      if (
        this.submissions.data &&
        now - this.submissions.timestamp < this.submissions.ttl
      ) {
        return this.submissions.data;
      }
      return null;
    }

    const problem = this.problems.get(key);
    if (problem && Date.now() - problem.timestamp < 900000) {
      // 15 minutes TTL for problems (ultra-fast updates)
      return problem.data;
    }
    return null;
  },

  set(key, value) {
    if (key === "submissions") {
      this.submissions = { data: value, timestamp: Date.now(), ttl: 30000 }; // 30 seconds TTL
    } else {
      this.problems.set(key, { data: value, timestamp: Date.now() });
    }
  },
};

// 🚀 IMPROVEMENT: Optimized problem statement fetching with better caching
const getProblemStatementCached = async (contestId, index, cacheKey) => {
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`📋 Using cached problem statement for ${contestId}-${index}`);
    return cached;
  }

  try {
    console.log(`🌐 Fetching problem statement for ${contestId}-${index}`);
    const problemHTML = await getProblemStatement(contestId, index);

    if (problemHTML) {
      cache.set(cacheKey, problemHTML);
      console.log(`✅ Cached problem statement for ${contestId}-${index}`);
    }

    return problemHTML;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch problem statement: ${error.message}`);
    return null;
  }
};

// 🚀 IMPROVEMENT: Simple HTML cleaning with better performance
const simpleCleanHTML = (html) => {
  if (!html) return null;

  try {
    let cleaned = html;

    // Handle MathJax more efficiently
    cleaned = cleaned.replace(
      /<script[^>]*type=["']math\/tex[^"']*["'][^>]*>(.*?)<\/script>/g,
      (match, mathContent) => `$${mathContent.trim()}$`
    );

    // Remove scripts and clean HTML
    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gs, "");
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gs, "");

    // Clean HTML entities more efficiently
    const entityMap = {
      "&lt;": "<",
      "&gt;": ">",
      "&amp;": "&",
      "&quot;": '"',
      "&nbsp;": " ",
      "&apos;": "'",
    };

    cleaned = cleaned.replace(/&(lt|gt|amp|quot|nbsp|apos);/g, (match) => {
      return entityMap[match] || match;
    });

    return cleaned;
  } catch (error) {
    console.warn("⚠️ Error cleaning HTML:", error);
    return html; // Return original if cleaning fails
  }
};

// 🚀 IMPROVEMENT: Optimized sync function with better error handling and performance
const syncLatestAcceptedSubmission = async (
  githubToken,
  linkedRepo,
  username
) => {
  if (!githubToken || !linkedRepo || !username || isSyncing) return;

  // 🚀 Rate limiting check
  if (!rateLimitTracker.canMakeRequest("codeforces")) {
    console.warn("⏳ Rate limit reached for Codeforces API, skipping sync");
    return;
  }

  // 🚀 Minimum time between syncs
  const now = Date.now();
  if (now - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
    console.log("⏳ Too soon since last sync, skipping");
    return;
  }

  isSyncing = true;
  lastSyncTime = now;
  console.log("🔁 Syncing latest accepted submission...");
  const startTime = Date.now();

  try {
    // 🚀 Try cache first
    let accepted = cache.get("submissions");

    if (!accepted) {
      console.log("🌐 Fetching submissions from API");
      rateLimitTracker.recordRequest("codeforces");
      accepted = await fetchAcceptedSubmissions(username, 100); // Fetch more submissions for comprehensive sync
      cache.set("submissions", accepted);
    } else {
      console.log("📋 Using cached submissions");
    }

    if (accepted.length === 0) {
      console.log("📭 No accepted submissions found");
      return;
    }

    const latest = accepted[0];
    const {
      contestId,
      id: submissionId,
      index,
      problemName,
      programmingLanguage,
    } = latest;

    // 🚀 Quick check if this submission was already processed
    if (lastSubmissionId === submissionId) {
      console.log("✅ Latest submission already processed");
      return;
    }

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
      lastSubmissionId = submissionId;
      return;
    }

    console.log("⚡ Starting parallel fetch operations...");

    // 🚀 OPTIMIZATION: Run code and problem fetching in parallel
    const [codeResult, problemResult] = await Promise.allSettled([
      getSubmissionCode(contestId, submissionId),
      getProblemStatementCached(contestId, index, problemCacheKey),
    ]);

    // Handle code result
    if (codeResult.status === "rejected" || !codeResult.value) {
      const errorMsg = codeResult.reason?.message || "Unknown error";
      console.error("❌ Failed to get submission code:", errorMsg);

      // Check if it's an access issue
      if (
        errorMsg.includes("access denied") ||
        errorMsg.includes("permission")
      ) {
        console.log("🔒 Submission may be private or restricted");
      } else if (errorMsg.includes("Timeout")) {
        console.log("⏱️ Request timed out - page may be slow or inaccessible");
      }
      return;
    }
    const code = codeResult.value;

    // Handle problem result (non-blocking)
    let problemHTML = null;
    if (problemResult.status === "fulfilled" && problemResult.value) {
      problemHTML = problemResult.value;
    } else {
      const errorMsg = problemResult.reason?.message || "Unknown error";
      console.warn("⚠️ Could not retrieve problem statement:", errorMsg);

      // Check if it's an access issue
      if (
        errorMsg.includes("access denied") ||
        errorMsg.includes("permission")
      ) {
        console.log("🔒 Problem may be from a private contest or restricted");
      } else if (errorMsg.includes("Timeout")) {
        console.log("⏱️ Problem statement request timed out");
      }
    }

    console.log("⚡ Processing content...");
    const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${index}`;

    // 🚀 OPTIMIZATION: Use simpler HTML cleaning by default
    const cleanedHTML = problemHTML ? simpleCleanHTML(problemHTML) : null;
    const readmeContent = cleanedHTML
      ? `<h3><a href="${problemUrl}" target="_blank" rel="noopener noreferrer">${problemName}</a></h3>\n\n${cleanedHTML}`
      : `<h3><a href="${problemUrl}" target="_blank" rel="noopener noreferrer">${problemName}</a></h3>\n\nProblem statement could not be retrieved. Please visit the link above.`;

    const commitMessage = `Add ${problemName} [${index}] from Codeforces`;

    console.log("⚡ Starting GitHub push operations...");

    // 🚀 Rate limiting check for GitHub
    if (!rateLimitTracker.canMakeRequest("github")) {
      console.warn("⏳ Rate limit reached for GitHub API, skipping push");
      return;
    }

    let codePushSuccess = false;
    let readmePushSuccess = false;

    try {
      // Step 1: Push README first (creates the folder structure)
      console.log("📝 Pushing README first...");
      rateLimitTracker.recordRequest("github");
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
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Step 2: Push code after README succeeds (folder now exists)
        console.log("💻 Pushing code...");
        rateLimitTracker.recordRequest("github");
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
      lastSubmissionId = submissionId;

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

// 🚀 IMPROVEMENT: Optimized periodic sync setup
const setupPeriodicSync = async () => {
  console.log("🔄 Setting up optimized periodic sync...");

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
      // Clear existing alarms
      await chrome.alarms.clear("cfPusherSync");

      // Perform immediate sync
      await syncLatestAcceptedSubmission(githubToken, linkedRepo, username);

      // 🚀 Set up optimized periodic alarm (every 1 minute instead of 10 seconds)
      await chrome.alarms.create("cfPusherSync", {
        delayInMinutes: SYNC_INTERVAL_MINUTES,
        periodInMinutes: SYNC_INTERVAL_MINUTES,
      });

      console.log(
        `✅ Ultra-fast sync alarm created - will trigger every ${
          SYNC_INTERVAL_MINUTES * 60
        } seconds for instant response`
      );
    } else {
      console.warn("⚠️ One or more credentials missing. Skipping sync.");
      // Clear alarm if credentials are missing
      await chrome.alarms.clear("cfPusherSync");
    }
  } catch (error) {
    console.error("❌ Error during background sync setup:", error);
  }
};

// 🚀 IMPROVEMENT: Better alarm handling with error recovery
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "cfPusherSync") {
    console.log("⏰ Periodic sync alarm triggered");

    try {
      const [githubTokenObj, linkedRepoObj, cfHandleObj] = await Promise.all([
        new Promise((resolve) =>
          chrome.storage.sync.get("githubToken", resolve)
        ),
        new Promise((resolve) =>
          chrome.storage.sync.get("linkedRepo", resolve)
        ),
        new Promise((resolve) => chrome.storage.sync.get("cf_handle", resolve)),
      ]);

      const githubToken = githubTokenObj.githubToken;
      const linkedRepo = linkedRepoObj.linkedRepo;
      const username = cfHandleObj.cf_handle;

      if (githubToken && linkedRepo && username) {
        await syncLatestAcceptedSubmission(githubToken, linkedRepo, username);
      } else {
        console.warn("⚠️ Missing credentials during alarm, clearing alarm");
        await chrome.alarms.clear("cfPusherSync");
      }
    } catch (error) {
      console.error("❌ Error during alarm sync:", error);
    }
  }
});

// 🚀 IMPROVEMENT: Enhanced startup logic with immediate sync
chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Extension startup detected - triggering immediate sync");
  setupPeriodicSync();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("🎉 Extension installed/updated - triggering immediate sync");
  setupPeriodicSync();
});

// 🚀 IMPROVEMENT: Handle storage changes to restart sync when credentials change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    const credentialKeys = ["githubToken", "linkedRepo", "cf_handle"];
    const hasCredentialChanges = credentialKeys.some((key) => changes[key]);

    if (hasCredentialChanges) {
      console.log("🔄 Credentials changed, restarting sync");
      setTimeout(setupPeriodicSync, 1000); // Small delay to ensure all changes are saved
    }
  }
});

// 🚀 IMPROVEMENT: Enhanced message handling for faster sync
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "manualSync") {
    console.log("🔄 Manual sync triggered from popup");

    chrome.storage.sync.get(
      ["githubToken", "linkedRepo", "cf_handle"],
      async (result) => {
        const { githubToken, linkedRepo, cf_handle } = result;

        if (githubToken && linkedRepo && cf_handle) {
          try {
            await syncLatestAcceptedSubmission(
              githubToken,
              linkedRepo,
              cf_handle
            );
            sendResponse({ success: true });
          } catch (error) {
            console.error("Manual sync failed:", error);
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: "Missing credentials" });
        }
      }
    );

    return true; // Indicates we will send a response asynchronously
  }

  // 🚀 NEW: Immediate sync trigger when user activity is detected on Codeforces
  if (request.action === "triggerImmediateSync") {
    console.log("⚡ Immediate sync triggered by user activity");

    chrome.storage.sync.get(
      ["githubToken", "linkedRepo", "cf_handle"],
      async (result) => {
        const { githubToken, linkedRepo, cf_handle } = result;

        if (githubToken && linkedRepo && cf_handle) {
          // Clear cache to force fresh data
          cache.submissions.data = null;
          await syncLatestAcceptedSubmission(
            githubToken,
            linkedRepo,
            cf_handle
          );
        }
      }
    );
  }
});
