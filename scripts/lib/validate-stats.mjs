const num = (v, field) => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`stats: ${field} is not a number`);
  return n;
};
const str = (v, field) => {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`stats: ${field} is not a string`);
  return v;
};

export function validateStats(raw) {
  if (raw === null || typeof raw !== 'object') throw new Error('stats: payload is not an object');
  if ('error' in raw) throw new Error(`stats: GAS returned error: ${raw.error}`);
  const cd = raw.contributionData;
  if (cd === null || cd === undefined || typeof cd !== 'object') throw new Error('stats: contributionData missing');
  if (!Array.isArray(cd.years) || !Array.isArray(cd.contributions)) throw new Error('stats: contributionData malformed');
  return {
    userName: str(raw.userName, 'userName'),
    userBio: typeof raw.userBio === 'string' ? raw.userBio : '',
    userAvatarUrl: str(raw.userAvatarUrl, 'userAvatarUrl'),
    commitsCount: num(raw.commitsCount, 'commitsCount'),
    ownedRepoCount: num(raw.ownedRepoCount, 'ownedRepoCount'),
    contributedReposCount: num(raw.contributedReposCount, 'contributedReposCount'),
    prCount: num(raw.prCount, 'prCount'),
    issuesCount: num(raw.issuesCount, 'issuesCount'),
    followers: num(raw.followers, 'followers'),
    languages: (Array.isArray(raw.languages) ? raw.languages : []).map((l, i) => ({
      name: str(l.name, `languages[${i}].name`),
      percentage: num(l.percentage, `languages[${i}].percentage`),
    })),
    lastUpdated: str(raw.lastUpdated, 'lastUpdated'),
    contributionData: {
      years: cd.years.map((y, i) => ({ year: String(y.year), total: num(y.total, `years[${i}].total`) })),
      // Dates normalized to YYYY-MM-DD and inactive days dropped (GAS marks
      // activity via intensity; count is usually 0): the grid builder
      // synthesizes empty days itself, and this keeps the baked payload small.
      contributions: cd.contributions
        .map((c, i) => ({
          date: str(c.date, `contributions[${i}].date`).slice(0, 10),
          intensity: String(c.intensity ?? '0'),
          count: num(c.count ?? 0, `contributions[${i}].count`),
        }))
        .filter((c) => c.count > 0 || Number(c.intensity) > 0),
    },
  };
}
