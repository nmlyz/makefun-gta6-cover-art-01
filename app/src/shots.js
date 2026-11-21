// Screenshot scenes for ?shot=… . Deterministic: fixed presets only,
// no randomness, no clock. The app reads these before first paint so a
// headless render always shows the same cover and editor.
export function readShotParams() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot') || '';
  if (!shot) return null;
  const photo = q.get('photo') || 'woman-car';
  const order = ['woman-car', 'man-rooftop', 'friends-neon'];
  const first = order.indexOf(photo);
  const rotated = first < 0 ? order : order.slice(first).concat(order.slice(0, first));
  return {
    shot,
    cover: shot === 'cover' || shot === 'cover2',
    preset: {
      layout: q.get('layout') || (shot === 'editor2' ? 'nine' : 'hero3'),
      grade: q.get('grade') || (shot === 'editor2' ? 'vicePink' : 'sunset'),
      title: q.get('caption') || 'VICE CITY',
      subtitle: q.get('sub') || (shot === 'editor2' ? 'Nine Lives in Neon' : 'Neon Nights'),
      badge: q.get('badge') || 'VICE HEAT',
      heat: Number(q.get('heat') || 4),
      sizeId: q.get('size') || (shot === 'cover2' ? 'portrait' : 'wide'),
    },
    photoOrder: rotated,
  };
}
