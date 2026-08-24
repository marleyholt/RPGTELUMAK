const html = '<font color="#ffffff">Test</font> <span style="color: white">Test2</span> <td color="#fff">';
let sanitized = html;
sanitized = sanitized.replace(/color:\s*(?:#ffffff|#fff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi, 'color: #000000');
sanitized = sanitized.replace(/color=["'](?:#ffffff|#fff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["']/gi, 'color="#000000"');
console.log(sanitized);
