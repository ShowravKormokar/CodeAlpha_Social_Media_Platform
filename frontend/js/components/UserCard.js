import { createElement } from '../utils/dom.js';
import { getInitials } from '../utils/format.js';
import { appUrl } from '../utils/routes.js';
import { resolveMediaSource } from '../utils/media.js';

export function UserCard({ user, currentUser, onFollow, onUnfollow, isFollowing }) {
  const card = createElement('div', { class: 'card user-card' });
  const isSelf = currentUser && user.id === currentUser.id;

  const avatarSrc = resolveMediaSource(
    user.avatarMediaId || user.avatar_media_id,
    user.avatar_url || user.avatarUrl
  );

  card.innerHTML = `
    <div class="card-body" style="display: flex; align-items: center; gap: var(--spacing-md);">
      <a href="${appUrl(`profile.html?userId=${user.id}`)}" class="avatar avatar-lg" style="flex-shrink: 0;">
        ${avatarSrc ? `<img src="${avatarSrc}" alt="">` : getInitials(user.name || user.username)}
      </a>
      <div style="flex: 1; min-width: 0;">
        <a href="${appUrl(`profile.html?userId=${user.id}`)}" style="text-decoration: none; color: inherit;">
          <div style="font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
            ${user.name || user.username}
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
            @${user.username}
          </div>
        </a>
        ${user.bio ? `<div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--spacing-xs);">${user.bio}</div>` : ''}
      </div>
      <div style="display: flex; gap: var(--spacing-sm);">
        ${!isSelf ? `
          ${isFollowing ? `
            <button class="btn btn-secondary follow-btn" data-user-id="${user.id}" data-action="unfollow">Following</button>
          ` : `
            <button class="btn btn-primary follow-btn" data-user-id="${user.id}" data-action="follow">Follow</button>
          `}
        ` : `
          <span class="badge badge-secondary">You</span>
        `}
      </div>
    </div>
  `;

  const followBtn = card.querySelector('.follow-btn');
  followBtn?.addEventListener('click', () => {
    const action = followBtn.dataset.action;
    if (action === 'follow') {
      onFollow?.(user.id);
    } else {
      onUnfollow?.(user.id);
    }
  });

  return card;
}