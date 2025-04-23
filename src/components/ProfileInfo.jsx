/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { fetchUserInfoWithAuth } from "../handlers/codeforcesHandler";
import { FaPowerOff } from "react-icons/fa6";

const ProfileInfo = ({ onHandleSubmit }) => {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
            })
            .catch((err) => {
              console.error(err);
              setError("Auto authentication failed, please login again.");
            })
            .finally(() => {
              setLoading(false);
            });
        }
      }
    );
  }, [onHandleSubmit]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await fetchUserInfoWithAuth(apiKey, apiSecret, handleInput);
      setUserInfo(user);

      chrome.storage.sync.set(
        { cf_apiKey: apiKey, cf_apiSecret: apiSecret, cf_handle: handleInput },
        () => {
          console.log(
            "API credentials and handle saved to chrome.storage",
            handleInput
          );
        }
      );
      localStorage.setItem("cf_handle", handleInput);
      onHandleSubmit(handleInput);
    } catch (err) {
      console.error(err);
      setError("Failed to authenticate. Check credentials and username.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.sync.remove(["cf_apiKey", "cf_apiSecret"], () => {
      console.log("API credentials removed from chrome.storage");
    });
    localStorage.removeItem("cf_handle");

    setUserInfo(null);
    setApiKey("");
    setApiSecret("");
    setHandleInput("");
    onHandleSubmit(null);
  };

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Authenticating...
      </p>
    );
  }

  if (userInfo) {
    return (
      <div className="relative flex flex-col items-center gap-3 mb-4 p-2  dark:outline-gray-800 rounded-xl">
        <button
          onClick={handleLogout}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition cursor-pointer"
          title="Logout">
          <FaPowerOff size={18} />
        </button>

        <div className="flex items-center gap-3 mt-4">
          <img
            src={userInfo.avatar}
            alt="avatar"
            className=" w-[100px] h-[56.33px] rounded-full  dark:border-gray-600"
          />
          <div className="text-left">
            <p className="font-bold text-sm text-gray-800 dark:text-gray-100">
              {userInfo.handle}
            </p>
            <p className="text-xs capitalize text-gray-600 dark:text-gray-400">
              {userInfo.rank}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
              <span>Rating: {userInfo.rating}</span>
              <span>Max: {userInfo.maxRating}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-sm p-2   outline-2 outline-offset-2 outline-white dark:outline-gray-800 rounded-xl shadow-md">
        <h2 className="font-bold mb-2 text-gray-800 dark:text-gray-100 text-center">
          Login with Codeforces API
        </h2>
        <form
          onSubmit={handleLogin}
          className="w-full flex flex-col items-center">
          <input
            type="text"
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            placeholder="Username (e.g. tourist)"
            className="border p-2 rounded w-full mb-2 text-sm text-gray-800 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600"
          />
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key"
            className="border p-2 rounded w-full mb-2 text-sm text-gray-800 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600"
          />
          <input
            type="text"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="API Secret"
            className="border p-2 rounded w-full mb-2 text-sm text-gray-800 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600"
          />
          {error && (
            <p className="text-red-500 dark:text-red-400 text-xs mb-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm transition">
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileInfo;
