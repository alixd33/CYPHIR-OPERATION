/**
 * Pixel-art sprite geometry helpers.
 * Bounds are measured on opaque source pixels so transparent atlas padding
 * does not distort the visible sprite when fitting it to a world-space box.
 */

export function findOpaqueBounds(rgba, width, height, alphaThreshold = 8) {
  if (!rgba || width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return { x: 0, y: 0, width, height };
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = rgba[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function fitSpriteIntoBox(source, target) {
  const validSource = source && source.width > 0 && source.height > 0;
  const validTarget = target && target.width > 0 && target.height > 0;
  if (!validSource || !validTarget) return null;

  const scale = Math.min(target.width / source.width, target.height / source.height);
  const drawWidth = Math.max(1, Math.round(source.width * scale));
  const drawHeight = Math.max(1, Math.round(source.height * scale));

  return {
    sx: source.x,
    sy: source.y,
    sw: source.width,
    sh: source.height,
    dx: Math.round(target.centerX - drawWidth / 2),
    dy: Math.round(target.bottomY - drawHeight),
    dw: drawWidth,
    dh: drawHeight,
    scale,
  };
}
