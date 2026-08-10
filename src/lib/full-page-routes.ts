export function isPolicyDocumentEditorPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && /^\/policy-documents\/[^/]+\/?$/i.test(pathname));
}

export function isFullPageWorkspacePath(pathname: string | null | undefined): boolean {
  return isPolicyDocumentEditorPath(pathname);
}
