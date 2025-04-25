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
    A powerful and user-friendly Chrome extension that pushes your most recent Codeforces submission to your GitHub Repository
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

A powerful and user-friendly Chrome extension that pushes your most recent Codeforces submission to your GitHub Repository. It leverages modern web technologies and is built using [Vite](https://vitejs.dev/) for fast development builds and optimized production output.

### Screenshots
![Popup View](https://res.cloudinary.com/do2max7gt/image/upload/v1745578077/1_h1bvei.png)
<br/>
<br/>
*Popup showing the Codeforces login Screen*

![Settings Page](https://res.cloudinary.com/do2max7gt/image/upload/v1745578077/4_f6bimu.png)
<br/>
<br/>
*Settings section where you can link GitHub and manage your repo*

![Post-Login Screen](https://res.cloudinary.com/do2max7gt/image/upload/v1745578077/2_z4y5hw.png)
<br/>
<br/>
*Post-Login Screen*

![Streak and Solved Menu](https://res.cloudinary.com/do2max7gt/image/upload/v1745578077/3_b4vduo.png)
<br/>
<br/>
*Streak chart and Solved Problems chart*

![Successful Push](https://res.cloudinary.com/do2max7gt/image/upload/v1745580202/0bae78c6-043a-426f-affb-d01ef4583f1d.png)
<br/>
<br/>
*Sample GitHub repo with pushed code and problem statement*

---

## Features

- **Auto Push Accepted Submissions:** Automatically pushes your accepted Codeforces submissions to a selected GitHub repository without any manual work.
- **Streak Tracker** Tracks your Codeforces streak for the current week and displays it visually inside the popup.
- **Problem Rating Chart** It has a problem rating chart and a mini info section, which tells one about the profile information, as well as the number of different problems solved in each rating range.
- **GitHub OAuth Integration** Secured with GitHub's OAuth to authorize and manage repositories.
- **Repo Selection & Creation** The user can choose to select any repo of their choice to push their codes, or additionaly, create a seperate repo.
- **Dark Mode Integration** Yayyy you can now toggle between dark and light modes!!

---

## Installation

### Downloading the Extension
[Download from Chrome Directly](https://chromewebstore.google.com/detail/cfpusher-codeforces-to-gi/eiffefcjnaanflbhcmgjlaoilhpkbael)

OR,

You can download the latest release of the extension directly from GitHub, and proceed with the manual installation as instructed below:

[Download Latest Release](https://github.com/SarJ2004/cf-pusher/releases/download/v1.0.7/extension.zip)

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
   When the popup is opened, Connect the extension to GitHub by entering your Codeforces handle, the ApiKey, and the ApiSecret(which you can generate here: [Generate API Key and Secret](https://codeforces.com/settings/api)). Click on "Add an API Key", and then copy the details to the respective input boxes in the popup.

2. **Connect to GitHub:**  
   Click on the settings icon at the top right of the popup, and give access of your GitHub account to the extension.

3. **Connect your preferred repo:**  
   After connecting to github, you can now choose the repo to which your codes are to be pushed. You can either link a pre-existing repo, or, can create and link to a new one.

You are all set now!!

### Known Issues
1. **Unable to submit codes during contests**  
   The api has no access to the codes submitted during the contests, so, after the contest is over(checking phase is over), you can resubmit them to push.

2. **More of a Disadvantage**  
   The background script checks for new submissions every 30 seconds, but including the time to push, it takes almost a minute for the code to be available in one's repo. So, within that interval of a minute or so, if the user submits many different codes, only the most recent code gets pushed to the repo(sorry, will improve it in future, or you guys can too!).
   
3. **Problem Statement not formatted properly in README**
   I was unsuccessful to parse the problem statement properly in the README file. For the MathJax/latex elements, you will see them repeated, and a undefined term next to it. I promise to fix the parser later on.  
   
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
  Once the workflow completes, navigate to the [Releases](https://github.com/yourusername/yourrepo/releases/latest) section of your repository to download the zipped extension.

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

