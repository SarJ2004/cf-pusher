/* eslint-disable no-undef */

const createHiddenTab = (url) =>
  new Promise((resolve, reject) => {
    chrome.tabs.create(
      {
        url,
        active: false,
        pinned: true,
        index: 0,
      },
      (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!tab) {
          reject(new Error("Failed to create tab"));
          return;
        }

        resolve({ tabId: tab.id, windowId: null });
      },
    );
  });

const closeExtractionContext = ({ tabId, windowId }) => {
  if (windowId) {
    chrome.windows.remove(windowId).catch(() => {});
    return;
  }

  if (tabId) {
    chrome.tabs.remove(tabId).catch(() => {});
  }
};

const waitForRuntimeMessage = ({
  expectedType,
  tabId,
  timeoutMs,
  parse,
  timeoutMessage,
}) =>
  new Promise((resolve, reject) => {
    let timeoutId;

    const cleanup = () => {
      chrome.runtime.onMessage.removeListener(listener);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const listener = (message, sender) => {
      if (message.type !== expectedType) {
        return;
      }

      if (!sender.tab || sender.tab.id !== tabId) {
        return;
      }

      cleanup();

      try {
        resolve(parse(message));
      } catch (error) {
        reject(error);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

const extractFromUrl = async ({
  url,
  expectedType,
  timeoutMs,
  timeoutMessage,
  parse,
}) => {
  const { tabId, windowId } = await createHiddenTab(url);

  try {
    return await waitForRuntimeMessage({
      expectedType,
      tabId,
      timeoutMs,
      parse,
      timeoutMessage,
    });
  } finally {
    closeExtractionContext({ tabId, windowId });
  }
};

export const getSubmissionCode = async (contestId, submissionId) => {
  const url = `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;

  try {
    return await extractFromUrl({
      url,
      expectedType: "SUBMISSION_CODE",
      timeoutMs: 2000,
      timeoutMessage:
        "Timeout: Could not retrieve submission code. Please ensure you are logged in to Codeforces.",
      parse: (message) => {
        if (!message.code) {
          throw new Error(message.error || "No code found");
        }

        return message.code;
      },
    });
  } catch (error) {
    throw new Error(`Failed to extract submission code: ${error.message}`);
  }
};

export const getProblemStatement = async (contestId, index) => {
  const url = `https://codeforces.com/contest/${contestId}/problem/${index}`;

  try {
    return await extractFromUrl({
      url,
      expectedType: "PROBLEM_STATEMENT",
      timeoutMs: 3000,
      timeoutMessage: "Timeout: Could not retrieve problem statement",
      parse: (message) => {
        if (!message.html) {
          throw new Error(message.error || "Problem statement not found");
        }

        return message.html;
      },
    });
  } catch (error) {
    throw new Error(`Failed to extract problem statement: ${error.message}`);
  }
};
