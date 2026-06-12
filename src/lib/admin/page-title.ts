/** Consistent admin document titles (`Label - Dashboard`). */
export function adminPageTitle(label: string): string {
  const trimmed = label.trim();
  return trimmed ? `${trimmed} - Dashboard` : 'Dashboard';
}
