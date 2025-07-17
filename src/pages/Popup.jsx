/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import StreakTracker from "../components/StreakTracker";
import ProblemChart from "../components/ProblemChart";
import ProfileInfo from "../components/ProfileInfo";
import { fetchAcceptedSubmissions } from "../handlers/codeforcesHandler";
import { checkRepositoryExists } from "../handlers/githubHandler";
import {
  Check,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import { AiOutlineDisconnect, AiOutlineLogout } from "react-icons/ai";
import { FaGithub, FaEnvelope } from "react-icons/fa6";
import logoLight from "../assets/logo-light.png";
import logoDark from "../assets/logo-dark.png";

const Popup = () => {
  const [solvedDays, setSolvedDays] = useState([]);
  const [solvedData, setSolvedData] = useState([]);
  const [username, setUsername] = useState(null);
  const [setshowSettings, setsetshowSettings] = useState(false);
  const [githubToken, setGithubToken] = useState(null);
  const [linkedRepo, setLinkedRepo] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");

  // 🚀 IMPROVEMENT: Enhanced state management for better UX
  const [syncStatus, setSyncStatus] = useState({
    isActive: false,
    isSyncing: false,
    lastSync: null,
    error: null,
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [manualSyncLoading, setManualSyncLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isValidatingRepo, setIsValidatingRepo] = useState(false);

  // 🚀 IMPROVEMENT: Show notification helper
  const showNotification = (message, type = "info", duration = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };

  useEffect(() => {
    chrome.storage.sync.get(["darkMode"], (result) => {
      if (result.darkMode) {
        document.documentElement.classList.add("dark");
        setIsDarkMode(true);
      }
    });
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    chrome.storage.sync.set({ darkMode: newMode });
  };

  useEffect(() => {
    chrome.storage.sync.get(["linkedRepo"], (result) => {
      if (result.linkedRepo) {
        setLinkedRepo(result.linkedRepo);
        setRepoInput(result.linkedRepo);
      }
    });
  }, []);

  useEffect(() => {
    // Get handle from chrome.storage.sync instead of localStorage
    chrome.storage.sync.get(["cf_handle"], (result) => {
      if (result.cf_handle) {
        setUsername(result.cf_handle);
      }
    });

    chrome.storage.sync.get("githubToken", (result) => {
      if (result.githubToken) {
        setGithubToken(result.githubToken);
      }
    });
  }, []);

  // 🚀 IMPROVEMENT: Fetch GitHub username when token exists but username is missing
  useEffect(() => {
    if (githubToken && !githubUsername) {
      fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${githubToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.login) {
            setGithubUsername(data.login);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch GitHub username:", err);
        });
    }
  }, [githubToken, githubUsername]);

  // 🚀 IMPROVEMENT: Update sync status based on credentials
  useEffect(() => {
    const isActive = !!(username && githubToken && linkedRepo);
    setSyncStatus((prev) => ({
      ...prev,
      isActive: isActive,
    }));
  }, [username, githubToken, linkedRepo]);

  // 🚀 IMPROVEMENT: Enhanced data fetching with better loading states
  useEffect(() => {
    if (!username) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        console.log("🔍 Fetching user data for:", username);
        const accepted = await fetchAcceptedSubmissions(username, 10000);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pastWeek = Array(7).fill(false);

        console.log("🔍 Streak Debug - Today:", today.toDateString());
        console.log(
          "🔍 Streak Debug - Total accepted submissions:",
          accepted.length
        );

        accepted.forEach((submission, index) => {
          // Use the raw timestamp if available, otherwise parse the formatted string
          const submissionDate = submission.submissionTimestamp
            ? new Date(submission.submissionTimestamp)
            : new Date(submission.submissionTime);
          submissionDate.setHours(0, 0, 0, 0);

          const diff = Math.floor(
            (today - submissionDate) / (1000 * 60 * 60 * 24)
          );

          if (diff >= 0 && diff < 7) {
            pastWeek[6 - diff] = true;
            console.log(`🔍 Streak Debug - Submission ${index + 1}:`, {
              problem: submission.problemName,
              date: submissionDate.toDateString(),
              daysAgo: diff,
              slotIndex: 6 - diff,
            });
          }
        });

        console.log("🔍 Streak Debug - Final pastWeek array:", pastWeek);
        setSolvedDays(pastWeek);

        const ratingMap = accepted.reduce((acc, submission) => {
          const rating = submission.problemRating || "Unrated";
          if (!acc[rating]) acc[rating] = { name: rating, count: 0 };
          acc[rating].count += 1;
          return acc;
        }, {});

        setSolvedData(Object.values(ratingMap));

        // Update sync status
        setSyncStatus((prev) => ({
          ...prev,
          lastSync: new Date().toLocaleTimeString(),
          error: null,
        }));
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        showNotification("Failed to fetch data from Codeforces", "error");
        setSyncStatus((prev) => ({
          ...prev,
          error: "Failed to fetch data",
        }));
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [username]);

  // 🚀 IMPROVEMENT: Manual sync functionality
  const handleManualSync = async () => {
    setManualSyncLoading(true);
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "manualSync" }, resolve);
      });

      if (response.success) {
        showNotification("Sync completed successfully!", "success");
        setSyncStatus((prev) => ({
          ...prev,
          lastSync: new Date().toLocaleTimeString(),
          error: null,
        }));
      } else {
        showNotification(response.error || "Sync failed", "error");
        setSyncStatus((prev) => ({
          ...prev,
          error: response.error || "Sync failed",
        }));
      }
    } catch (error) {
      console.error("Manual sync error:", error);
      showNotification("Failed to trigger sync", "error");
    } finally {
      setManualSyncLoading(false);
    }
  };

  const connectToGitHub = () => {
    // Use your original OAuth flow with the /auth/github/callback endpoint
    const CLIENT_ID = "Ov23liZwEyp8gsCsQOPb";
    const redirectUri = chrome.identity.getRedirectURL();
    const backendCallback =
      "https://cfpusher-backend.onrender.com/auth/github/callback";
    const state = encodeURIComponent(redirectUri); // Pass extension redirect as state

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      backendCallback
    )}&state=${state}&scope=repo`;

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      function (redirectUrl) {
        if (chrome.runtime.lastError) {
          console.error("OAuth Error:", chrome.runtime.lastError);
          showNotification("Failed to connect to GitHub", "error");
          return;
        }

        if (redirectUrl) {
          // Extract the token from your backend's redirect
          const url = new URL(redirectUrl);
          const token = url.searchParams.get("token");

          if (token) {
            validateAndSetToken(token);
          } else {
            showNotification("GitHub authorization failed", "error");
          }
        }
      }
    );
  };

  const connectWithToken = async (token) => {
    if (!token) {
      showNotification("Please enter a valid token", "error");
      return;
    }
    await validateAndSetToken(token);
  };

  const validateAndSetToken = async (token) => {
    try {
      // Validate the token by fetching user info
      const userResponse = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();

        setGithubToken(token);
        chrome.storage.sync.set({ githubToken: token });
        setGithubUsername(userData.login);
        showNotification(`Connected to GitHub as ${userData.login}`, "success");
      } else {
        showNotification("Invalid GitHub token", "error");
      }
    } catch (error) {
      console.error("Token validation error:", error);
      showNotification("Failed to validate GitHub token", "error");
    }
  };

  const disconnectFromGitHub = () => {
    chrome.storage.sync.remove(["githubToken", "linkedRepo"], () => {
      setGithubToken(null);
      setLinkedRepo("");
      setRepoInput("");
      setGithubUsername("");
      showNotification("Disconnected from GitHub", "info");
    });
  };

  const linkRepository = async () => {
    if (!repoInput.trim()) {
      showNotification("Please enter a repository name", "error");
      return;
    }

    // 🚀 CRITICAL: Validate repository exists before linking
    setIsValidatingRepo(true);
    try {
      console.log(`🔍 Validating repository: ${repoInput}`);
      const repoCheck = await checkRepositoryExists(repoInput, githubToken);

      if (repoCheck.exists) {
        chrome.storage.sync.set({ linkedRepo: repoInput }, () => {
          setLinkedRepo(repoInput);
          showNotification(
            `Repository ${repoInput} validated and linked successfully!`,
            "success"
          );
        });
      } else {
        showNotification(
          `Repository ${repoInput} does not exist or you don't have access to it. Please check the repository name or create it first.`,
          "error",
          5000
        );
      }
    } catch (error) {
      console.error("Error validating repository:", error);
      showNotification(
        "Failed to validate repository. Please check your connection and try again.",
        "error"
      );
    } finally {
      setIsValidatingRepo(false);
    }
  };

  const createAndLinkRepository = async () => {
    if (!newRepoName.trim()) {
      showNotification("Please enter a repository name", "error");
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
          name: newRepoName,
          description: "Codeforces solutions pushed by CFPusher",
          private: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const fullName = data.full_name;
        setLinkedRepo(fullName);
        setRepoInput(fullName);
        setNewRepoName("");

        chrome.storage.sync.set({ linkedRepo: fullName });
        showNotification(
          `Repository ${fullName} created and linked!`,
          "success"
        );
      } else {
        const errorData = await response.json();
        showNotification(
          errorData.message || "Failed to create repository",
          "error"
        );
      }
    } catch (error) {
      console.error("Error creating repository:", error);
      showNotification("Failed to create repository", "error");
    }
  };

  // 🚀 IMPROVEMENT: Notification component
  const NotificationComponent = () => {
    if (!notification) return null;

    const getIcon = () => {
      switch (notification.type) {
        case "success":
          return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        case "error":
          return <AlertCircle className="w-4 h-4 text-red-500" />;
        default:
          return <AlertCircle className="w-4 h-4 text-blue-500" />;
      }
    };

    const getBgColor = () => {
      switch (notification.type) {
        case "success":
          return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
        case "error":
          return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
        default:
          return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      }
    };

    return (
      <div
        className={`fixed top-4 left-4 right-4 p-3 rounded-lg border ${getBgColor()} flex items-center gap-2 z-50 transition-all duration-300`}>
        {getIcon()}
        <span className="text-sm text-gray-700 dark:text-gray-200">
          {notification.message}
        </span>
      </div>
    );
  };

  if (setshowSettings) {
    return (
      <div className="w-96 min-h-[500px] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 relative transition-colors duration-300">
        <NotificationComponent />

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-lg">Settings</h2>
          <div className="flex gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setsetshowSettings(false)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              ←
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* GitHub Connection Status */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FaGithub className="w-5 h-5" />
              GitHub Connection
            </h3>

            {githubToken ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Connected as {githubUsername}</span>
                </div>
                <button
                  onClick={disconnectFromGitHub}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
                  <AiOutlineDisconnect className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={connectToGitHub}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors">
                  <FaGithub className="w-4 h-4" />
                  Connect with OAuth
                </button>

                <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                  or
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="GitHub Personal Access Token"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        connectWithToken(e.target.value.trim());
                      }
                    }}
                  />
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
                    Create token here (needs 'repo' scope)
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Repository Management */}
          {githubToken && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold mb-3">Repository Settings</h3>

              {linkedRepo && (
                <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Linked: {linkedRepo}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Link Existing Repository
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      placeholder="username/repository"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
                      disabled={isValidatingRepo}
                    />
                    <button
                      onClick={linkRepository}
                      disabled={isValidatingRepo}
                      className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors flex items-center gap-1">
                      {isValidatingRepo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        "Link"
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Repository will be validated before linking
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Create New Repository
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="repository-name"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
                    />
                    <button
                      onClick={createAndLinkRepository}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors">
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status */}
          {username && githubToken && linkedRepo && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold mb-3">Sync Status</h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Auto Sync
                  </span>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Active</span>
                  </div>
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
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
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
    <div className="w-96 min-h-[500px] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 relative transition-colors duration-300">
      <NotificationComponent />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {username && githubToken && linkedRepo && (
            <button
              onClick={handleManualSync}
              disabled={manualSyncLoading}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                manualSyncLoading
                  ? "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  : syncStatus.error
                  ? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                  : syncStatus.isActive
                  ? "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
              }`}
              title={`Manual Sync - ${
                manualSyncLoading
                  ? "Syncing..."
                  : syncStatus.error
                  ? "Sync has errors"
                  : syncStatus.isActive
                  ? "Sync is active"
                  : "Sync is inactive - missing credentials"
              }`}>
              {manualSyncLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setsetshowSettings(true)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center relative">
        <img
          src={logoLight}
          alt="Logo"
          className="block dark:hidden w-32 h-auto"
        />
        <img
          src={logoDark}
          alt="Logo"
          className="hidden dark:block w-32 h-auto"
        />
        <p className="mt-2 mb-2 font-bold text-2xl text-gray-800 dark:text-gray-200 absolute top-20">
          CFPusher
        </p>

        <ProfileInfo onHandleSubmit={setUsername} username={username} />
      </div>

      {/* Loading State */}
      {isLoadingData && username && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading your data...</span>
          </div>
        </div>
      )}

      {/* Data Display */}
      {username && !isLoadingData && (
        <>
          <StreakTracker solvedDays={solvedDays} />
          <ProblemChart solvedData={solvedData} />
        </>
      )}

      <p className="text-xs text-center mt-4 text-gray-600 dark:text-gray-400">
        Made with <span className="text-red-500">❤️</span> for{" "}
        <a
          href="https://codeforces.com"
          className="text-blue-600 dark:text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer">
          codeforces.com
        </a>
      </p>

      <p className="text-xs text-center mt-2 text-gray-600 dark:text-gray-400 flex flex-row items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <FaGithub size={12} />
          <a
            href="https://github.com/SarJ2004/cf-pusher"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors">
            Contribute
          </a>
        </span>
        <span className="text-gray-400 dark:text-gray-500">|</span>
        <span className="flex items-center gap-1">
          <FaEnvelope size={12} />
          <a
            href="mailto:sargedevx@gmail.com"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors">
            Contact
          </a>
        </span>
      </p>
    </div>
  );
};

export default Popup;
