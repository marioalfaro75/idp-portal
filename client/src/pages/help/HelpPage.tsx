import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { helpApi } from '../../api/help';
import { Badge } from '../../components/ui/Badge';
import { Search, ChevronRight, ChevronDown, BookOpen, ArrowLeft } from 'lucide-react';
import type { HelpArticle } from '@idp/shared';
import type { Components } from 'react-markdown';

const markdownComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-50 dark:bg-gray-800/50" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 border-t border-gray-100 dark:border-gray-700/50" {...props}>
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <div className="my-4 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300">
      <span className="mt-0.5 flex-shrink-0 text-blue-500 dark:text-blue-400">&#x1f4a1;</span>
      <div className="[&>p]:m-0">{children}</div>
    </div>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <code className={`${className} text-[13px] leading-relaxed`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[13px] font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-gray-100 dark:border-gray-700 dark:bg-gray-950" {...props}>
      {children}
    </pre>
  ),
  a: ({ children, href, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 hover:text-primary-700 underline decoration-primary-300 underline-offset-2 dark:text-primary-400 dark:hover:text-primary-300 dark:decoration-primary-700" {...props}>
      {children}
    </a>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mt-8 mb-3 text-lg font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-6 mb-2 text-base font-semibold text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </h3>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-3 ml-1 space-y-1.5 list-none" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-3 space-y-2 list-decimal list-outside pl-5 marker:text-gray-400 marker:font-semibold dark:marker:text-gray-500" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }) => (
    <p className="my-2.5 text-sm leading-relaxed text-gray-700 dark:text-gray-200" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>{children}</strong>
  ),
  hr: (props) => (
    <hr className="my-6 border-gray-200 dark:border-gray-700" {...props} />
  ),
};

export function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openArticle, setOpenArticle] = useState<HelpArticle | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['help-articles'],
    queryFn: helpApi.getArticles,
  });

  const categories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category));
    return ['All', ...Array.from(cats).sort()];
  }, [articles]);

  const filtered = useMemo(() => {
    let result = articles;

    if (activeCategory !== 'All') {
      result = result.filter((a) => a.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.content.toLowerCase().includes(q),
      );
    }

    return result;
  }, [articles, activeCategory, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, HelpArticle[]>();
    for (const article of filtered) {
      const existing = map.get(article.category) || [];
      existing.push(article);
      map.set(article.category, existing);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Full article view
  if (openArticle) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setOpenArticle(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Help
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="info">{openArticle.category}</Badge>
              {openArticle.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {openArticle.title}
            </h1>
          </div>
          <div className="px-8 py-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {openArticle.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Article list view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Guides and documentation for the IDP Portal
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
          placeholder="Search help articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No help articles available</p>
          <p className="text-sm">
            Help articles are loaded from the <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">help/</code> directory.
            Make sure the directory contains markdown files with YAML frontmatter.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No articles match your search.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, categoryArticles]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                {categoryArticles.map((article) => {
                  const isExpanded = expandedIds.has(article.id);
                  return (
                    <div key={article.id}>
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleExpanded(article.id)}
                          className="p-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setOpenArticle(article)}
                          className="flex-1 flex items-center gap-3 py-4 pr-4 text-left hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors min-w-0"
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {article.title}
                          </span>
                          <div className="flex gap-1.5 flex-shrink-0 ml-auto">
                            {article.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </div>
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-6 pb-5 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                          <div className="max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {article.content}
                            </ReactMarkdown>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => setOpenArticle(article)}
                              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                            >
                              Open full article &rarr;
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
