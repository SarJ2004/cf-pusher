/* eslint-disable no-undef */

const SUBMISSION_EXTRACTION_TIMEOUT_MS = 8000;
const PROBLEM_EXTRACTION_TIMEOUT_MS = 8000;
const EXTRACTION_RETRY_DELAY_MS = 400;

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
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await extractFromUrl({
        url,
        expectedType: "SUBMISSION_CODE",
        timeoutMs: SUBMISSION_EXTRACTION_TIMEOUT_MS,
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
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, EXTRACTION_RETRY_DELAY_MS));
      }
    }
  }

  throw new Error(`Failed to extract submission code: ${lastError?.message || "Unknown error"}`);
};

export const getProblemStatement = async (contestId, index) => {
  const url = `https://codeforces.com/contest/${contestId}/problem/${index}`;

  try {
    return await extractFromUrl({
      url,
      expectedType: "PROBLEM_STATEMENT",
      timeoutMs: PROBLEM_EXTRACTION_TIMEOUT_MS,
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
