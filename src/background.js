/* eslint-disable no-undef */
import { fetchAcceptedSubmissions } from "./services/codeforcesService";
import {
  getSubmissionCode,
  getProblemStatement,
} from "./services/submissionExtractionService";
import { pushToGitHubWithRetry } from "./services/githubService";

let isSyncing = false;
let isBackfilling = false;
let lastSyncTime = 0;
let lastSubmissionId = null;

// 🚀 PERFORMANCE IMPROVEMENT: Ultra-fast sync for instant response
const SYNC_INTERVAL_MINUTES = 0.1; // 6 seconds for ultra-fast response
const MIN_SYNC_INTERVAL_MS = 2000; // Minimum 2 seconds between syncs for maximum responsiveness
const HISTORY_SYNC_BATCH_SIZE = 15;

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

const normalizeCodeForGitHub = (rawCode) => {
  if (typeof rawCode !== "string") return "";

  let normalized = rawCode.replace(/\r\n/g, "\n");

  normalized = normalized
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");

  return normalized;
};

// 🚀 IMPROVEMENT: Add rate limiting protection
const rateLimitTracker = {
  codeforcesRequests: [],

  canMakeRequest() {
    const now = Date.now();
    const requests = this.codeforcesRequests;
    const limit = 5;

    while (requests.length > 0 && now - requests[0] > 60000) {
      requests.shift();
    }

    return requests.length < limit;
  },

  recordRequest() {
    const requests = this.codeforcesRequests;
    requests.push(Date.now());
  },
};

// 🚀 IMPROVEMENT: Enhanced caching with TTL
const cache = {
  submissions: { data: null, timestamp: 0, ttl: 30000 },       // 30s TTL
  cfProblems:  { data: null, timestamp: 0, ttl: 86400000 },    // 24h TTL — problem metadata rarely changes
  problems: new Map(),

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

    if (key === "cfProblems") {
      const now = Date.now();
      if (
        this.cfProblems.data &&
        now - this.cfProblems.timestamp < this.cfProblems.ttl
      ) {
        return this.cfProblems.data;
      }
      return null;
    }

    const problem = this.problems.get(key);
    if (problem && Date.now() - problem.timestamp < 900000) {
      return problem.data;
    }
    return null;
  },

  set(key, value) {
    if (key === "submissions") {
      this.submissions = { data: value, timestamp: Date.now(), ttl: 30000 };
    } else if (key === "cfProblems") {
      this.cfProblems = { data: value, timestamp: Date.now(), ttl: 86400000 };
    } else {
      this.problems.set(key, { data: value, timestamp: Date.now() });
    }
  },
};

// ── Storage migration: move synced-problems from sync (100 KB cap) to local (10 MB) ──
const migrateSyncedProblemsToLocal = async () => {
  const { cfSyncedMigrated } = await chrome.storage.local.get("cfSyncedMigrated");
  if (cfSyncedMigrated) return;

  try {
    const result = await chrome.storage.sync.get("cf-synced-problems");
    const oldData = result["cf-synced-problems"];

    if (oldData && Object.keys(oldData).length > 0) {
      console.log(`🔄 Migrating ${Object.keys(oldData).length} synced problems to local storage`);
      await chrome.storage.local.set({ "cf-synced-problems": oldData });
    }

    await chrome.storage.local.set({ cfSyncedMigrated: true });
    console.log("✅ Synced-problems migration complete");
  } catch (error) {
    console.warn("⚠️ Migration failed, will retry next startup:", error);
  }
};

// ── NEW: Fetch and cache the full CF problemset (tags + ratings) ──────────────
// problemset.problems returns ~10k problems in one shot and is CDN-cached on
// CF's end, so it's fast and doesn't burn rate-limit quota meaningfully.
const fetchCFProblemsMetadata = async () => {
  const cached = cache.get("cfProblems");
  if (cached) {
    console.log("📋 Using cached CF problems metadata");
    return cached;
  }

  try {
    console.log("🌐 Fetching CF problems metadata (tags + ratings)...");
    const res = await fetch("https://codeforces.com/api/problemset.problems");
    const data = await res.json();

    if (data.status !== "OK") {
      console.warn("⚠️ CF API returned non-OK status for problemset.problems");
      return null;
    }

    // Build a fast lookup map: "contestId-index" → { tags, rating }
    const metaMap = {};
    for (const p of data.result.problems) {
      const key = `${p.contestId}-${p.index}`;
      metaMap[key] = {
        tags:   p.tags   || [],
        rating: p.rating ?? null,
      };
    }

    cache.set("cfProblems", metaMap);
    console.log(`✅ Cached CF problems metadata (${Object.keys(metaMap).length} problems)`);
    return metaMap;
  } catch (e) {
    console.warn(`⚠️ Failed to fetch CF problems metadata: ${e.message}`);
    return null;
  }
};

