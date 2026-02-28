export interface UpdateCheckResult {
  currentVersion: string;
  currentCommitHash: string;
  latestCommitHash: string;
  latestCommitMessage: string;
  latestCommitDate: string;
  commitsBehind: number;
  updateAvailable: boolean;
  repoUrl: string;
}
