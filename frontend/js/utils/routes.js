export function appUrl(path) {
    const appBasePath = window.location.pathname.replace(/\/[^/]*$/, '');
    const relativePath = String(path).replace(/^\/+/, '');
    return `${appBasePath}/${relativePath}`;
}

/**
 * Builds the edit-post page URL for a given post.
 *
 * `from` is the page the user is currently on, so the editor can
 * send them back where they came from. The query string is kept
 * because pages such as `post.html?id=...` and
 * `profile.html?userId=...` are identified by it. The editor
 * validates `from` against an allowlist, so this never becomes
 * an open redirect.
 */
export function editPostUrl(postId, from) {
    const current = `${window.location.pathname.replace(/^\//, '')}${window.location.search || ''}`;

    const params = new URLSearchParams({ id: postId });

    params.set('from', from || current);

    return appUrl(`edit-post.html?${params.toString()}`);
}
