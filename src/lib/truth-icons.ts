/**
 * Get the icon path for a truth/category
 */
export function getTruthIcon(category: string): string {
  const iconMap: Record<string, string> = {
    Meaning: "/truths/meaning.png",
    Freedom: "/truths/freedom.png",
    Vitality: "/truths/vitality.png",
    Engagement: "/truths/engagement.png",
    Delight: "/truths/delight.png",
  };

  return iconMap[category] || "/truths/meaning.png";
}

/**
 * Get the essentials icon path for a truth/category
 */
export function getEssentialsIcon(category: string): string {
  const iconMap: Record<string, string> = {
    Meaning: "/essentials/meaning-essentials.png",
    Freedom: "/essentials/freedom-essentials.png",
    Vitality: "/essentials/vitality-essentials.png",
    Engagement: "/essentials/engagement-essentials.png",
    Delight: "/essentials/delight-essentials.png",
  };

  return iconMap[category] || "/essentials/meaning-essentials.png";
}



