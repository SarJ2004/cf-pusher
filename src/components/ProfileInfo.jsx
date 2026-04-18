/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { fetchUserInfo } from "../services/codeforcesService";
import { FaPowerOff, FaUser } from "react-icons/fa6";
import { CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import cfLogo from "../assets/cf.svg";

const APP_CF_OAUTH_CLIENT_ID =
  import.meta.env.VITE_CF_OAUTH_CLIENT_ID || "8MSpWYVSzdl3HD4rIwwcdPKBIUu8WIZp";
const CF_OAUTH_EXCHANGE_URL =
  import.meta.env.VITE_CF_OAUTH_EXCHANGE_URL ||
  "https://cfpusher-backend.onrender.com/auth/codeforces/exchange";

const ProfileInfo = ({ onHandleSubmit }) => {
  const [oauthClientId, setOauthClientId] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const parseAuthParams = (redirectUrl) => {
    const url = new URL(redirectUrl);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(url.search);

    const idToken = hashParams.get("id_token") || queryParams.get("id_token");
    const accessToken =
      hashParams.get("access_token") || queryParams.get("access_token");
    const token = hashParams.get("token") || queryParams.get("token");
    const authCode = hashParams.get("code") || queryParams.get("code");
    const oauthError = hashParams.get("error") || queryParams.get("error");
    const oauthErrorDescription =
      hashParams.get("error_description") ||
      queryParams.get("error_description");
    const returnedState =
      hashParams.get("state") || queryParams.get("state") || "";
    const handle = hashParams.get("handle") || queryParams.get("handle");
    const rating = hashParams.get("rating") || queryParams.get("rating");
    const avatar = hashParams.get("avatar") || queryParams.get("avatar");
    const hashKeys = Array.from(hashParams.keys());
    const queryKeys = Array.from(queryParams.keys());

    return {
      idToken,
      accessToken,
      token,
      authCode,
      oauthError,
      oauthErrorDescription,
      returnedState,
      handle,
      rating,
      avatar,
      hashKeys,
      queryKeys,
    };
  };

  const exchangeCodeForProfile = async (
    authCode,
    currentRedirectUri,
    clientId,
  ) => {
    if (!CF_OAUTH_EXCHANGE_URL) {
      throw new Error(
        "Server OAuth exchange is not configured. Set VITE_CF_OAUTH_EXCHANGE_URL and deploy backend exchange endpoint.",
      );
    }

    const response = await fetch(CF_OAUTH_EXCHANGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: authCode,
        redirectUri: currentRedirectUri,
        clientId,
      }),
    });

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!response.ok) {
      throw new Error(
        data.error_description ||
          data.error ||
          data.message ||
          "OAuth code exchange failed",
      );
    }

    return data;
  };

  const decodeJwtPayload = (token) => {
    const [, payload] = token.split(".");
    if (!payload) {
      throw new Error("Invalid token payload");
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    return JSON.parse(atob(padded));
  };

  useEffect(() => {
    chrome.storage.sync.get(
      ["cf_handle", "cf_oauth_profile", "cf_oauth_clientId"],
      (result) => {
        const storedHandle = result.cf_handle;
        const storedProfile = result.cf_oauth_profile;
        const storedClientId = result.cf_oauth_clientId;

        if (storedClientId) {
          setOauthClientId(storedClientId);
        } else if (APP_CF_OAUTH_CLIENT_ID) {
          setOauthClientId(APP_CF_OAUTH_CLIENT_ID);
        }

        if (storedHandle && storedProfile) {
          setUserInfo(storedProfile);
          onHandleSubmit(storedHandle);
          return;
        }

        if (storedHandle) {
          setLoading(true);

          fetchUserInfo(storedHandle)
            .then((user) => {
              if (user) {
                setUserInfo(user);
                chrome.storage.sync.set({ cf_oauth_profile: user });
                onHandleSubmit(user.handle);
                setError("");
              } else {
                setError("Could not restore Codeforces session.");
              }
            })
            .catch((err) => {
              console.error("Auto session restore failed:", err);
              setError("Auto session restore failed, please login again.");
            })
            .finally(() => {
              setLoading(false);
            });
        }
      },
    );
  }, [onHandleSubmit]);

  const validateForm = () => {
    const errors = {};

    if (!oauthClientId.trim()) {
      errors.clientId = "OAuth Client ID is required";
    } else if (oauthClientId.includes(".")) {
      errors.clientId =
        "This looks like a token/JWT. Please enter OAuth Client ID, not token.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const state = Math.random().toString(36).slice(2);
      const currentRedirectUri = chrome.identity.getRedirectURL();
      const authUrl = `https://codeforces.com/oauth/authorize?response_type=${encodeURIComponent(
        "code",
      )}&scope=openid&client_id=${encodeURIComponent(
        oauthClientId.trim(),
      )}&redirect_uri=${encodeURIComponent(
        currentRedirectUri,
      )}&state=${encodeURIComponent(state)}`;

      const redirectUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: authUrl,
            interactive: true,
          },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!responseUrl) {
              reject(new Error("Codeforces OAuth was cancelled"));
              return;
            }

            resolve(responseUrl);
          },
        );
      });

      const {
        authCode,
        oauthError,
        oauthErrorDescription,
        returnedState,
        handle: directHandle,
        rating: directRating,
        avatar: directAvatar,
        hashKeys,
        queryKeys,
      } = parseAuthParams(redirectUrl);

      if (oauthError) {
        throw new Error(
          `Codeforces OAuth error: ${oauthError}${
            oauthErrorDescription ? ` (${oauthErrorDescription})` : ""
          }`,
        );
      }

      if (returnedState && returnedState !== state) {
        throw new Error("Invalid OAuth state, please try again");
      }

      if (!authCode && !directHandle) {
        throw new Error(
          `Codeforces did not return OAuth code. Callback keys: hash=[${
            hashKeys.join(",") || "none"
          }] query=[${queryKeys.join(",") || "none"}]. Verify OAuth Client ID and redirect URI in Codeforces app settings.`,
        );
      }

      let payload = null;
      let exchangedIdToken = null;

      if (authCode) {
        const exchangeResult = await exchangeCodeForProfile(
          authCode,
          currentRedirectUri,
          oauthClientId.trim(),
        );

        exchangedIdToken = exchangeResult.id_token || null;
        if (exchangedIdToken) {
          payload = decodeJwtPayload(exchangedIdToken);
        } else {
          payload = {
            handle:
              exchangeResult.handle ||
              exchangeResult.user?.handle ||
              exchangeResult.profile?.handle ||
              null,
            rating:
              exchangeResult.rating ||
              exchangeResult.user?.rating ||
              exchangeResult.profile?.rating ||
              null,
            avatar:
              exchangeResult.avatar ||
              exchangeResult.user?.avatar ||
              exchangeResult.profile?.avatar ||
              null,
          };
        }
      } else {
        payload = {
          handle: directHandle,
          rating: directRating,
          avatar: directAvatar,
        };
      }

      const handle = payload.handle;
      if (!handle) {
        throw new Error("Codeforces token did not contain a handle");
      }

      const apiUser = await fetchUserInfo(handle);
      const normalizedUser = apiUser || {
        handle,
        rating: payload.rating || "Unrated",
        maxRating: payload.rating || "Unrated",
        rank: "Unranked",
        avatar: payload.avatar,
      };

      setUserInfo(normalizedUser);

      chrome.storage.sync.set({
        cf_handle: handle,
        cf_oauth_idToken: exchangedIdToken,
        cf_oauth_profile: normalizedUser,
        cf_oauth_clientId: oauthClientId.trim(),
      });

      chrome.storage.sync.remove(["cf_apiKey", "cf_apiSecret"]);

      onHandleSubmit(handle);
      setError("");
    } catch (err) {
      console.error("Codeforces OAuth failed:", err);

      const errorMessage = err.message || "Authentication failed";
      if (errorMessage.includes("cancelled")) {
        setError("OAuth login was cancelled.");
      } else if (errorMessage.includes("network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.sync.remove([
      "cf_apiKey",
      "cf_apiSecret",
      "cf_handle",
      "cf_oauth_idToken",
      "cf_oauth_profile",
    ]);

    setUserInfo(null);
    setError("");
    setFieldErrors({});
    onHandleSubmit(null);
  };

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
                  userInfo.rank,
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

  return (
    <div className="w-full flex justify-center mb-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 transition-all duration-300">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <img src={cfLogo} alt="Codeforces" className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">
            Connect to Codeforces
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in securely with Codeforces OAuth
          </p>
        </div>

        {/* Help text */}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {!APP_CF_OAUTH_CLIENT_ID && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OAuth Client ID
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={oauthClientId}
                  onChange={(e) => {
                    setOauthClientId(e.target.value);
                    if (fieldErrors.clientId) {
                      setFieldErrors((prev) => ({ ...prev, clientId: "" }));
                    }
                  }}
                  placeholder="Enter your Codeforces OAuth client id"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm transition-colors
                    ${
                      fieldErrors.clientId
                        ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    } 
                    text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500`}
                />
              </div>
              {fieldErrors.clientId && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.clientId}
                </p>
              )}
            </div>
          )}

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
                Connecting...
              </>
            ) : (
              <>
                <FaUser className="w-4 h-4" />
                Connect with OAuth
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileInfo;
