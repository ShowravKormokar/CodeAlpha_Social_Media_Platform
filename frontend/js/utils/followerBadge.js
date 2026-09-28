export const FOLLOWER_TIERS = [
  { key: 'new_member', label: 'New Member', minFollowers: 0, icon: 'ri-user-line' },
  { key: 'copper', label: 'Copper', minFollowers: 500, icon: 'ri-medal-line' },
  { key: 'silver', label: 'Silver', minFollowers: 1000, icon: 'ri-medal-2-line' },
  { key: 'gold', label: 'Gold', minFollowers: 1600, icon: 'ri-medal-fill' },
  { key: 'platinum', label: 'Platinum', minFollowers: 2500, icon: 'ri-trophy-line' },
  { key: 'titanium', label: 'Titanium', minFollowers: 5000, icon: 'ri-award-line' },
];

export function getFollowerBadge(followersCount) {
  const count = followersCount || 0;
  for (let i = FOLLOWER_TIERS.length - 1; i >= 0; i--) {
    if (count >= FOLLOWER_TIERS[i].minFollowers) {
      return FOLLOWER_TIERS[i];
    }
  }
  return FOLLOWER_TIERS[0];
}

export function renderFollowerBadge(followersCount, size = 'sm') {
  const tier = getFollowerBadge(followersCount);
  const sizeClass = size === 'lg' ? 'badge-lg' : size === 'md' ? 'badge-md' : 'badge-sm';
  
  return `
    <span class="profile-tier-badge profile-tier-${tier.key} ${sizeClass}" 
          title="${tier.label} — ${tier.minFollowers.toLocaleString()}+ followers"
          aria-label="${tier.label} follower badge">
      <i class="${tier.icon}"></i>
    </span>
  `;
}

export function renderProfileIdentity(user, size = 'sm') {
  const profile = user.profile || {};
  const displayName = profile.displayName || user.username;
  const badge = user.followerBadge || getFollowerBadge(user.stats?.followers || 0);
  const sizeClass = size === 'lg' ? 'badge-lg' : size === 'md' ? 'badge-md' : 'badge-sm';
  
  return `
    <div class="profile-identity">
      <span class="profile-name">${escapeHtml(displayName)}</span>
      <span class="profile-tier-badge profile-tier-${badge.key} ${sizeClass}"
            title="${badge.label} — ${badge.minFollowers.toLocaleString()}+ followers"
            aria-label="${badge.label} follower badge">
        <i class="${badge.icon}"></i>
      </span>
    </div>
    <div class="profile-username">@${escapeHtml(user.username)}</div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}