[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M21Y0WRY)
<div align="center">
  <a href="https://github.com/SarJ2004/cf-pusher">
    <img src="https://res.cloudinary.com/do2max7gt/image/upload/v1745579131/ext-icon_pquhfy.png" alt="Logo" width="360">
  </a>
  <br/>
  <a href="https://chromewebstore.google.com/detail/cfpusher-codeforces-to-gi/eiffefcjnaanflbhcmgjlaoilhpkbael">
    <img src="https://res.cloudinary.com/do2max7gt/image/upload/v1745580622/chrome-web-store_vkyxkm.png" alt="Logo" width="250">
  </a>
  
<h1 align="center"><a href="https://chromewebstore.google.com/detail/cfpusher-codeforces-to-gi/eiffefcjnaanflbhcmgjlaoilhpkbael">CFPusher-Codeforces to GitHub<a/></h1>

  <p align="center">
      A powerful and user-friendly Chrome extension that pushes your accepted Codeforces submissions to your GitHub repository
    <br />
    <a href="https://github.com/SarJ2004/cf-pusher/issues/new?template=bug_report.md">Report Bug</a>
    &middot;
    <a href="https://github.com/SarJ2004/cf-pusher/issues/new?template=feature_request.md">Request Feature</a>
  </p>
</div>

---

## Table of Contents

