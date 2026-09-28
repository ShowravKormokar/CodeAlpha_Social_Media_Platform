export function appUrl(path) {
    const appBasePath = window.location.pathname.replace(/\/[^/]*$/, '');
    const relativePath = String(path).replace(/^\/+/, '');
    return `${appBasePath}/${relativePath}`;
}