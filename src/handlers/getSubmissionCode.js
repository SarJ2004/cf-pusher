/* eslint-disable no-undef */
export const getSubmissionCode = (contestId, submissionId) => {
  return new Promise((resolve, reject) => {
    const url = `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;

    chrome.tabs.create({ url, active: false }, (tab) => {
      const tabId = tab.id;

      const listener = (message, sender) => {
        if (
          message.type === "SUBMISSION_CODE" &&
          sender.tab &&
          sender.tab.id === tabId
        ) {
          chrome.runtime.onMessage.removeListener(listener);
          chrome.tabs.remove(tabId);

          if (message.code) {
            resolve(message.code);
          } else {
            reject(new Error(message.error || "No code found"));
          }
        }
      };

      chrome.runtime.onMessage.addListener(listener);
    });
  });
};