// ── NEW: Build the README content with LeetHub-style topic classification ─────
const buildReadmeContent = ({
  problemName,
  problemUrl,
  contestId,
  index,
  programmingLanguage,
  tags,
  rating,
  cleanedHTML,
}) => {
  const topicBadges =
    tags && tags.length > 0
      ? tags.map((t) => `\`${t}\``).join(" ")
      : "_No tags available_";

  const difficultyDisplay = rating ? `${rating}` : "Unrated";

  const metaBlock = `<h2><a href="${problemUrl}" target="_blank" rel="noopener noreferrer">${contestId}${index} — ${problemName}</a></h2>

| | |
|---|---|
| **Difficulty** | ${difficultyDisplay} |
| **Language** | ${programmingLanguage} |
| **Verdict** | ✅ Accepted |
| **Problem Link** | [Codeforces ${contestId}${index}](${problemUrl}) |

## Topics
${topicBadges}

---

## Problem Statement

`;

  if (cleanedHTML) {
    return metaBlock + cleanedHTML;
  }

  return (
    metaBlock +
    "_Problem statement could not be retrieved. Please visit the link above._"
  );
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Topic index: group solved problems by CF tag ─────────────────────────────
const buildTopicIndex = (syncedProblems) => {
  const topicMap = {};

  for (const [, meta] of Object.entries(syncedProblems)) {
    // Skip old-format entries that are just `true` (pre-migration)
    if (typeof meta !== "object" || !meta.tags) continue;

    const tags = meta.tags.length > 0 ? meta.tags : ["Uncategorized"];
    const entry = {
      contestId: meta.contestId,
      index: meta.index,
      name: meta.name,
      rating: meta.rating,
      lang: meta.lang,
      ext: meta.ext,
    };

    for (const tag of tags) {
      if (!topicMap[tag]) topicMap[tag] = [];
      const exists = topicMap[tag].some(
        (e) => e.contestId === entry.contestId && e.index === entry.index,
      );
      if (!exists) {
        topicMap[tag].push(entry);
      }
    }
  }

  // Sort topics alphabetically, problems by contestId then index
  const sorted = {};
  for (const topic of Object.keys(topicMap).sort()) {
    sorted[topic] = topicMap[topic].sort((a, b) => {
      if (a.contestId !== b.contestId) return a.contestId - b.contestId;
      return a.index.localeCompare(b.index);
    });
  }

  return sorted;
};

// ── Root README: LeetHub-style markdown with topic tables ────────────────────
const buildRootReadme = (topicIndex, username, totalCount, linkedRepo) => {
  const topics = Object.keys(topicIndex);

  let md = `# Codeforces Solutions\n\n`;
  md += `> Auto-generated by [CFPusher](https://github.com/SarJ2004/cf-pusher) for **${username}**\n\n`;
  md += `## 📊 Stats\n\n`;
  md += `| Total Problems | Topics |\n`;
  md += `|---|---|\n`;
  md += `| ${totalCount} | ${topics.length} |\n\n`;
  md += `---\n\n`;
  md += `## 📂 Topic-Wise Problems\n\n`;

  // Table of Contents
  for (const topic of topics) {
    const anchor = topic
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    md += `- [${topic}](#${anchor}) (${topicIndex[topic].length})\n`;
  }
  md += `\n---\n\n`;

  // Per-topic tables
  for (const topic of topics) {
    md += `### ${topic}\n\n`;
    md += `| # | Problem | Difficulty | Solution |\n`;
    md += `|---|---------|------------|----------|\n`;

    for (const p of topicIndex[topic]) {
      const problemUrl = `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`;
      const ratingStr = p.rating !== null && p.rating !== undefined ? String(p.rating) : "Unrated";
      const solutionPath = [
        ratingStr,
        `${p.contestId}_${p.index} - ${p.name}`,
        `solution.${p.ext}`,
      ]
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const solutionUrl = `https://github.com/${linkedRepo}/blob/HEAD/${solutionPath}`;
      const difficulty = p.rating ?? "Unrated";

      md += `| ${p.contestId}${p.index} | [${p.name}](${problemUrl}) | ${difficulty} | [${p.lang}](${solutionUrl}) |\n`;
    }

    md += `\n`;
  }

  md += `---\n\n`;
  md += `> Generated by [CFPusher — Codeforces to GitHub](https://github.com/SarJ2004/cf-pusher)\n`;

  return md;
};

// ── Push / update the root README.md in the linked repo ──────────────────────
const updateRootReadme = async (githubToken, linkedRepo, username) => {
  // Check user preference (default: enabled)
  const { generateTopicReadme } = await chrome.storage.sync.get(
    "generateTopicReadme",
  );
  if (generateTopicReadme === false) return;

  try {
    const result = await chrome.storage.local.get("cf-synced-problems");
    const syncedProblems = result["cf-synced-problems"] || {};

    const topicIndex = buildTopicIndex(syncedProblems);
    if (Object.keys(topicIndex).length === 0) {
      console.log(
        "📋 No enriched problem data yet, skipping root README update",
      );
      return;
    }

    // Count unique problems across all topics
    const uniqueProblems = new Set();
    for (const problems of Object.values(topicIndex)) {
      for (const p of problems) {
        uniqueProblems.add(`${p.contestId}-${p.index}`);
      }
    }

    const readmeContent = buildRootReadme(
      topicIndex,
      username,
      uniqueProblems.size,
      linkedRepo,
    );

    if (!rateLimitTracker.canMakeRequest("github")) {
      console.warn(
        "⏳ Rate limit reached for GitHub API, skipping root README update",
      );
      return;
    }

    rateLimitTracker.recordRequest("github");
    const success = await pushToGitHubWithRetry({
      repoFullName: linkedRepo,
      githubToken,
      filePath: "README.md",
      commitMessage: "Update topic-wise problem index [CFPusher]",
      content: readmeContent,
    });

    if (success) {
      console.log("✅ Root README updated with topic-wise problem index");
    } else {
      console.warn("⚠️ Root README push failed");
    }
  } catch (error) {
    console.warn("⚠️ Failed to update root README:", error);
  }
};

// 🚀 IMPROVEMENT: Optimized problem statement fetching with better caching
const getProblemStatementCached = async (contestId, index, cacheKey) => {
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

    cleaned = cleaned.replace(
      /<script[^>]*type=["']math\/tex[^"']*["'][^>]*>(.*?)<\/script>/g,
      (match, mathContent) => `$${mathContent.trim()}$`,
    );

    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gs, "");
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gs, "");

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
    return html;
  }
};

