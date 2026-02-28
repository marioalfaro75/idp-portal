import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { logger } from '../../utils/logger';
import type { HelpArticle } from '@idp/shared';

const HELP_DIR = path.resolve(__dirname, '../../../../help');

let cachedArticles: HelpArticle[] | null = null;

function parseArticle(filePath: string, fileName: string): HelpArticle | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(raw);

    return {
      id: fileName.replace(/\.md$/, ''),
      title: frontmatter.title || fileName.replace(/\.md$/, '').replace(/-/g, ' '),
      category: frontmatter.category || 'General',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      order: typeof frontmatter.order === 'number' ? frontmatter.order : 999,
      content: content.trim(),
    };
  } catch (err) {
    logger.warn(`Help: failed to parse ${fileName}`, { error: (err as Error).message });
    return null;
  }
}

function loadArticlesFromDisk(): HelpArticle[] {
  if (!fs.existsSync(HELP_DIR)) {
    logger.warn(`Help: directory not found: ${HELP_DIR}`);
    return [];
  }

  const files = fs.readdirSync(HELP_DIR).filter((f) => f.endsWith('.md'));

  const articles = files
    .map((f) => parseArticle(path.join(HELP_DIR, f), f))
    .filter((a): a is HelpArticle => a !== null);

  return articles.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getHelpArticles(): HelpArticle[] {
  if (cachedArticles) {
    return cachedArticles;
  }

  cachedArticles = loadArticlesFromDisk();
  logger.info(`Help: loaded ${cachedArticles.length} articles from disk`);
  return cachedArticles;
}

export function refreshHelpArticles(): HelpArticle[] {
  cachedArticles = null;
  return getHelpArticles();
}
