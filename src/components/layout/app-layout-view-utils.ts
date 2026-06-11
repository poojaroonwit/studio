export function getAppLayoutPageTitle(pathname: string | null) {
  const pathSegments = (pathname || '').split('/');
  const lastSegment = pathSegments[pathSegments.length - 1];

  return pathname === '/' || !pathname
    ? 'Dashboard'
    : (lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : 'Page');
}
