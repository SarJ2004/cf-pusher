/* eslint-disable no-undef */
import { useEffect, useMemo, useState } from "react";
import StreakTracker from "../components/StreakTracker";
import ProblemChart from "../components/ProblemChart";
import ProfileInfo from "../components/ProfileInfo";
import { fetchAcceptedSubmissions } from "../services/codeforcesService";
import { checkRepositoryExists } from "../services/githubService";
import {
  Check,
  Settings,
  RefreshCw,
  Loader2,
  Sun,
  Moon,
  Star,
  Coffee,
} from "lucide-react";
import { AiOutlineDisconnect } from "react-icons/ai";
import { FaGithub, FaEnvelope } from "react-icons/fa6";
import logoLight from "../assets/logo-light.png";
import logoDark from "../assets/logo-dark.png";
import StatusMessage from "./components/StatusMessage";
import {
  getSyncStorage,
  setSyncStorage,
  removeSyncStorage,
} from "./utils/chromeStorage";
import {
  buildWeeklySolvedDays,
  buildSolvedDataByRating,
} from "./utils/popupMetrics";
import { getRepoNameFromFullName } from "./utils/repository";

const GITHUB_CLIENT_ID = "Ov23liZwEyp8gsCsQOPb";
const GITHUB_BACKEND_CALLBACK =
  "https://cfpusher-backend.onrender.com/auth/github/callback";

