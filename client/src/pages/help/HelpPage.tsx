import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { helpApi } from '../../api/help';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Search, RefreshCw, ChevronRight, ChevronDown, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HelpArticle } from '@idp/shared';

export function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const freshArticles = await helpApi.refresh();
      queryClient.setQueryData(['help-articles'], freshArticles);
      toast.success(`Loaded ${freshArticles.length} articles`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to refresh help articles');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Help</h1>
        <Button variant="secondary" onClick={handleRefresh} loading={refreshing}>
          <RefreshCw className="w-4 h-4 mr-2" /> Check for updates
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
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
                ? 'bg-primary-600 text-white'
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
            Help articles are loaded from the <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">help/</code> directory
            in your GitHub repository. Make sure the GitHub App is configured and the repository contains a <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">help/</code> folder with markdown files.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No articles match your search.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, categoryArticles]) => (
            <Card key={category} title={category}>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 -m-6">
                {categoryArticles.map((article) => {
                  const isExpanded = expandedIds.has(article.id);
                  return (
                    <div key={article.id}>
                      <button
                        onClick={() => toggleExpanded(article.id)}
                        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
                          {article.title}
                        </span>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {article.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {article.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
