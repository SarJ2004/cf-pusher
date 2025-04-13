/* eslint-disable no-undef */
setTimeout(() => {
  const codeElement = document.querySelector("pre.program-source");
  if (codeElement) {
    chrome.runtime.sendMessage({
      type: "SUBMISSION_CODE",
      code: codeElement.innerText,
    });
  } else {
    chrome.runtime.sendMessage({
      type: "SUBMISSION_CODE",
      code: null,
      error: "Code element not found",
    });
  }
}, 1500);
