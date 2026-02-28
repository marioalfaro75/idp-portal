import matter from 'gray-matter';
import { getAppOctokit, isAppConfigured } from '../github/github-app';
import * as settingsService from '../settings/settings.service';
import { logger } from '../../utils/logger';
import type { HelpArticle } from '@idp/shared';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedArticles: HelpArticle[] | null = null;
let cacheTimestamp = 0;

async function getRepoConfig(): Promise<{ owner: string; repo: string; branch: string; path: string } | null> {
  const defaultRepo = await settingsService.get('github.defaultRepo');
  const helpRepo = await settingsService.get('help.repo');
  const helpBranch = await settingsService.get('help.branch');

  const repoFullName = helpRepo || defaultRepo;
  if (!repoFullName) return null;

  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) return null;

  return {
    owner,
    repo,
    branch: helpBranch || 'main',
    path: 'help',
  };
}

async function fetchArticlesFromGitHub(): Promise<HelpArticle[]> {
  const config = await getRepoConfig();
  if (!config) {
    logger.warn('Help: no repo configured (set github.defaultRepo or help.repo in settings)');
    return [];
  }

  const octokit = await getAppOctokit();

  // List files in the help/ directory
  let dirContents: any[];
  try {
    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: config.path,
      ref: config.branch,
    });

    if (!Array.isArray(data)) {
      logger.warn('Help: expected directory listing but got a single file');
      return [];
    }

    dirContents = data.filter((f: any) => f.name.endsWith('.md'));
  } catch (err: any) {
    if (err.status === 404) {
      logger.info('Help: no help/ directory found in repo');
      return [];
    }
    throw err;
  }

  // Fetch each .md file's content in parallel
  const articles = await Promise.all(
    dirContents.map(async (file: any): Promise<HelpArticle | null> => {
      try {
        const { data } = await octokit.repos.getContent({
          owner: config.owner,
          repo: config.repo,
          path: file.path,
          ref: config.branch,
          mediaType: { format: 'raw' },
        });

        const raw = typeof data === 'string' ? data : Buffer.from(data as any).toString('utf-8');
        const { data: frontmatter, content } = matter(raw);

        return {
          id: file.name.replace(/\.md$/, ''),
          title: frontmatter.title || file.name.replace(/\.md$/, '').replace(/-/g, ' '),
          category: frontmatter.category || 'General',
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          order: typeof frontmatter.order === 'number' ? frontmatter.order : 999,
          content: content.trim(),
        };
      } catch (err) {
        logger.warn(`Help: failed to fetch ${file.path}`, { error: (err as Error).message });
        return null;
      }
    }),
  );

  return articles
    .filter((a): a is HelpArticle => a !== null)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export async function getHelpArticles(): Promise<HelpArticle[]> {
  if (cachedArticles && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedArticles;
  }

  const configured = await isAppConfigured();
  if (!configured) {
    return [];
  }

  try {
    const articles = await fetchArticlesFromGitHub();
    cachedArticles = articles;
    cacheTimestamp = Date.now();
    return articles;
  } catch (err) {
    logger.error('Help: failed to fetch articles', { error: (err as Error).message });
    // Return stale cache if available, otherwise empty
    return cachedArticles || [];
  }
}

export async function refreshHelpArticles(): Promise<HelpArticle[]> {
  cachedArticles = null;
  cacheTimestamp = 0;
  return getHelpArticles();
}
