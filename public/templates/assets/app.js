(function () {
  const STORAGE_KEY = "cp-archive-theme";
  const root = document.documentElement;
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  const preferredTheme = "light";

  root.dataset.theme = savedTheme || preferredTheme;

  window.CPArchive = {
    config: null,

    setTheme(theme) {
      root.dataset.theme = theme;
      localStorage.setItem(STORAGE_KEY, theme);
      document.querySelectorAll("[data-theme-label]").forEach((label) => {
        label.textContent = theme === "dark" ? "Dark mode" : "Light mode";
      });
    },
    toggleTheme() {
      this.setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    },
    escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },
    formatProblemName(name) {
      return String(name ?? "").replaceAll("_", " ");
    },
    encodePath(path) {
      return String(path ?? "")
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
    },
    ratingTheme(rating) {
      if (rating === "Unrated") return ["#64748b", "#334155", "Unrated"];
      const value = Number.parseInt(rating, 10);
      if (value < 1000) return ["#10b981", "#0891b2", "Newcomer"];
      if (value < 1200) return ["#06b6d4", "#2563eb", "Pupil"];
      if (value < 1400) return ["#3b82f6", "#7c3aed", "Specialist"];
      if (value < 1600) return ["#8b5cf6", "#c026d3", "Expert"];
      return ["#f43f5e", "#f97316", "Advanced"];
    },
    initThemeControls() {
      document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
        button.addEventListener("click", () => this.toggleTheme());
      });
      this.setTheme(root.dataset.theme);
    },

    async loadConfig() {
      try {
        const response = await fetch("./config.json");
        if (response.ok) {
          this.config = await response.json();
          this.applyConfig();
        }
      } catch (e) {
        console.error("Config missing. Using defaults.", e);
      }
    },

    applyConfig() {
      if (!this.config) return;
      const { cfHandle, githubUsername, repoName } = this.config;
      
      // Update site header brand titles
      document.querySelectorAll(".brand-title").forEach(el => {
        if (el.id !== "header-title") {
          el.textContent = `${cfHandle} Codeforces Dashboard`;
        }
      });
      
      const profileName = document.querySelector(".profile-name-row h2");
      if (profileName) profileName.textContent = cfHandle;
      
      const profileLink = document.querySelector(".profile-info p a");
      if (profileLink) {
        profileLink.href = `https://codeforces.com/profile/${cfHandle}`;
        profileLink.textContent = cfHandle;
      }
      
      const avatar = document.querySelector(".profile-avatar");
      if (avatar && cfHandle) {
        avatar.textContent = cfHandle.substring(0, 2).toUpperCase();
      }
      
      document.querySelectorAll(".header-actions a, .hero-actions .chip-button").forEach(link => {
        if (link.href && link.href.includes("github.com")) {
          link.href = `https://github.com/${githubUsername}/${repoName}`;
        }
      });
    },

    async initDashboard() {
      const grid = document.getElementById("rating-grid");
      const totalCount = document.getElementById("total-count");
      const ratingCount = document.getElementById("rating-count");
      const heatmapContainer = document.getElementById("heatmap-container");
      const recentList = document.getElementById("recent-submissions-list");

      const bannerSolved = document.getElementById("banner-solved-count");
      const bannerCategory = document.getElementById("banner-category-count");
      const vaultDistribution = document.getElementById("vault-distribution-list");

      await this.loadConfig(); // Load config first

      try {
        const response = await fetch("./database.json");
        if (!response.ok) throw new Error("Database file missing.");
        const data = await response.json();

        const total = Number(data.stats?.total ?? 0);
        const byRating = data.stats?.by_rating ?? {};
        const problems = data.problems ?? [];

        // Update total solved metric
        if (totalCount) totalCount.textContent = total;
        if (bannerSolved) bannerSolved.textContent = total;

        const ratings = Object.keys(byRating).sort((a, b) => {
          if (a === "Unrated") return 1;
          if (b === "Unrated") return -1;
          return Number.parseInt(a, 10) - Number.parseInt(b, 10);
        }).filter((rating) => Number(byRating[rating]) > 0);

        if (ratingCount) ratingCount.textContent = ratings.length;
        if (bannerCategory) bannerCategory.textContent = ratings.length;

        // Render ratings grid
        if (grid) {
          if (ratings.length === 0) {
            grid.innerHTML = `<div class="empty-state panel">No categorized problems found yet.</div>`;
          } else {
            grid.innerHTML = ratings.map((rating) => {
              const count = Number(byRating[rating]);
              const percent = total ? Math.round((count / total) * 100) : 0;
              const [start, end, label] = this.ratingTheme(rating);
              return `
                <a class="rating-card" href="category.html?rating=${encodeURIComponent(rating)}" style="--rating-a:${start};--rating-b:${end}">
                  <div>
                    <div class="rating-top">
                      <div>
                        <p class="rating-label">${this.escapeHtml(label)}</p>
                        <h3 class="rating-value">${this.escapeHtml(rating)}</h3>
                      </div>
                      <span class="rating-badge">${count}</span>
                    </div>
                    <div class="progress-track" aria-hidden="true">
                      <div class="progress-fill" style="width:${Math.max(percent, 6)}%"></div>
                    </div>
                  </div>
                  <div class="rating-footer">
                    <span>${percent}% of archive</span>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </a>
              `;
            }).join("");
          }
        }

        // Render Vault Distribution List
        if (vaultDistribution) {
          if (ratings.length === 0) {
            vaultDistribution.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-soft); margin: 0;">No rating bands populated.</p>`;
          } else {
            vaultDistribution.innerHTML = ratings.map(rating => {
              const count = Number(byRating[rating]);
              const percent = total ? Math.round((count / total) * 100) : 0;
              const [start, end, label] = this.ratingTheme(rating);
              return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-bottom: 2px;">
                    <span>${this.escapeHtml(rating)} (${this.escapeHtml(label)})</span>
                    <span>${count} (${percent}%)</span>
                  </div>
                  <div style="width: 100%; height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--text-soft) 20%, transparent); overflow: hidden;">
                    <div style="height: 100%; width: ${percent}%; background: linear-gradient(90deg, ${start}, ${end});"></div>
                  </div>
                </div>
              `;
            }).join("");
          }
        }

        // Render Heatmap
        if (heatmapContainer) {
          this.renderHeatmap(problems, heatmapContainer);
        }

        // Render Recent Submissions
        if (recentList) {
          this.renderRecentSubmissions(problems, recentList);
        }

      } catch (err) {
        console.error("Error loading dashboard:", err);
        if (grid) {
          grid.innerHTML = `
            <div class="error-state panel">
              Failed to load <strong>database.json</strong>. Run the indexing pipeline or make sure the file exists in the project root.
            </div>
          `;
        }
      }
    },

    renderHeatmap(problems, container) {
      if (!container) return;

      const counts = {};
      for (const problem of problems) {
        if (!problem.timestamp) continue;
        const date = new Date(problem.timestamp * 1000);
        const dateString = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        counts[dateString] = (counts[dateString] || 0) + 1;
      }

      const today = new Date();
      const dateArray = [];
      for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        dateArray.push({
          date: date,
          dateString: dateString,
          count: counts[dateString] || 0
        });
      }

      const firstDay = dateArray[0].date;
      const dayOfWeek = firstDay.getDay();

      const weeks = [];
      let currentWeek = [];

      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push(null);
      }

      for (const day of dateArray) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push(currentWeek);
      }

      // Generate Month labels aligned to columns
      let monthsHtml = `
        <div style="display: grid; grid-template-columns: repeat(${weeks.length}, 10px); gap: 3px; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 2px; height: 16px;">
      `;
      let lastMonthStr = "";
      for (let i = 0; i < weeks.length; i++) {
        const firstDay = weeks[i].find(d => d !== null);
        if (firstDay) {
          const mStr = firstDay.date.toLocaleDateString("en-US", { month: "short" });
          // Ensure we don't print the same month label in close adjacent weeks
          if (mStr !== lastMonthStr && (i - lastMonthStr.length > 2 || lastMonthStr === "")) {
            monthsHtml += `<span style="grid-column: ${i + 1}; font-weight: 700; white-space: nowrap;">${mStr}</span>`;
            lastMonthStr = mStr;
          }
        }
      }
      monthsHtml += `</div>`;

      let gridHtml = `
        <div style="display: grid; grid-template-rows: repeat(7, 10px); grid-auto-flow: column; gap: 3px; padding: 2px 0;">
      `;

      for (const week of weeks) {
        for (const day of week) {
          if (day === null) {
            gridHtml += `<div style="width: 10px; height: 10px; border-radius: 2px; opacity: 0.1; background: var(--text-soft);"></div>`;
          } else {
            let color = "color-mix(in srgb, var(--text-soft) 12%, transparent)";
            if (day.count > 0) {
              if (day.count === 1) color = "color-mix(in srgb, var(--brand) 40%, transparent)";
              else if (day.count === 2) color = "color-mix(in srgb, var(--brand) 70%, transparent)";
              else color = "var(--brand)";
            }
            const formattedDate = day.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const tooltip = `${day.count} ${day.count === 1 ? 'submission' : 'submissions'} on ${formattedDate}`;
            gridHtml += `
              <div title="${tooltip}" style="width: 10px; height: 10px; border-radius: 2px; background: ${color}; cursor: pointer; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>
            `;
          }
        }
      }
      gridHtml += `</div>`;

      const legendHtml = `
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: 0.75rem; color: var(--text-muted); padding-top: 8px;">
          <span>Less</span>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: color-mix(in srgb, var(--text-soft) 12%, transparent);"></div>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: color-mix(in srgb, var(--brand) 40%, transparent);"></div>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: color-mix(in srgb, var(--brand) 70%, transparent);"></div>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--brand);"></div>
          <span>More</span>
        </div>
      `;

      container.innerHTML = monthsHtml + gridHtml + legendHtml;

      // Automatically scroll heatmap to the right to show the latest activity on mobile viewports
      const scrollWrapper = container.closest('.heatmap-scroll-wrapper');
      if (scrollWrapper) {
        requestAnimationFrame(() => {
          scrollWrapper.scrollLeft = scrollWrapper.scrollWidth;
        });
      }
    },

    renderRecentSubmissions(problems, container) {
      if (!container) return;

      const recent = [...problems]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 8);

      if (recent.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">No submissions found.</p>`;
        return;
      }

      container.innerHTML = recent.map(problem => {
        const contestCode = `${problem.contestId}${problem.index}`;
        const problemName = this.formatProblemName(problem.name);

        const dateObj = new Date((problem.timestamp || 0) * 1000);
        const dateStr = (problem.timestamp && problem.timestamp > 0)
          ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Unknown';

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 0.85rem; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span style="font-family: 'JetBrains Mono', monospace; font-weight: 800; color: var(--brand); font-size: 0.75rem;">${this.escapeHtml(contestCode)}</span>
                <span style="font-size: 0.75rem; color: var(--text-soft);">${this.escapeHtml(dateStr)}</span>
              </div>
              <div style="font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(problemName)}">
                ${this.escapeHtml(problemName)}
              </div>
            </div>
            <a href="solution.html?path=${encodeURIComponent(problem.path)}" class="text-button" style="min-height: 28px; height: 28px; padding: 0 8px; font-size: 0.75rem;">
              View
            </a>
          </div>
        `;
      }).join("");
    }
  };

  document.addEventListener("DOMContentLoaded", () => window.CPArchive.initThemeControls());
})();