const getBackfillCompletionKey = (username, linkedRepo) => {
  const safeUser = (username || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeRepo = (linkedRepo || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `cf-history-sync-complete-${safeUser}-${safeRepo}`;
};

const pickLatestSubmissionPerProblem = (accepted) => {
  const latestByProblem = new Map();

  for (const submission of accepted) {
    const problemKey = `${submission.contestId}-${submission.index}`;
    if (!latestByProblem.has(problemKey)) {
      latestByProblem.set(problemKey, submission);
    }
  }

  return Array.from(latestByProblem.values()).reverse();
};

const syncSingleAcceptedSubmission = async ({
  submission,
  githubToken,
  linkedRepo,
  syncedProblems,
  cacheKey,
}) => {
  const {
    contestId,
    id: submissionId,
    index,
    problemName,
    programmingLanguage,
  } = submission;

  const extension = getExtensionFromLanguage(programmingLanguage);
  const problemCacheKey = `cf-problem-${contestId}-${index}`;

  if (syncedProblems[submissionId]) {
    const cachedFolderName = `${contestId}/${index} - ${problemName}`;
    console.log(`🟡 Already synced ${cachedFolderName}, skipping...`);
    lastSubmissionId = submissionId;
    return true;
  }

  // ── NEW: Fetch tags + rating from cached CF metadata ─────────────────────
  let tags = [];
  let rating = null;
  const cfMeta = await fetchCFProblemsMetadata();
  if (cfMeta) {
    const metaKey = `${contestId}-${index}`;
    const problemMeta = cfMeta[metaKey];
    if (problemMeta) {
      tags   = problemMeta.tags;
      rating = problemMeta.rating;
      console.log(`🏷️ Tags for ${contestId}${index}: [${tags.join(", ")}] | Rating: ${rating ?? "Unrated"}`);
    } else {
      console.warn(`⚠️ No metadata found for problem ${contestId}-${index} in CF problemset`);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const ratingStr = rating !== null && rating !== undefined ? String(rating) : "Unrated";
  const folderName = `${contestId}_${index} - ${problemName}`;
  const filePath = `${ratingStr}/${folderName}/solution.${extension}`;
  const readmePath = `${ratingStr}/${folderName}/README.md`;

  console.log(`⚡ Syncing ${ratingStr}/${folderName}...`);

  const [codeResult, problemResult] = await Promise.allSettled([
    getSubmissionCode(contestId, submissionId),
    getProblemStatementCached(contestId, index, problemCacheKey),
  ]);

  if (codeResult.status === "rejected" || !codeResult.value) {
    const errorMsg = codeResult.reason?.message || "Unknown error";
    console.error(
      `❌ Failed to get submission code for ${folderName}:`,
      errorMsg,
    );
    return false;
  }

  const code = codeResult.value;
  const problemHTML =
    problemResult.status === "fulfilled" ? problemResult.value : null;

  if (problemResult.status === "rejected") {
    const errorMsg = problemResult.reason?.message || "Unknown error";
    console.warn(
      `⚠️ Could not retrieve problem statement for ${folderName}:`,
      errorMsg,
    );
  }

  const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${index}`;
  const cleanedHTML = problemHTML ? simpleCleanHTML(problemHTML) : null;

  // ── CHANGED: Use new README builder instead of inline template ────────────
  const readmeContent = buildReadmeContent({
    problemName,
    problemUrl,
    contestId,
    index,
    programmingLanguage,
    tags,
    rating,
    cleanedHTML,
  });
  // ─────────────────────────────────────────────────────────────────────────

  const commitMessage = `Add ${problemName} [${index}] from Codeforces`;

  const readmePushSuccess = await pushToGitHubWithRetry({
    repoFullName: linkedRepo,
    githubToken,
    filePath: readmePath,
    commitMessage: `${commitMessage} (Problem Statement)`,
    content: readmeContent,
  });

  if (!readmePushSuccess) {
    console.error(`❌ README push failed for ${folderName}`);
    return false;
  }

  await new Promise((resolve) => setTimeout(resolve, 200));
  const normalizedCode = normalizeCodeForGitHub(code);
  const codePushSuccess = await pushToGitHubWithRetry({
    repoFullName: linkedRepo,
    githubToken,
    filePath,
    commitMessage,
    content: normalizedCode,
  });

  if (!codePushSuccess) {
    console.error(`❌ Code push failed for ${folderName}`);
    return false;
  }

  syncedProblems[submissionId] = {
    contestId,
    index,
    name: problemName,
    lang: programmingLanguage,
    ext: extension,
    tags,
    rating,
  };
  lastSubmissionId = submissionId;
  await chrome.storage.local.set({ [cacheKey]: syncedProblems });
  console.log(`✅ Successfully synced ${folderName}`);
  return true;
};

const syncHistoricalAcceptedSubmissions = async (
  githubToken,
  linkedRepo,
  username,
  isHistoricalSyncEnabled = false,
) => {
  if (!isHistoricalSyncEnabled) {
    return;
  }

  if (!githubToken || !linkedRepo || !username || isBackfilling) return;

  const completionKey = getBackfillCompletionKey(username, linkedRepo);
  const completionResult = await chrome.storage.sync.get([completionKey]);

  if (completionResult[completionKey]) {
    return;
  }

  if (!rateLimitTracker.canMakeRequest("codeforces")) {
    console.warn(
      "⏳ Rate limit reached for Codeforces API, skipping history sync",
    );
    return;
  }

  isBackfilling = true;
  console.log("🕰️ Starting historical submissions sync...");

  try {
    rateLimitTracker.recordRequest("codeforces");
    const accepted = await fetchAcceptedSubmissions(username, 10000);

    if (accepted.length === 0) {
      await chrome.storage.sync.set({ [completionKey]: true });
      console.log("✅ No historical submissions found");
      return;
    }

    const uniqueByProblem = pickLatestSubmissionPerProblem(accepted);
    const cacheKey = `cf-synced-problems`;
    const result = await chrome.storage.local.get([cacheKey]);
    const syncedProblems = result[cacheKey] || {};

    const pending = uniqueByProblem.filter(
      (submission) => !syncedProblems[submission.id],
    );

    if (pending.length === 0) {
      await chrome.storage.sync.set({ [completionKey]: true });
      console.log("✅ Historical submissions already synced");
      return;
    }

    // ── NEW: Pre-warm the CF metadata cache before batch processing ──────────
    // This means we fetch the full problemset once up front rather than once
    // per submission, saving time during backfill.
    await fetchCFProblemsMetadata();
    // ─────────────────────────────────────────────────────────────────────────

    const batch = pending.slice(0, HISTORY_SYNC_BATCH_SIZE);
    let syncedCount = 0;

    for (const submission of batch) {
      const { syncPastSubmissions } = await chrome.storage.sync.get(
        "syncPastSubmissions",
      );
      if (!syncPastSubmissions) {
        console.log("⏹️ Historical submissions sync disabled, stopping batch");
        return;
      }

      const success = await syncSingleAcceptedSubmission({
        submission,
        githubToken,
        linkedRepo,
        syncedProblems,
        cacheKey,
      });

      if (success) {
        syncedCount += 1;
      }
    }

    const remaining = pending.length - batch.length;
    console.log(
      `🧩 Historical sync batch done: ${syncedCount}/${batch.length} synced, ${remaining} remaining`,
    );

    // Update root README once at end of backfill batch (not per-submission)
    if (syncedCount > 0) {
      await updateRootReadme(githubToken, linkedRepo, username);
    }

    if (remaining <= 0) {
      await chrome.storage.sync.set({ [completionKey]: true });
      console.log("✅ Historical submissions sync completed");
    }
  } catch (error) {
    console.error("❌ Historical submissions sync failed:", error);
  } finally {
    isBackfilling = false;
  }
};

// 🚀 IMPROVEMENT: Optimized sync function with better error handling and performance
const syncLatestAcceptedSubmission = async (
  githubToken,
  linkedRepo,
  username,
) => {
  if (!githubToken || !linkedRepo || !username || isSyncing || isBackfilling)
    return;

  if (!rateLimitTracker.canMakeRequest("codeforces")) {
    console.warn("⏳ Rate limit reached for Codeforces API, skipping sync");
    return;
  }

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
    let accepted = cache.get("submissions");

    if (!accepted) {
      console.log("🌐 Fetching submissions from API");
      rateLimitTracker.recordRequest("codeforces");
      accepted = await fetchAcceptedSubmissions(username, 100);
      cache.set("submissions", accepted);
    } else {
      console.log("📋 Using cached submissions");
    }

    if (accepted.length === 0) {
      console.log("📭 No accepted submissions found");
      return;
    }

    const latest = accepted[0];
    const { id: submissionId } = latest;

    if (lastSubmissionId === submissionId) {
      console.log("✅ Latest submission already processed");
      return;
    }

    const cacheKey = `cf-synced-problems`;

    const result = await chrome.storage.local.get([cacheKey]);
    let syncedProblems = result[cacheKey] || {};
    if (syncedProblems[submissionId]) {
      console.log("🟡 Latest accepted submission already synced, skipping...");
      lastSubmissionId = submissionId;
      return;
    }

    const success = await syncSingleAcceptedSubmission({
      submission: latest,
      githubToken,
      linkedRepo,
      syncedProblems,
      cacheKey,
    });

    if (success) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Latest submission synced in ${elapsed}s`);
      await updateRootReadme(githubToken, linkedRepo, username);
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

  // Ensure synced-problems are in local storage
  await migrateSyncedProblemsToLocal();

  try {
    const [githubTokenObj, linkedRepoObj, cfHandleObj, syncPastSubmissionsObj] =
      await Promise.all([
        new Promise((resolve) =>
          chrome.storage.sync.get("githubToken", resolve),
        ),
        new Promise((resolve) =>
          chrome.storage.sync.get("linkedRepo", resolve),
        ),
        new Promise((resolve) => chrome.storage.sync.get("cf_handle", resolve)),
        new Promise((resolve) =>
          chrome.storage.sync.get("syncPastSubmissions", resolve),
        ),
      ]);

    const githubToken = githubTokenObj.githubToken;
    const linkedRepo = linkedRepoObj.linkedRepo;
    const username = cfHandleObj.cf_handle;
    const syncPastSubmissions = Boolean(
      syncPastSubmissionsObj.syncPastSubmissions,
    );

    if (githubToken && linkedRepo && username) {
      await chrome.alarms.clear("cfPusherSync");

      await syncLatestAcceptedSubmission(githubToken, linkedRepo, username);
      await syncHistoricalAcceptedSubmissions(
        githubToken,
        linkedRepo,
        username,
        syncPastSubmissions,
      );

      await chrome.alarms.create("cfPusherSync", {
        delayInMinutes: SYNC_INTERVAL_MINUTES,
        periodInMinutes: SYNC_INTERVAL_MINUTES,
      });

      console.log(
        `✅ Ultra-fast sync alarm created - will trigger every ${
          SYNC_INTERVAL_MINUTES * 60
        } seconds for instant response`,
      );
    } else {
      console.warn("⚠️ One or more credentials missing. Skipping sync.");
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
      const [
        githubTokenObj,
        linkedRepoObj,
        cfHandleObj,
        syncPastSubmissionsObj,
      ] = await Promise.all([
        new Promise((resolve) =>
          chrome.storage.sync.get("githubToken", resolve),
        ),
        new Promise((resolve) =>
          chrome.storage.sync.get("linkedRepo", resolve),
        ),
        new Promise((resolve) => chrome.storage.sync.get("cf_handle", resolve)),
        new Promise((resolve) =>
          chrome.storage.sync.get("syncPastSubmissions", resolve),
        ),
      ]);

      const githubToken = githubTokenObj.githubToken;
      const linkedRepo = linkedRepoObj.linkedRepo;
      const username = cfHandleObj.cf_handle;
      const syncPastSubmissions = Boolean(
        syncPastSubmissionsObj.syncPastSubmissions,
      );

      if (githubToken && linkedRepo && username) {
        await syncLatestAcceptedSubmission(githubToken, linkedRepo, username);
        await syncHistoricalAcceptedSubmissions(
          githubToken,
          linkedRepo,
          username,
          syncPastSubmissions,
        );
      } else {
        console.warn("⚠️ Missing credentials during alarm, clearing alarm");
        await chrome.alarms.clear("cfPusherSync");
      }
    } catch (error) {
      console.error("❌ Error during alarm sync:", error);
    }
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Extension startup detected - triggering immediate sync");
  setupPeriodicSync();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("🎉 Extension installed/updated - triggering immediate sync");
  setupPeriodicSync();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    const syncConfigKeys = [
      "githubToken",
      "linkedRepo",
      "cf_handle",
      "syncPastSubmissions",
    ];
    const hasSyncConfigChanges = syncConfigKeys.some((key) => changes[key]);

    if (hasSyncConfigChanges) {
      console.log("🔄 Sync settings changed, restarting sync");
      setTimeout(setupPeriodicSync, 1000);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "manualSync") {
    console.log("🔄 Manual sync triggered from popup");

    chrome.storage.sync.get(
      ["githubToken", "linkedRepo", "cf_handle", "syncPastSubmissions"],
      async (result) => {
        const { githubToken, linkedRepo, cf_handle, syncPastSubmissions } =
          result;

        if (githubToken && linkedRepo && cf_handle) {
          try {
            await syncLatestAcceptedSubmission(
              githubToken,
              linkedRepo,
              cf_handle,
            );
            await syncHistoricalAcceptedSubmissions(
              githubToken,
              linkedRepo,
              cf_handle,
              Boolean(syncPastSubmissions),
            );
            sendResponse({ success: true });
          } catch (error) {
            console.error("Manual sync failed:", error);
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: "Missing credentials" });
        }
      },
    );

    return true;
  }

  if (request.action === "triggerImmediateSync") {
    console.log("⚡ Immediate sync triggered by user activity");

    chrome.storage.sync.get(
      ["githubToken", "linkedRepo", "cf_handle"],
      async (result) => {
        const { githubToken, linkedRepo, cf_handle } = result;

        if (githubToken && linkedRepo && cf_handle) {
          cache.submissions.data = null;
          await syncLatestAcceptedSubmission(
            githubToken,
            linkedRepo,
            cf_handle,
          );
        }
      },
    );
  }
});
