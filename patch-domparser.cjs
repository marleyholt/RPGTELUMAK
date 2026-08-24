const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const newFunc = `// Converte textos brancos ou muito claros do editor rico para preto na impressão
const sanitizeHtmlForPrint = (html?: string) => {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Process <font> tags
    const fontTags = doc.querySelectorAll('font[color]');
    fontTags.forEach((el) => {
      const color = el.getAttribute('color');
      if (color) {
        let isLight = false;
        const c = color.toLowerCase().trim();
        if (c === 'white' || c === 'transparent') isLight = true;
        else if (c.startsWith('#')) {
          if (c.length === 4) {
            const r = parseInt(c[1], 16);
            const g = parseInt(c[2], 16);
            const b = parseInt(c[3], 16);
            if (r > 10 && g > 10 && b > 10) isLight = true;
          } else if (c.length === 7) {
            const r = parseInt(c.substring(1, 3), 16);
            const g = parseInt(c.substring(3, 5), 16);
            const b = parseInt(c.substring(5, 7), 16);
            if (r > 170 && g > 170 && b > 170) isLight = true;
          }
        } else if (c.startsWith('rgb')) {
            const match = c.match(/\\d+/g);
            if (match && match.length >= 3) {
              const r = parseInt(match[0], 10);
              const g = parseInt(match[1], 10);
              const b = parseInt(match[2], 10);
              if (r > 170 && g > 170 && b > 170) isLight = true;
            }
        }
        if (isLight) {
          el.setAttribute('color', 'black');
        }
      }
    });

    // Process elements with inline styles
    const styledElements = doc.querySelectorAll('[style]');
    styledElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.color) {
        let isLight = false;
        const c = htmlEl.style.color.toLowerCase().trim();
        if (c === 'white' || c === 'transparent') isLight = true;
        else if (c.startsWith('rgb')) {
            const match = c.match(/\\d+/g);
            if (match && match.length >= 3) {
              const r = parseInt(match[0], 10);
              const g = parseInt(match[1], 10);
              const b = parseInt(match[2], 10);
              if (r > 170 && g > 170 && b > 170) isLight = true;
            }
        } else if (c.startsWith('#')) {
           if (c.length === 4) {
            const r = parseInt(c[1], 16);
            const g = parseInt(c[2], 16);
            const b = parseInt(c[3], 16);
            if (r > 10 && g > 10 && b > 10) isLight = true;
          } else if (c.length === 7) {
            const r = parseInt(c.substring(1, 3), 16);
            const g = parseInt(c.substring(3, 5), 16);
            const b = parseInt(c.substring(5, 7), 16);
            if (r > 170 && g > 170 && b > 170) isLight = true;
          }
        }
        if (isLight) {
          htmlEl.style.color = 'black';
        }
      }
    });

    return doc.body.innerHTML;
  } catch (e) {
    // Fallback if DOMParser fails (should not happen in browser)
    return html.replace(/color:\\s*(?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))/gi, 'color: #000000');
  }
};`;

// replace the old function block. We need to be careful with regex replace over multiline.
// The old function starts with `// Converte textos brancos do editor rico`
// and ends right before `export function PrintableSankoteiSheet`
const startIdx = code.indexOf('// Converte textos brancos');
const endIdx = code.indexOf('export function PrintableSankoteiSheet');

if (startIdx !== -1 && endIdx !== -1) {
  const before = code.substring(0, startIdx);
  const after = code.substring(endIdx);
  code = before + newFunc + '\n\n' + after;
}

// Add !important to color in print CSS for td
code = code.replace(/padding: 4px !important;\s*color: #000000;\s*}/, "padding: 4px !important;\n            color: #000000 !important;\n          }");
code = code.replace(/padding: 4px !important;\s*}/, "padding: 4px !important;\n            color: #000000 !important;\n          }");

fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
console.log('Patched PrintableSankoteiSheet.tsx successfully.');
