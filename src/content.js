/* eslint-disable no-undef */

const PAGE_KIND = {
  submission: "submission",
  problem: "problem",
  submissions: "submissions",
  unknown: "unknown",
};

const CODE_NOT_FOUND_ERROR = "Code element not found on page";
const PROBLEM_NOT_FOUND_ERROR = "Problem statement not found on page";
const ACCESS_DENIED_ERROR =
  "Access denied - you may not have permission to view this page";

const sendResult = (type, data, error = null) => {
  try {
    const message = {
      type,
      error,
      url: window.location.href,
      timestamp: Date.now(),
    };

    if (type === "SUBMISSION_CODE") {
      message.code = data;
    } else if (type === "PROBLEM_STATEMENT") {
      message.html = data;
    } else {
      message.data = data;
    }

    chrome.runtime.sendMessage(message);
  } catch (error) {
    console.warn(`Failed to send ${type} result:`, error);
  }
};

const getPageKind = () => {
  const { pathname } = window.location;

  if (pathname.includes("/submission/")) {
    return PAGE_KIND.submission;
  }

  if (pathname.includes("/problem/")) {
    return PAGE_KIND.problem;
  }

  if (pathname.includes("/submissions/")) {
    return PAGE_KIND.submissions;
  }

  return PAGE_KIND.unknown;
};

const readCodeText = (element) => {
  if (!element) {
    return null;
  }

  const preferred =
    typeof element.innerText === "string" ? element.innerText : null;
  const fallback =
    typeof element.textContent === "string" ? element.textContent : null;
  const raw = (preferred ?? fallback ?? "").replace(/\r\n/g, "\n");

  return raw.trim() ? raw : null;
};

const findBySelectors = (selectors, extractor) => {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      const data = extractor(element);
      if (data) {
        return data;
      }
    } catch (error) {
      console.warn(`Selector failed: ${selector}`, error);
    }
  }

  return null;
};

const extractSubmissionCode = () => {
  const selectors = [
    "pre#program-source-text",
    "pre.prettyprint",
    ".source pre",
    "#program-source-text",
  ];

  const fromSelectors = findBySelectors(selectors, readCodeText);
  if (fromSelectors) {
    return fromSelectors;
  }

  const allPreElements = document.querySelectorAll("pre");
  for (const element of allPreElements) {
    const content = readCodeText(element);
    if (!content) {
      continue;
    }

    if (
      content.length > 50 &&
      (content.includes("int") ||
        content.includes("def") ||
        content.includes("class"))
    ) {
      return content;
    }
  }

  return null;
};

const extractProblemStatement = () => {
  const selectors = [
    ".problem-statement",
    ".problemtext",
    ".problem",
    "#problem-statement",
    ".statement",
    'div[class*="problem"]',
  ];

  const fromSelectors = findBySelectors(selectors, (element) => {
    if (!element || !element.innerHTML.trim()) {
      return null;
    }

    return element.innerHTML.trim();
  });

  if (fromSelectors) {
    return fromSelectors;
  }

  const fallback = document.querySelector(".main-content, .content, main");
  if (fallback?.innerHTML?.trim()) {
    return fallback.innerHTML.trim();
  }

  return null;
};

const sendExtractionError = (pageKind, errorMessage) => {
  if (pageKind === PAGE_KIND.submission) {
    sendResult("SUBMISSION_CODE", null, errorMessage);
  }

  if (pageKind === PAGE_KIND.problem) {
    sendResult("PROBLEM_STATEMENT", null, errorMessage);
  }
};

const hasAccessDenied = () => {
  const indicators = [
    ".access-denied",
    '[class*="error"]',
    '[class*="forbidden"]',
    '[class*="denied"]',
  ];

  for (const selector of indicators) {
    if (document.querySelector(selector)) {
      return true;
    }
  }

  return document.body.innerText.toLowerCase().includes("access denied");
};

const tryExtraction = () => {
  const pageKind = getPageKind();

  if (pageKind === PAGE_KIND.submission) {
    const code = extractSubmissionCode();
    if (code) {
      sendResult("SUBMISSION_CODE", code);
      return true;
    }
  }

  if (pageKind === PAGE_KIND.problem) {
    const html = extractProblemStatement();
    if (html) {
      sendResult("PROBLEM_STATEMENT", html);
      return true;
    }
  }

  return false;
};

const attemptExtraction = () => {
  const pageKind = getPageKind();
  if (pageKind === PAGE_KIND.unknown || pageKind === PAGE_KIND.submissions) {
    return;
  }

  if (tryExtraction()) {
    return;
  }

  if (hasAccessDenied()) {
    sendExtractionError(pageKind, ACCESS_DENIED_ERROR);
    return;
  }

  const retry = () => {
    if (tryExtraction()) {
      return;
    }

    sendExtractionError(
      pageKind,
      pageKind === PAGE_KIND.submission
        ? CODE_NOT_FOUND_ERROR
        : PROBLEM_NOT_FOUND_ERROR,
    );
  };

  if (document.readyState !== "complete") {
    setTimeout(retry, 150);
    return;
  }

  retry();
};

const respondWithExtraction = (action) => {
  if (action === "extractSubmissionCode") {
    const code = extractSubmissionCode();
    return {
      success: Boolean(code),
      data: code,
      error: code ? null : "Code not found",
      url: window.location.href,
    };
  }

  if (action === "extractProblemStatement") {
    const html = extractProblemStatement();
    return {
      success: Boolean(html),
      data: html,
      error: html ? null : "Problem statement not found",
      url: window.location.href,
    };
  }

  return null;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    const response = respondWithExtraction(request.action);
    if (!response) {
      return false;
    }

    sendResponse(response);
    return true;
  } catch (error) {
    console.error("Error in message listener:", error);
    sendResponse({
      success: false,
      data: null,
      error: error.message,
      url: window.location.href,
    });
    return true;
  }
});

const maybeTriggerImmediateSync = () => {
  const pageKind = getPageKind();
  if (pageKind !== PAGE_KIND.submission && pageKind !== PAGE_KIND.submissions) {
    return;
  }

  chrome.runtime
    .sendMessage({ action: "triggerImmediateSync" })
    .catch(() => {});
};

const initialize = () => {
  const pageKind = getPageKind();
  if (pageKind === PAGE_KIND.unknown) {
    return;
  }

  maybeTriggerImmediateSync();
  attemptExtraction();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

let previousUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href === previousUrl) {
    return;
  }

  previousUrl = window.location.href;
  setTimeout(initialize, 100);
});

if (window.location.hostname.includes("codeforces.com") && document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

window.addEventListener("beforeunload", () => {
  observer.disconnect();
});
