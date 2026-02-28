export interface HelpArticle {
  id: string;        // filename without .md extension
  title: string;
  category: string;
  tags: string[];
  order: number;
  content: string;   // raw markdown body
}
