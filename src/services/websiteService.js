import { fetchFileFromGitHub, pushToGitHubWithRetry } from "./githubService";

const TEMPLATE_FILES = [
  "index.html",
  "category.html",
  "solution.html",
  "assets/app.js",
  "assets/app.css"
];

/**
 * Checks if the portfolio site exists in the repo, and deploys it if missing.
 */
export async function deployStaticSiteIfMissing(token, repoFullName, githubUser, cfHandle) {
  try {
    // 1. Check if index.html exists
    const siteFile = await fetchFileFromGitHub(repoFullName, "index.html", token);
    if (siteFile) {
      // Portfolio site already exists. Check config.json.
      const configFile = await fetchFileFromGitHub(repoFullName, "config.json", token);
      if (!configFile) {
        await deployConfig(token, repoFullName, githubUser, cfHandle);
      }
      return;
    }

    console.log("Portfolio site missing. Deploying templates...");

    // 2. Deploy config.json
    await deployConfig(token, repoFullName, githubUser, cfHandle);

    // 3. Deploy template files from extension directory
    for (const filename of TEMPLATE_FILES) {
      const templateUrl = chrome.runtime.getURL(`templates/${filename}`);
      const res = await fetch(templateUrl);
      if (!res.ok) {
        console.error(`Failed to read template file: ${filename}`);
        continue;
      }
      const content = await res.text();
      await pushToGitHubWithRetry({
        repoFullName,
        githubToken: token,
        filePath: filename,
        commitMessage: `Deploy CFPusher static template: ${filename}`,
        content
      });
    }

    // 4. Deploy .github/workflows/static.yml Pages workflow if missing
    const workflowPath = ".github/workflows/static.yml";
    const workflowFile = await fetchFileFromGitHub(repoFullName, workflowPath, token);
    if (!workflowFile) {
      const workflowContent = `# Simple workflow for deploying static content to GitHub Pages
name: Deploy webpage for CFPusher

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5`;

      await pushToGitHubWithRetry({
        repoFullName,
        githubToken: token,
        filePath: workflowPath,
        commitMessage: "Configure Pages deploy workflow",
        content: workflowContent
      });
    }
  } catch (error) {
    console.error("Error deploying static website templates:", error);
  }
}

async function deployConfig(token, repoFullName, githubUser, cfHandle) {
  const config = {
    githubUsername: githubUser,
    repoName: repoFullName.split("/")[1] || repoFullName,
    cfHandle: cfHandle,
    branch: "main"
  };
  await pushToGitHubWithRetry({
    repoFullName,
    githubToken: token,
    filePath: "config.json",
    commitMessage: "Configure CFPusher Portfolio Settings",
    content: JSON.stringify(config, null, 2)
  });
}
