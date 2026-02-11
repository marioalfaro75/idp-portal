import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import type { TemplateVariable, TemplateOutput, TemplateMetadata } from '@idp/shared';

const TEMPLATES_DIR = path.resolve(__dirname, '../../../../templates');

interface ParsedTemplate {
  slug: string;
  metadata: TemplateMetadata;
  variables: TemplateVariable[];
  outputs: TemplateOutput[];
  templatePath: string;
}

export function scanTemplates(): ParsedTemplate[] {
  const templates: ParsedTemplate[] = [];

  if (!fs.existsSync(TEMPLATES_DIR)) {
    logger.warn(`Templates directory not found: ${TEMPLATES_DIR}`);
    return templates;
  }

  const providers = fs.readdirSync(TEMPLATES_DIR).filter((d) =>
    fs.statSync(path.join(TEMPLATES_DIR, d)).isDirectory(),
  );

  for (const provider of providers) {
    const providerDir = path.join(TEMPLATES_DIR, provider);
    const templateDirs = fs.readdirSync(providerDir).filter((d) =>
      fs.statSync(path.join(providerDir, d)).isDirectory(),
    );

    for (const dir of templateDirs) {
      try {
        const templateDir = path.join(providerDir, dir);
        const metadataPath = path.join(templateDir, 'metadata.json');

        if (!fs.existsSync(metadataPath)) {
          logger.warn(`No metadata.json in ${templateDir}`);
          continue;
        }

        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as TemplateMetadata;
        const variables = parseVariables(templateDir);
        const outputs = parseOutputs(templateDir);
        const slug = dir;

        templates.push({
          slug,
          metadata,
          variables,
          outputs,
          templatePath: path.relative(process.cwd(), templateDir),
        });
      } catch (err) {
        logger.error(`Failed to parse template ${provider}/${dir}`, { error: (err as Error).message });
      }
    }
  }

  logger.info(`Scanned ${templates.length} templates`);
  return templates;
}

function parseVariables(templateDir: string): TemplateVariable[] {
  const variablesPath = path.join(templateDir, 'variables.tf');
  if (!fs.existsSync(variablesPath)) return [];

  const content = fs.readFileSync(variablesPath, 'utf-8');
  const variables: TemplateVariable[] = [];

  const varRegex = /variable\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;

  while ((match = varRegex.exec(content)) !== null) {
    const name = match[1];
    const block = match[2];

    const type = extractField(block, 'type') || 'string';
    const description = extractField(block, 'description') || '';
    const defaultValue = extractField(block, 'default');
    const validation = extractField(block, 'validation');

    variables.push({
      name,
      type,
      description,
      default: defaultValue,
      required: defaultValue === undefined || defaultValue === null,
      validation: validation || undefined,
    });
  }

  return variables;
}

function parseOutputs(templateDir: string): TemplateOutput[] {
  const outputsPath = path.join(templateDir, 'outputs.tf');
  if (!fs.existsSync(outputsPath)) return [];

  const content = fs.readFileSync(outputsPath, 'utf-8');
  const outputs: TemplateOutput[] = [];

  const outRegex = /output\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;

  while ((match = outRegex.exec(content)) !== null) {
    const name = match[1];
    const block = match[2];
    const description = extractField(block, 'description') || '';
    outputs.push({ name, description });
  }

  return outputs;
}

function extractField(block: string, field: string): string | undefined {
  const regex = new RegExp(`${field}\\s*=\\s*"([^"]*)"`, 'm');
  const match = block.match(regex);
  if (match) return match[1];

  // Try unquoted value
  const regex2 = new RegExp(`${field}\\s*=\\s*([^\\s\\n]+)`, 'm');
  const match2 = block.match(regex2);
  if (match2) return match2[1];

  return undefined;
}
