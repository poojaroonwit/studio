import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const scanRoots = [
  resolve(root, 'src/app'),
  resolve(root, 'src/components'),
  resolve(root, 'src/features'),
];

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && path.endsWith('.tsx') ? [path] : [];
  });
}

function findRawInternalAnchors(file: string) {
  const sourceText = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(sourceFile) === 'a') {
        const href = node.attributes.properties.find(
          property => ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'href',
        );

        if (
          href &&
          ts.isJsxAttribute(href) &&
          href.initializer &&
          ts.isStringLiteral(href.initializer) &&
          href.initializer.text.startsWith('/') &&
          !href.initializer.text.startsWith('//')
        ) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          violations.push(
            `${relative(root, file).replaceAll('\\', '/')}:${line + 1} -> ${href.initializer.text}`,
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

describe('internal navigation architecture', () => {
  it('uses Next.js client navigation for literal in-app destinations', () => {
    const violations = scanRoots.flatMap(collectTsxFiles).flatMap(findRawInternalAnchors);

    expect(
      violations,
      `Use next/link for in-app destinations instead of raw anchors:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
