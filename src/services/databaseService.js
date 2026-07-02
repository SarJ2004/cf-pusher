/**
 * Updates or creates database.json index with a new accepted problem.
 * @param {Object} existingDb - Decoded contents of database.json or null
 * @param {Object} problemData - { contestId, index, name, rating, timestamp, path }
 * @returns {Object} Updated database structure
 */
export function updateDatabaseIndex(existingDb, problemData) {
  const db = existingDb || {
    stats: { total: 0, by_rating: {} },
    problems: []
  };

  if (!db.stats) db.stats = { total: 0, by_rating: {} };
  if (!db.problems) db.problems = [];

  const problemKey = `${problemData.contestId}${problemData.index}`;

  const cleanName = String(problemData.name ?? "").replaceAll("_", " ");

  const newProblem = {
    contestId: String(problemData.contestId),
    index: String(problemData.index),
    name: cleanName,
    rating: String(problemData.rating),
    timestamp: Number(problemData.timestamp),
    path: problemData.path
  };

  const existingIdx = db.problems.findIndex(
    (p) => `${p.contestId}${p.index}` === problemKey
  );

  if (existingIdx !== -1) {
    db.problems[existingIdx] = newProblem;
  } else {
    db.problems.push(newProblem);
  }

  // Recalculate stats
  db.stats.total = db.problems.length;
  db.stats.by_rating = {};

  db.problems.forEach((p) => {
    const r = p.rating || "Unrated";
    db.stats.by_rating[r] = (db.stats.by_rating[r] || 0) + 1;
  });

  // Sort newest first
  db.problems.sort((a, b) => b.timestamp - a.timestamp);

  return db;
}
