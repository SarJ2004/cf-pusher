/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import StreakTracker from "../components/StreakTracker";
import ProblemChart from "../components/ProblemChart";
import ProfileInfo from "../components/ProfileInfo";
import { fetchAcceptedSubmissions } from "../handlers/codeforcesHandler";
import { Check, Settings } from "lucide-react";
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

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["darkMode"], (result) => {
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
    chrome.storage.local.set({ darkMode: newMode });
  };

  useEffect(() => {
    chrome.storage.local.get(["linkedRepo"], (result) => {
      if (result.linkedRepo) {
        setLinkedRepo(result.linkedRepo);
        setRepoInput(result.linkedRepo);
      }
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("cf_handle");
    if (stored) setUsername(stored);

    chrome.storage.local.get("githubToken", (result) => {
      if (result.githubToken) {
        setGithubToken(result.githubToken);
      }
    });
  }, []);

  useEffect(() => {
    if (!username) return;
    const fetchData = async () => {
      const accepted = await fetchAcceptedSubmissions(username, 10000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pastWeek = Array(7).fill(false);
      accepted.forEach((submission) => {
        const submissionDate = new Date(submission.submissionTime);
        submissionDate.setHours(0, 0, 0, 0);
        const diff = Math.floor(
          (today - submissionDate) / (1000 * 60 * 60 * 24)
        );
        if (diff >= 0 && diff < 7) pastWeek[6 - diff] = true;
      });
      setSolvedDays(pastWeek);

      const ratingMap = accepted.reduce((acc, submission) => {
        const rating = submission.problemRating || "Unrated";
        if (!acc[rating]) acc[rating] = { name: rating, count: 0 };
        acc[rating].count += 1;
        return acc;
      }, {});
      setSolvedData(Object.values(ratingMap));
    };
    fetchData();
  }, [username]);

  useEffect(() => {
    if (!githubToken) return;
    const fetchUsername = async () => {
      try {
        const res = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("Failed to fetch GitHub username:", err);
          return;
        }
        const data = await res.json();
        setGithubUsername(data.login);
      } catch (err) {
        console.error("Error fetching GitHub username:", err);
      }
    };
    fetchUsername();
  }, [githubToken]);

  const handleGitHubAuth = () => {
    const clientId = "Ov23liFyncsNX9Q5bp8o";
    const backendCallback =
      "https://codeforces-autopush-backend.onrender.com/auth/github/callback";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      backendCallback
    )}&scope=repo`;
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Auth Error:", chrome.runtime.lastError.message);
          return;
        }
        if (redirectUrl) {
          const url = new URL(redirectUrl);
          const accessToken = url.searchParams.get("token");
          if (accessToken) {
            chrome.storage.local.set({ githubToken: accessToken });
            setGithubToken(accessToken);
          } else {
            console.warn("No token found in redirect URL");
          }
        }
      }
    );
  };

  const handleDisconnectGitHub = () => {
    chrome.storage.local.remove("githubToken", () => {
      console.log("GitHub token removed");
      setGithubToken(null);
    });
  };

  const handleLinkRepo = async () => {
    const trimmedRepo = repoInput.trim();
    if (!trimmedRepo) {
      alert("Please enter a valid repo name.");
      return;
    }
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (!userRes.ok) {
        const err = await userRes.json();
        console.error("Failed to fetch GitHub user:", err);
        alert("Could not fetch GitHub username.");
        return;
      }
      const userData = await userRes.json();
      const fullName = `${userData.login}/${trimmedRepo}`;
      chrome.storage.local.set({ linkedRepo: fullName }, () => {
        setLinkedRepo(fullName);
        setRepoInput(fullName);
      });
    } catch (err) {
      console.error("Error linking repo:", err);
    }
  };

  const handleCreateAndLinkRepo = async () => {
    const trimmedName = newRepoName.trim();
    if (!trimmedName) return;
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (!userRes.ok) {
        const err = await userRes.json();
        console.error("Failed to fetch GitHub user:", err);
        alert("Could not fetch GitHub username.");
        return;
      }
      const userData = await userRes.json();
      const username = userData.login;
      console.log("GitHub username:", username);
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          private: true,
          auto_init: true,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        console.error("Repo creation error:", err);
        alert(`Failed to create repo: ${err.message || JSON.stringify(err)}`);
        return;
      }
      const createdRepo = await createRes.json();
      const fullName = `${username}/${createdRepo.name}`;
      chrome.storage.local.set({ linkedRepo: fullName }, () => {
        setLinkedRepo(fullName);
        setRepoInput(fullName);
      });
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong while creating the repo.");
    }
  };

  const toggleGitHubPopup = () => {
    setsetshowSettings(!setshowSettings);
  };

  return (
    <div className="relative  bg-white dark:bg-gray-900 dark:text-white flex flex-col items-center p-8 pt-0 w-72">
      <button
        onClick={toggleGitHubPopup}
        className="absolute top-2 right-2 hover:text-black text-gray-500 dark:text-gray-300 dark:hover:text-white cursor-pointer">
        <Settings size={20} />
      </button>

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
        <p className="mt-2 mb-2 font-bold text-2xl  text-gray-800 dark:text-gray-200 absolute top-20">
          CFPusher
        </p>

        <ProfileInfo onHandleSubmit={setUsername} username={username} />
      </div>

      {username && (
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

      {setshowSettings && (
        <div className="absolute top-10 right-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 w-[270px] z-10 border border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings size={18} />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Settings
              </p>
            </div>
          </div>

          {githubToken ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaGithub size={20} />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    @{githubUsername}
                  </span>
                  <Check size={16} color="green" />
                </div>
                <button
                  onClick={handleDisconnectGitHub}
                  title="Disconnect GitHub"
                  className="text-gray-400 hover:text-red-500 transition cursor-pointer font-extrabold">
                  <AiOutlineLogout size={20} />
                </button>
              </div>

              {linkedRepo ? (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    Linked Repo:
                    <span className="font-medium ml-1">{linkedRepo}</span>
                  </p>
                  <button
                    onClick={() => {
                      chrome.storage.local.remove("linkedRepo", () => {
                        setLinkedRepo("");
                        setRepoInput("");
                      });
                    }}
                    title="Unlink Repo"
                    className="text-gray-400 hover:text-red-500 cursor-pointer transition font-extrabold">
                    <AiOutlineDisconnect size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      placeholder="Link existing repo"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-black dark:text-white"
                    />
                    <button
                      onClick={handleLinkRepo}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded transition cursor-pointer">
                      Link Repo
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="New repo name"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-black dark:text-white"
                    />
                    <button
                      onClick={handleCreateAndLinkRepo}
                      className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 rounded transition cursor-pointer">
                      Create & Link
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <button
              onClick={handleGitHubAuth}
              className="w-full p-2 mb-2 rounded text-lg font-md text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-300 dark:text-black dark:hover:bg-gray-200 transition-colors cursor-pointer">
              Connect to GitHub
            </button>
          )}
          <div className="mb-4 mt-2 w-full flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Dark Mode
            </span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={isDarkMode}
                onChange={toggleDarkMode}
              />
              <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full relative transition-all duration-300">
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-300 ${
                    isDarkMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;