const Popup = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const [username, setUsername] = useState(null);
  const [githubToken, setGithubToken] = useState(null);
  const [githubUsername, setGithubUsername] = useState("");
  const [linkedRepo, setLinkedRepo] = useState("");

  const [repoInput, setRepoInput] = useState("");
  const [newRepoName, setNewRepoName] = useState("");

  const [solvedDays, setSolvedDays] = useState([]);
  const [solvedData, setSolvedData] = useState([]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isManualSyncLoading, setIsManualSyncLoading] = useState(false);
  const [isValidatingRepo, setIsValidatingRepo] = useState(false);
  const [isGitHubAuthLoading, setIsGitHubAuthLoading] = useState(false);
  const [syncPastSubmissions, setSyncPastSubmissions] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    lastSync: null,
    error: null,
  });

  const isSyncActive = useMemo(
    () => Boolean(username && githubToken && linkedRepo),
    [username, githubToken, linkedRepo],
  );

  const showStatus = (text, type = "info") => {
    setStatusMessage({ text, type });
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const result = await getSyncStorage([
        "darkMode",
        "linkedRepo",
        "cf_handle",
        "githubToken",
        "syncPastSubmissions",
      ]);

      if (!isMounted) {
        return;
      }

      const darkMode = Boolean(result.darkMode);
      setIsDarkMode(darkMode);
      document.documentElement.classList.toggle("dark", darkMode);

      const storedRepo = result.linkedRepo || "";
      setLinkedRepo(storedRepo);
      setRepoInput(getRepoNameFromFullName(storedRepo));
      setUsername(result.cf_handle || null);
      setGithubToken(result.githubToken || null);
      setSyncPastSubmissions(Boolean(result.syncPastSubmissions));
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!githubToken || githubUsername) {
      return;
    }

    let isMounted = true;

    const fetchGithubProfile = async () => {
      try {
        const response = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${githubToken}` },
        });

        if (!response.ok) {
          return;
        }

        const profile = await response.json();
        if (profile.login && isMounted) {
          setGithubUsername(profile.login);
        }
      } catch (error) {
        console.error("Failed to fetch GitHub username:", error);
      }
    };

    fetchGithubProfile();

    return () => {
      isMounted = false;
    };
  }, [githubToken, githubUsername]);

  useEffect(() => {
    if (!username) {
      setSolvedDays([]);
      setSolvedData([]);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setIsLoadingData(true);

      try {
        const accepted = await fetchAcceptedSubmissions(username, 10000);

        if (!isMounted) {
          return;
        }

        setSolvedDays(buildWeeklySolvedDays(accepted));
        setSolvedData(buildSolvedDataByRating(accepted));
        setSyncStatus((prev) => ({
          ...prev,
          lastSync: new Date().toLocaleTimeString(),
          error: null,
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to fetch Codeforces data:", error);
        setSyncStatus((prev) => ({
          ...prev,
          error: "Failed to fetch data",
        }));
        showStatus("Failed to fetch data from Codeforces.", "error");
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [username]);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    await setSyncStorage({ darkMode: newMode });
  };

  const toggleSyncPastSubmissions = async () => {
    const nextValue = !syncPastSubmissions;
    setSyncPastSubmissions(nextValue);
    await setSyncStorage({ syncPastSubmissions: nextValue });
    showStatus(
      nextValue
        ? "Past submissions sync enabled."
        : "Past submissions sync disabled.",
      "info",
    );
  };

  const extractTokenFromRedirect = (redirectUrl) => {
    const parsedUrl = new URL(redirectUrl);

    const queryToken =
      parsedUrl.searchParams.get("token") ||
      parsedUrl.searchParams.get("access_token");
    if (queryToken && queryToken !== "undefined" && queryToken !== "null") {
      return queryToken;
    }

    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
    const hashToken = hashParams.get("token") || hashParams.get("access_token");
    if (hashToken && hashToken !== "undefined" && hashToken !== "null") {
      return hashToken;
    }

    return null;
  };

  const validateAndSetToken = async (token) => {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const userResponse = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${token}` },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          await setSyncStorage({ githubToken: token });

          setGithubToken(token);
          setGithubUsername(userData.login);
          showStatus(`Connected to GitHub as ${userData.login}.`, "success");
          return true;
        }

        if (userResponse.status >= 500 && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }

        showStatus("GitHub token was rejected. Please connect again.", "error");
        return false;
      } catch (error) {
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }

        console.error("Token validation failed:", error);
        showStatus("Failed to validate GitHub token. Please retry.", "error");
        return false;
      }
    }

    return false;
  };

  const connectToGitHub = async () => {
    if (isGitHubAuthLoading) {
      return;
    }

    setIsGitHubAuthLoading(true);
    const redirectUri = chrome.identity.getRedirectURL();
    const state = encodeURIComponent(redirectUri);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      GITHUB_BACKEND_CALLBACK,
    )}&state=${state}&scope=repo`;

    try {
      const redirectUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: authUrl,
            interactive: true,
          },
          (resultUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!resultUrl) {
              reject(
                new Error("GitHub authorization did not return a redirect URL"),
              );
              return;
            }

            resolve(resultUrl);
          },
        );
      });

      const token = extractTokenFromRedirect(redirectUrl);
      if (!token) {
        showStatus(
          "GitHub authorization failed to return a valid token.",
          "error",
        );
        return;
      }

      await validateAndSetToken(token);
    } catch (error) {
      console.error("GitHub OAuth flow failed:", error);
      showStatus(`Failed to connect to GitHub: ${error.message}`, "error");
    } finally {
      setIsGitHubAuthLoading(false);
    }
  };

  const disconnectFromGitHub = async () => {
    await removeSyncStorage(["githubToken", "linkedRepo"]);

    setGithubToken(null);
    setGithubUsername("");
    setLinkedRepo("");
    setRepoInput("");
    showStatus("Disconnected from GitHub.", "info");
  };

  const handleManualSync = async () => {
    setIsManualSyncLoading(true);

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "manualSync" }, resolve);
      });

      if (response?.success) {
        setSyncStatus((prev) => ({
          ...prev,
          lastSync: new Date().toLocaleTimeString(),
          error: null,
        }));
        showStatus("Manual sync completed.", "success");
        return;
      }

      const errorMessage = response?.error || "Sync failed.";
      setSyncStatus((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      showStatus(errorMessage, "error");
    } catch (error) {
      console.error("Manual sync failed:", error);
      showStatus("Failed to trigger manual sync.", "error");
    } finally {
      setIsManualSyncLoading(false);
    }
  };

  const linkRepository = async () => {
    const repoName = repoInput.trim();
    if (!repoName) {
      showStatus("Please enter a repository name.", "error");
      return;
    }

    if (!githubUsername) {
      showStatus("Could not detect your GitHub username yet.", "error");
      return;
    }

    const fullRepoName = `${githubUsername}/${repoName}`;

    setIsValidatingRepo(true);
    try {
      const repoCheck = await checkRepositoryExists(fullRepoName, githubToken);

      if (!repoCheck.exists) {
        showStatus(
          `Repository ${fullRepoName} does not exist or is not accessible.`,
          "error",
        );
        return;
      }

      await setSyncStorage({ linkedRepo: fullRepoName });
      setLinkedRepo(fullRepoName);
      setRepoInput(repoName);
      showStatus(`Repository ${fullRepoName} linked successfully.`, "success");
    } catch (error) {
      console.error("Repository validation failed:", error);
      showStatus("Failed to validate repository.", "error");
    } finally {
      setIsValidatingRepo(false);
    }
  };

  const createAndLinkRepository = async () => {
    const nextRepoName = newRepoName.trim();
    if (!nextRepoName) {
      showStatus("Please enter a repository name.", "error");
      return;
    }

    try {
      const response = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextRepoName,
          description: "Codeforces solutions pushed by CFPusher",
          private: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showStatus(
          errorData.message || "Failed to create repository.",
          "error",
        );
        return;
      }

      const data = await response.json();
      await setSyncStorage({ linkedRepo: data.full_name });

      setLinkedRepo(data.full_name);
      setRepoInput(data.name || nextRepoName);
      setNewRepoName("");

      showStatus(`Repository ${data.full_name} created and linked.`, "success");
    } catch (error) {
      console.error("Failed to create repository:", error);
      showStatus("Failed to create repository.", "error");
    }
  };

  const getSyncButtonClass = () => {
    if (isManualSyncLoading) {
      return "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50";
    }

    if (syncStatus.error) {
      return "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400";
    }

    if (isSyncActive) {
      return "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400";
    }

    return "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400";
  };

  if (showSettings) {
    return (
      <div className="relative min-h-[500px] w-96 bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          <h2 className="text-lg font-bold">Settings</h2>
          <div className="flex gap-2">
            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800">
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800">
              ←
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <StatusMessage message={statusMessage} />

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <FaGithub className="h-5 w-5" />
              GitHub Connection
            </h3>

            {githubToken ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Connected as {githubUsername}</span>
                </div>
                <button
                  onClick={disconnectFromGitHub}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm text-white transition-colors hover:bg-red-600">
                  <AiOutlineDisconnect className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={connectToGitHub}
                  disabled={isGitHubAuthLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400">
                  {isGitHubAuthLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <FaGithub className="h-4 w-4" />
                      Connect with OAuth
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {githubToken && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 font-semibold">Repository Settings</h3>

              {linkedRepo && (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Linked: {linkedRepo}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Link Existing Repository
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(event) => setRepoInput(event.target.value)}
                      placeholder="repository-name"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                      disabled={isValidatingRepo}
                    />
                    <button
                      onClick={linkRepository}
                      disabled={isValidatingRepo}
                      className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400">
                      {isValidatingRepo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        "Link"
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Create New Repository
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(event) => setNewRepoName(event.target.value)}
                      placeholder="repository-name"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    />
                    <button
                      onClick={createAndLinkRepository}
                      className="rounded-lg bg-green-500 px-3 py-2 text-sm text-white transition-colors hover:bg-green-600">
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isSyncActive && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 font-semibold">Submission Preferences</h3>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Push Past Submissions</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Control whether older accepted submissions are backfilled.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleSyncPastSubmissions}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    syncPastSubmissions
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-pressed={syncPastSubmissions}
                  title={`Past submissions sync is ${
                    syncPastSubmissions ? "enabled" : "disabled"
                  }`}>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      syncPastSubmissions ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {isSyncActive && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 font-semibold">Sync Status</h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Auto Sync
                  </span>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-sm">Active</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Past Submissions
                  </span>
                  <span
                    className={`text-sm ${
                      syncPastSubmissions
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                    {syncPastSubmissions ? "Enabled" : "Disabled"}
                  </span>
                </div>

                {syncStatus.lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Last Sync
                    </span>
                    <span className="text-sm">{syncStatus.lastSync}</span>
                  </div>
                )}

                {syncStatus.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {syncStatus.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[500px] w-96 bg-gray-50 p-4 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
      <StatusMessage message={statusMessage} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSyncActive && (
            <button
              onClick={handleManualSync}
              disabled={isManualSyncLoading}
              className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${getSyncButtonClass()}`}
              title={`Manual Sync - ${
                isManualSyncLoading
                  ? "Syncing..."
                  : syncStatus.error
                    ? "Sync has errors"
                    : isSyncActive
                      ? "Sync is active"
                      : "Sync is inactive"
              }`}>
              {isManualSyncLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/SarJ2004/cf-pusher"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-yellow-300 bg-yellow-100 px-2 py-1.5 text-xs font-semibold text-yellow-800 transition-colors hover:bg-yellow-200 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
            title="Star SarJ2004/cf-pusher on GitHub">
            <Star className="h-4 w-4" />
            <span>Star</span>
          </a>
          <button
            onClick={toggleDarkMode}
            className="rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800">
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        <img
          src={logoLight}
          alt="Logo"
          className="block h-auto w-32 dark:hidden"
        />
        <img
          src={logoDark}
          alt="Logo"
          className="hidden h-auto w-32 dark:block"
        />
        <p className="absolute top-20 mb-2 mt-2 text-2xl font-bold text-gray-800 dark:text-gray-200">
          CFPusher
        </p>

        <ProfileInfo onHandleSubmit={setUsername} />
      </div>

      {isLoadingData && username && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading your data...</span>
          </div>
        </div>
      )}

      {username && !isLoadingData && (
        <>
          <StreakTracker solvedDays={solvedDays} />
          <ProblemChart solvedData={solvedData} />
        </>
      )}

      <p className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
        Made with <span className="text-red-500">❤️</span> for{" "}
        <a
          href="https://codeforces.com"
          className="text-blue-600 hover:underline dark:text-blue-400"
          target="_blank"
          rel="noopener noreferrer">
          codeforces.com
        </a>
      </p>

      <div className="mt-3 flex justify-center">
        <a
          href="https://ko-fi.com/M4M21Y0WRY"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
          style={{ backgroundColor: "#6460db" }}>
          <Coffee className="h-4 w-4" />
          Support the Project
        </a>
      </div>

      <p className="mt-2 flex flex-row items-center justify-center gap-3 text-center text-xs text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <FaGithub size={12} />
          <a
            href="https://github.com/SarJ2004/cf-pusher"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-black dark:text-gray-300 dark:hover:text-white">
            Contribute
          </a>
        </span>
        <span className="text-gray-400 dark:text-gray-500">|</span>
        <span className="flex items-center gap-1">
          <FaEnvelope size={12} />
          <a
            href="mailto:sargedevx@gmail.com"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-black dark:text-gray-300 dark:hover:text-white">
            Contact
          </a>
        </span>
      </p>
    </div>
  );
};

export default Popup;
