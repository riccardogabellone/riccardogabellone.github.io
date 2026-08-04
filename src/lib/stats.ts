import raw from '../data/github-stats.json';

export interface LanguageStat {
  name: string;
  percentage: number;
}
export interface YearTotal {
  year: string;
  total: number;
}
export interface DayContribution {
  date: string;
  intensity: string;
  count: number;
}
export interface BakedStats {
  userName: string;
  userBio: string;
  userAvatarUrl: string;
  commitsCount: number;
  ownedRepoCount: number;
  contributedReposCount: number;
  prCount: number;
  issuesCount: number;
  followers: number;
  languages: LanguageStat[];
  lastUpdated: string;
  fetchedAt: string;
  contributionData: { years: YearTotal[]; contributions: DayContribution[] };
}

export function getStats(): BakedStats {
  return raw as BakedStats;
}
