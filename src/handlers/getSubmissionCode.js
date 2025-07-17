/* eslint-disable no-undef */

const createHiddenTab = (url) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(
      {
        url: url,
        active: false,
        pinned: true,
        index: 0,
      },
      (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (tab) {
          resolve({ tabId: tab.id, windowId: null });
        } else {
          reject(new Error("Failed to create tab"));
        }
      }
    );
  });
};

const createHiddenWindow = (url) => {
  return new Promise((resolve, reject) => {
    chrome.windows.create(
      {
        url: url,
        type: "popup",
        width: 1,
        height: 1,
        left: -1000,
        top: -1000,
        focused: false,
      },
      (window) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (window && window.tabs && window.tabs[0]) {
          resolve({ tabId: window.tabs[0].id, windowId: window.id });
        } else {
          reject(new Error("Failed to create window"));
        }
      }
    );
  });
};

export const getSubmissionCode = (contestId, submissionId) => {
  return new Promise((resolve, reject) => {
    const url = `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
    let tabId, windowId;

    const performExtraction = async () => {
      try {
        // Try hidden window first, fallback to tab if it fails
        try {
          const result = await createHiddenWindow(url);
          tabId = result.tabId;
          windowId = result.windowId;
        } catch (windowError) {
          console.log("Hidden window failed, falling back to tab approach");
          console.log("Window error:", windowError.message);
          const result = await createHiddenTab(url);
          tabId = result.tabId;
          windowId = result.windowId;
        }

        let timeoutId;

        const cleanup = () => {
          chrome.runtime.onMessage.removeListener(listener);
          if (timeoutId) clearTimeout(timeoutId);

          // Remove window if it exists, otherwise remove tab
          if (windowId) {
            chrome.windows.remove(windowId).catch(() => {});
          } else {
            chrome.tabs.remove(tabId).catch(() => {});
          }
        };

        const listener = (message, sender) => {
          if (
            message.type === "SUBMISSION_CODE" &&
            sender.tab &&
            sender.tab.id === tabId
          ) {
            cleanup();

            if (message.code) {
              resolve(message.code);
            } else {
              reject(new Error(message.error || "No code found"));
            }
          }
        };

        chrome.runtime.onMessage.addListener(listener);

        // Set a timeout to handle cases where the content script doesn't respond
        timeoutId = setTimeout(() => {
          cleanup();
          reject(
            new Error(
              "Timeout: Could not retrieve submission code. Please ensure you're logged in to Codeforces."
            )
          );
        }, 2000); // 🚀 Reduced to 2s for faster response
      } catch (error) {
        reject(new Error(`Failed to create hidden context: ${error.message}`));
      }
    };

    performExtraction();
  });
};

export const getProblemStatement = (contestId, index) => {
  return new Promise((resolve, reject) => {
    const url = `https://codeforces.com/contest/${contestId}/problem/${index}`;
    let tabId, windowId;

    const performExtraction = async () => {
      try {
        // Try hidden window first, fallback to tab if it fails
        try {
          const result = await createHiddenWindow(url);
          tabId = result.tabId;
          windowId = result.windowId;
        } catch (windowError) {
          console.log(
            "Hidden window failed for problem statement, falling back to tab"
          );
          console.log("Window error:", windowError.message);
          const result = await createHiddenTab(url);
          tabId = result.tabId;
          windowId = result.windowId;
        }

        let timeoutId;

        const cleanup = () => {
          chrome.runtime.onMessage.removeListener(listener);
          if (timeoutId) clearTimeout(timeoutId);

          if (windowId) {
            chrome.windows.remove(windowId).catch(() => {});
          } else {
            chrome.tabs.remove(tabId).catch(() => {});
          }
        };

        const listener = (message, sender) => {
          if (
            message.type === "PROBLEM_STATEMENT" &&
            sender.tab &&
            sender.tab.id === tabId
          ) {
            cleanup();

            if (message.html) {
              resolve(message.html);
            } else {
              reject(new Error(message.error || "Problem statement not found"));
            }
          }
        };

        chrome.runtime.onMessage.addListener(listener);

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Timeout: Could not retrieve problem statement"));
        }, 3000); // 🚀 Reduced to 3s for faster response
      } catch (error) {
        reject(new Error(`Failed to create hidden context: ${error.message}`));
      }
    };

    performExtraction();
  });
};
