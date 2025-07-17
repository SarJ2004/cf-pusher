/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { fetchUserInfoWithAuth } from "../handlers/codeforcesHandler";
import { FaPowerOff, FaUser, FaKey, FaEye, FaEyeSlash } from "react-icons/fa6";
import { CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";

const ProfileInfo = ({ onHandleSubmit }) => {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // 🚀 IMPROVEMENT: Auto-authentication on component mount
  useEffect(() => {
    chrome.storage.sync.get(
      ["cf_apiKey", "cf_apiSecret", "cf_handle"],
      (result) => {
        const storedApiKey = result.cf_apiKey;
        const storedApiSecret = result.cf_apiSecret;
        const storedHandle = result.cf_handle;

        if (storedApiKey && storedApiSecret && storedHandle) {
          setApiKey(storedApiKey);
          setApiSecret(storedApiSecret);
          setHandleInput(storedHandle);
          setLoading(true);

          fetchUserInfoWithAuth(storedApiKey, storedApiSecret, storedHandle)
            .then((user) => {
              setUserInfo(user);
              onHandleSubmit(user.handle);
              setError("");
            })
            .catch((err) => {
              console.error("Auto-authentication failed:", err);
              setError("Auto authentication failed, please login again.");
            })
            .finally(() => {
              setLoading(false);
            });
        }
      }
    );
  }, [onHandleSubmit]);

  // 🚀 IMPROVEMENT: Enhanced form validation
  const validateForm = () => {
    const errors = {};

    if (!handleInput.trim()) {
      errors.handle = "Username is required";
    } else if (handleInput.length < 2) {
      errors.handle = "Username must be at least 2 characters";
    }

    if (!apiKey.trim()) {
      errors.apiKey = "API Key is required";
    } else if (apiKey.length < 6) {
      errors.apiKey = "API Key seems too short";
    }

    if (!apiSecret.trim()) {
      errors.apiSecret = "API Secret is required";
    } else if (apiSecret.length < 10) {
      errors.apiSecret = "API Secret seems too short";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 🚀 IMPROVEMENT: Enhanced login handler with better error handling
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const user = await fetchUserInfoWithAuth(apiKey, apiSecret, handleInput);
      setUserInfo(user);

      // Store credentials
      chrome.storage.sync.set(
        { cf_apiKey: apiKey, cf_apiSecret: apiSecret, cf_handle: handleInput },
        () => {
          console.log(
            "API credentials and handle saved to chrome.storage.sync"
          );
        }
      );

      onHandleSubmit(handleInput);
      setError("");
    } catch (err) {
      console.error("Authentication failed:", err);

      // 🚀 IMPROVEMENT: Better error messaging
      const errorMessage = err.message || "Authentication failed";
      if (errorMessage.includes("Invalid API key")) {
        setError("Invalid API key or secret. Please check your credentials.");
      } else if (errorMessage.includes("not found")) {
        setError("User not found. Please check your username.");
      } else if (errorMessage.includes("network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Authentication failed. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🚀 IMPROVEMENT: Enhanced logout handler
  const handleLogout = () => {
    chrome.storage.sync.remove(
      ["cf_apiKey", "cf_apiSecret", "cf_handle"],
      () => {
        console.log(
          "API credentials and handle removed from chrome.storage.sync"
        );
      }
    );

    setUserInfo(null);
    setApiKey("");
    setApiSecret("");
    setHandleInput("");
    setError("");
    setFieldErrors({});
    onHandleSubmit(null);
  };

  // 🚀 IMPROVEMENT: Loading state component
  if (loading) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-orange-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Authenticating with Codeforces...
          </p>
        </div>
      </div>
    );
  }

  // 🚀 IMPROVEMENT: Enhanced authenticated user display
  if (userInfo) {
    const getRankColor = (rank) => {
      if (!rank) return "text-gray-600 dark:text-gray-400";
      const rankLower = rank.toLowerCase();
      if (rankLower.includes("newbie"))
        return "text-gray-600 dark:text-gray-400";
      if (rankLower.includes("pupil"))
        return "text-green-600 dark:text-green-400";
      if (rankLower.includes("specialist"))
        return "text-cyan-600 dark:text-cyan-400";
      if (rankLower.includes("expert"))
        return "text-blue-600 dark:text-blue-400";
      if (rankLower.includes("candidate master"))
        return "text-purple-600 dark:text-purple-400";
      if (rankLower.includes("master"))
        return "text-orange-600 dark:text-orange-400";
      if (rankLower.includes("international master"))
        return "text-orange-600 dark:text-orange-400";
      if (rankLower.includes("grandmaster"))
        return "text-red-600 dark:text-red-400";
      if (rankLower.includes("international grandmaster"))
        return "text-red-600 dark:text-red-400";
      if (rankLower.includes("legendary grandmaster"))
        return "text-red-600 dark:text-red-400";
      return "text-gray-600 dark:text-gray-400";
    };

    return (
      <div className="w-full flex justify-center mb-6">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md">
          {/* Success indicator */}
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Connected Successfully
            </span>
          </div>

          {/* User info */}
          <div className="text-center">
            {userInfo.avatar && (
              <img
                src={userInfo.avatar}
                alt="Profile"
                className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}

            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">
              {userInfo.handle}
            </h3>

            <div className="space-y-1 mb-4">
              <p
                className={`text-sm font-medium ${getRankColor(
                  userInfo.rank
                )}`}>
                {userInfo.rank || "Unrated"}
              </p>

              {userInfo.rating && (
                <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>Rating: {userInfo.rating}</span>
                  {userInfo.maxRating && <span>Max: {userInfo.maxRating}</span>}
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-all duration-200 mx-auto">
              <FaPowerOff className="w-3 h-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🚀 IMPROVEMENT: Enhanced login form
  return (
    <div className="w-full flex justify-center mb-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 transition-all duration-300">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <FaUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">
            Connect to Codeforces
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your API credentials to get started
          </p>
        </div>

        {/* Help text */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Need API credentials?</p>
              <p>
                Visit{" "}
                <a
                  href="https://codeforces.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline">
                  Codeforces API Settings
                </a>{" "}
                to generate your API key and secret.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={handleInput}
                onChange={(e) => {
                  setHandleInput(e.target.value);
                  if (fieldErrors.handle) {
                    setFieldErrors((prev) => ({ ...prev, handle: "" }));
                  }
                }}
                placeholder="e.g., tourist"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm transition-colors
                  ${
                    fieldErrors.handle
                      ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  } 
                  text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500`}
              />
            </div>
            {fieldErrors.handle && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.handle}
              </p>
            )}
          </div>

          {/* API Key field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <div className="relative">
              <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (fieldErrors.apiKey) {
                    setFieldErrors((prev) => ({ ...prev, apiKey: "" }));
                  }
                }}
                placeholder="Your API Key"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm transition-colors
                  ${
                    fieldErrors.apiKey
                      ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  } 
                  text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500`}
              />
            </div>
            {fieldErrors.apiKey && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.apiKey}
              </p>
            )}
          </div>

          {/* API Secret field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Secret
            </label>
            <div className="relative">
              <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => {
                  setApiSecret(e.target.value);
                  if (fieldErrors.apiSecret) {
                    setFieldErrors((prev) => ({ ...prev, apiSecret: "" }));
                  }
                }}
                placeholder="Your API Secret"
                className={`w-full pl-10 pr-12 py-2 border rounded-lg text-sm transition-colors
                  ${
                    fieldErrors.apiSecret
                      ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  } 
                  text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500`}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showSecret ? (
                  <FaEyeSlash className="w-4 h-4" />
                ) : (
                  <FaEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {fieldErrors.apiSecret && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.apiSecret}
              </p>
            )}
          </div>

          {/* Global error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-all duration-200">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <FaUser className="w-4 h-4" />
                Connect
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileInfo;
