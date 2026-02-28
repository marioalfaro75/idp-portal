import { getBuildInfo } from '../../utils/build-info';
import type { UpdateCheckResult } from '@idp/shared';

const REPO_OWNER = 'marioalfaro75';
const REPO_NAME = 'idp-portal';
const BRANCH = 'main';

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const buildInfo = getBuildInfo();
  const repoUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

  // Fetch latest commit on main
  const commitRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${BRANCH}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'idp-portal-update-checker',
      },
    }
  );

  if (!commitRes.ok) {
    throw new Error(`GitHub API returned ${commitRes.status}: ${commitRes.statusText}`);
  }

  const commitData = await commitRes.json();
  const latestFullHash: string = commitData.sha;
  const latestShortHash = latestFullHash.substring(0, 7);
  const latestMessage: string = commitData.commit?.message?.split('\n')[0] || '';
  const latestDate: string = commitData.commit?.committer?.date || commitData.commit?.author?.date || '';

  // Determine if update is available
  const currentFull = buildInfo.fullCommitHash;
  const updateAvailable =
    currentFull !== 'unknown' && latestFullHash !== currentFull;

  // If we have a known current commit and an update is available, get commits-behind count
  let commitsBehind = 0;
  if (updateAvailable && currentFull !== 'unknown') {
    try {
      const compareRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/compare/${currentFull.substring(0, 7)}...${BRANCH}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'idp-portal-update-checker',
          },
        }
      );
      if (compareRes.ok) {
        const compareData = await compareRes.json();
        commitsBehind = compareData.ahead_by ?? 0;
      }
    } catch {
      // Non-critical — leave at 0
    }
  }

  return {
    currentVersion: `${buildInfo.version}-${buildInfo.commitHash}`,
    currentCommitHash: buildInfo.commitHash,
    latestCommitHash: latestShortHash,
    latestCommitMessage: latestMessage,
    latestCommitDate: latestDate,
    commitsBehind,
    updateAvailable,
    repoUrl,
  };
}
