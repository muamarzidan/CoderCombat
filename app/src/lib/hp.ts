/**
 * Warna bar HP berdasarkan sisa HP (persen) - satu sumber ambang warna yang
 * dipakai bersama oleh arena duel (BattleFighter) dan halaman hasil (Hasil):
 *
 *   > 70  → hijau  (sehat)
 *   30-70 → kuning (waspada)
 *   < 30  → merah  (kritis)
 */
export function hpBarColor(hp: number): string {
  if (hp > 70) return 'bg-primary'
  if (hp >= 30) return 'bg-accent'
  return 'bg-danger'
}
