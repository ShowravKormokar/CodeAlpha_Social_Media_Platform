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
      const tier = FOLLOWER_TIERS[i];
      return {
        key: tier.key,
        label: tier.label,
        minFollowers: tier.minFollowers,
        icon: tier.icon,
      };
    }
  }
  return {
    key: 'new_member',
    label: 'New Member',
    minFollowers: 0,
    icon: 'ri-user-line',
  };
}