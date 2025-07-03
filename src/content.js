/* eslint-disable no-undef */

const extractSubmissionCode = () => {
  // Try multiple selectors for robustness
  const selectors = [
    "pre.program-source",
    "pre#program-source-text",
    ".program-source",
    "pre code",
  ];

  for (const selector of selectors) {
    const codeElement = document.querySelector(selector);
    if (codeElement && codeElement.innerText.trim()) {
      return codeElement.innerText.trim();
    }
  }
  return null;
};

const extractProblemStatement = () => {
  const problemElement = document.querySelector(".problem-statement");
  if (!problemElement) return null;

  // Clone the element to avoid modifying the original
  const clonedElement = problemElement.cloneNode(true);

  // Extract raw LaTeX from script tags before they're processed
  const mathScripts = clonedElement.querySelectorAll('script[type="math/tex"]');
  mathScripts.forEach((script) => {
    const mathContent = script.textContent.trim();
    const mathSpan = document.createElement("span");
    mathSpan.textContent = `$${mathContent}$`;
    mathSpan.className = "math-inline";
    script.parentNode.replaceChild(mathSpan, script);
  });

  // Extract display math
  const displayMathScripts = clonedElement.querySelectorAll(
    'script[type="math/tex; mode=display"]'
  );
  displayMathScripts.forEach((script) => {
    const mathContent = script.textContent.trim();
    const mathDiv = document.createElement("div");
    mathDiv.textContent = `$$${mathContent}$$`;
    mathDiv.className = "math-display";
    script.parentNode.replaceChild(mathDiv, script);
  });

  // Remove MathJax processing artifacts
  const mathJaxElements = clonedElement.querySelectorAll(
    '[class*="MathJax"], [id*="MathJax"]'
  );
  mathJaxElements.forEach((el) => el.remove());

  // Remove script tags
  const scripts = clonedElement.querySelectorAll("script");
  scripts.forEach((script) => script.remove());

  return clonedElement.innerHTML;
};

const sendResult = (type, content, error = null) => {
  chrome.runtime.sendMessage({
    type: type,
    [type === "SUBMISSION_CODE" ? "code" : "html"]: content,
    error: error,
  });
};

// Quick check first (for fast pages)
const quickExtract = () => {
  // Check if this is a submission page
  if (window.location.pathname.includes("/submission/")) {
    const code = extractSubmissionCode();
    if (code) {
      sendResult("SUBMISSION_CODE", code);
      return true;
    }
  }

  // Check if this is a problem page
  if (window.location.pathname.includes("/problem/")) {
    const problemHTML = extractProblemStatement();
    if (problemHTML) {
      sendResult("PROBLEM_STATEMENT", problemHTML);
      return true;
    }
  }

  return false;
};

// Main extraction logic
const attemptExtraction = () => {
  // Try immediate extraction first
  if (quickExtract()) return;

  // Check for common error states
  if (
    document.querySelector(".access-denied") ||
    document.body.innerText.includes("access denied")
  ) {
    const errorMsg =
      "Access denied - you may not have permission to view this page";

    if (window.location.pathname.includes("/submission/")) {
      sendResult("SUBMISSION_CODE", null, errorMsg);
    } else if (window.location.pathname.includes("/problem/")) {
      sendResult("PROBLEM_STATEMENT", null, errorMsg);
    }
    return;
  }

  // If page still loading, wait and retry once
  if (document.readyState !== "complete") {
    setTimeout(() => {
      if (window.location.pathname.includes("/submission/")) {
        const code = extractSubmissionCode();
        if (code) {
          sendResult("SUBMISSION_CODE", code);
        } else {
          sendResult("SUBMISSION_CODE", null, "Code element not found on page");
        }
      } else if (window.location.pathname.includes("/problem/")) {
        const problemHTML = extractProblemStatement();
        if (problemHTML) {
          sendResult("PROBLEM_STATEMENT", problemHTML);
        } else {
          sendResult(
            "PROBLEM_STATEMENT",
            null,
            "Problem statement not found on page"
          );
        }
      }
    }, 500); // 🚀 Reduced from 1s to 0.5s
  } else {
    // Page is loaded but content not found
    if (window.location.pathname.includes("/submission/")) {
      sendResult("SUBMISSION_CODE", null, "Code element not found on page");
    } else if (window.location.pathname.includes("/problem/")) {
      sendResult(
        "PROBLEM_STATEMENT",
        null,
        "Problem statement not found on page"
      );
    }
  }
};

// Start extraction
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(attemptExtraction, 200); // 🚀 Reduced from 500ms to 200ms
  });
} else {
  setTimeout(attemptExtraction, 200); // 🚀 Reduced from 500ms to 200ms
}
