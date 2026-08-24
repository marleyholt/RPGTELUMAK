const sanitizeHtmlForPrint = (html) => {
  if (!html) return '';
  let sanitized = html;

  const colorRegex = /(color\s*[:=]\s*["']?)([^"';]+)(["';]?)/gi;

  sanitized = sanitized.replace(colorRegex, (match, prefix, colorVal, suffix) => {
    let color = colorVal.trim().toLowerCase();
    
    // Light colors to replace with black
    const lightColors = ['white', 'transparent', 'inherit', 'initial'];
    
    if (lightColors.includes(color)) {
      return `${prefix}#000000${suffix}`;
    }

    if (color.startsWith('#')) {
      // Check if it's a light hex color
      // e.g. #fff, #ffffff, #e2e2e2
      if (color.length === 4) {
        const r = parseInt(color[1], 16);
        const g = parseInt(color[2], 16);
        const b = parseInt(color[3], 16);
        if (r > 10 && g > 10 && b > 10) return `${prefix}#000000${suffix}`;
      } else if (color.length === 7) {
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        if (r > 170 && g > 170 && b > 170) return `${prefix}#000000${suffix}`;
      }
    }
    
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0], 10);
        const g = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        if (r > 170 && g > 170 && b > 170) return `${prefix}#000000${suffix}`;
      }
    }
    
    return match;
  });

  return sanitized;
};

console.log(sanitizeHtmlForPrint('color="white" color: #fff; color: #E2E2E2; color="#FFFFFF" color: rgb(255, 255, 255) color: red;'));