- [Description](#description)
   - [Screenshots](#screenshots)
- [Features](#features)
- [Installation](#installation)
  - [Downloading the Extension](#downloading-the-extension)
  - [Manual Installation in Chrome](#manual-installation-in-chrome)
- [Usage](#usage)
  - [Known Issues](#known-issues)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
  - [Continuous Integration & Releases](#continuous-integration--releases)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Description

A powerful and user-friendly Chrome extension that pushes your accepted Codeforces submissions to your GitHub repository. It supports fast auto-sync for the latest accepted solution and optional backfill for older accepted problems. The project is built with [Vite](https://vitejs.dev/) for fast development builds and optimized production output.

### Screenshots
![Popup View](https://res.cloudinary.com/dgguacekk/image/upload/v1776790458/login-1_jnqdvw.png)
<br/>
<br/>
*Popup showing the Codeforces login Screen*

![Settings Page](https://res.cloudinary.com/dgguacekk/image/upload/v1776790458/github-login-1_rsbfx8.png)
<br/>
<br/>
*Settings section where you can link your GitHub*

![Settings Page - Post Login](https://res.cloudinary.com/dgguacekk/image/upload/v1776790458/github-login-2_xxhzme.png)
<br/>
<br/>
*Settings section where you can see your Github Connection status*

![Post-Login Screen](https://res.cloudinary.com/dgguacekk/image/upload/v1776790458/home-1_etlijh.png)
<br/>
<br/>
*Post-Login Screen*

![Streak and Solved Menu](https://res.cloudinary.com/dgguacekk/image/upload/v1776790458/home-2_czulvm.png)
<br/>
<br/>
*Streak chart and Solved Problems chart*

![Successful Push](https://res.cloudinary.com/do2max7gt/image/upload/v1745580202/0bae78c6-043a-426f-affb-d01ef4583f1d.png)
<br/>
<br/>
*Sample GitHub repo with pushed code and problem statement*

---

## Features

- **Auto Push Accepted Submissions:** Automatically pushes your latest accepted Codeforces submission to a selected GitHub repository.
- **Optional Past Submission Backfill:** Enable past sync to backfill older accepted problems (latest accepted submission per problem).
- **Streak Tracker** Tracks your Codeforces streak for the current week and displays it visually inside the popup.
- **Problem Rating Chart** It has a problem rating chart and a mini info section, which tells one about the profile information, as well as the number of different problems solved in each rating range.
- **Codeforces OAuth Login** Sign in to Codeforces via OAuth from inside the extension.
- **GitHub OAuth Integration** Secured with GitHub's OAuth to authorize and manage repositories.
- **Repo Selection & Creation** The user can choose to select any repo of their choice to push their codes, or additionaly, create a seperate repo.
- **Dark Mode Integration** Yayyy you can now toggle between dark and light modes!!

---

## Installation

### Downloading the Extension
Download from the [Chrome Web Store](https://chromewebstore.google.com/detail/cfpusher-codeforces-to-gi/eiffefcjnaanflbhcmgjlaoilhpkbael) Directly into your Chrome browser

OR,

You can download the latest release of the extension directly from GitHub, and proceed with the manual installation as instructed below:

[Download Latest Release](https://github.com/SarJ2004/cf-pusher/releases/latest)

### Manual Installation in Chrome

1. **Download and Unzip:**  
   Download the ZIP file from the [Releases](https://github.com/SarJ2004/cf-pusher/releases) section and unzip it to a desired location on your computer.

2. **Open Chrome Extensions Page:**  
   Open Chrome and navigate to `chrome://extensions/`.

3. **Enable Developer Mode:**  
   Toggle on the **Developer mode** switch on the top-right corner of the extensions page.

4. **Load Unpacked Extension:**  
   Click the **Load unpacked** button and select the unzipped folder of your extension.

5. **Enjoy!**  
   Your extension should now appear in Chrome, and you can start using it immediately.

---

## Usage

Once installed, click on the extension icon in your Chrome toolbar or follow the in-page instructions provided by the extension.
1. **Connect to Codeforces:**  
   Open the popup and sign in with Codeforces OAuth. You only need the OAuth client ID (the field is prefilled by default in the extension), then complete the login flow in the browser popup.

2. **Connect to GitHub:**  
   Click on the settings icon at the top right of the popup, and authorize your GitHub account.

3. **Connect your preferred repo:**  
   After connecting to GitHub, choose the repository where your solutions should be pushed. You can either link an existing repo or create a new one directly from settings.

4. **(Optional) Enable past submission sync:**  
   In settings, toggle **Push Past Submissions** if you want CFPusher to backfill previously solved accepted problems.

You are all set now!!

### Known Issues
1. **Unable to submit codes during contests**  
   The api has no access to the codes submitted during the contests, so, after the contest is over(checking phase is over), you can resubmit them to push.

2. **Rapid consecutive submissions**  
   CFPusher syncs frequently, but if many accepted submissions arrive in a very short time window, GitHub/API rate limits and extraction timing can still delay some pushes. Use manual sync or enable past submission sync to recover older accepted problems.
   
3. **Problem statement formatting edge cases**
   Most statements are parsed correctly, but some MathJax/LaTeX-heavy problems may still have imperfect formatting in generated README files.  
   
---

## Development

### Prerequisites

- **Node.js (v18 or later):** [Download Node.js](https://nodejs.org/)
- **npm:** Comes with Node.js installation.

### Setup

Clone the repository to your local machine and install dependencies:

```bash
git clone https://github.com/SarJ2004/cf-pusher.git
cd cf-pusher
npm install
```

### Running Locally

For development and testing, you can run the extension in development mode with Vite:

```bash
npm run dev
```

This will start the Vite development server. Make sure to follow any additional instructions in your development documentation if the extension requires special handling during development.

### Building for Production

To generate a production build, run:

```bash
npm run build
```

This command will compile your project and output the production files into the `dist/` folder. These files are ready to be zipped and installed as described above.

To create a ZIP archive from `dist/` for distribution, run:

```bash
npm run zip
```

### Continuous Integration & Releases

This project uses GitHub Actions to automate the build and release process:

- **Workflow Setup:**  
  A workflow file is located at `.github/workflows/release.yml`. This file is responsible for:
  - Checking out the repository.
  - Installing dependencies.
  - Building the extension with Vite.
  - Zipping the `dist/` folder.
  - Creating a GitHub Release and attaching the ZIP file.

- **Triggering a Release:**  
  The action runs automatically when you push a version tag (for example, `v1.0.0`):
  
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```

- **Releases Section:**  
   Once the workflow completes, navigate to [Releases](https://github.com/SarJ2004/cf-pusher/releases/latest) to download the zipped extension.

---

## Contributing

Contributions are warmly welcomed! If you want to help improve this project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes with clear messages.
4. Open a Pull Request describing your changes.

For major changes, please open an issue first to discuss what you would like to change. Ensure any new code follows the coding conventions used throughout the project.

---

## License

This project is licensed under the [MIT License](https://github.com/SarJ2004/cf-pusher/blob/main/LICENSE). See the LICENSE file for more details.

---

## Acknowledgements

- [Vite](https://vitejs.dev/) – for the powerful and fast build tool.
- GitHub Actions – for automating builds and releases.
- [LeetSyncV2](https://github.com/disturbedlord/LeetSync2) for the inspiration to make a similar extension for codeforces

