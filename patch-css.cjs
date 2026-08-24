const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/\.rich-text-content, \.rich-content ul/g, '.rich-text-content ul, .rich-content ul');
css = css.replace(/\.rich-text-content, \.rich-content ol/g, '.rich-text-content ol, .rich-content ol');
css = css.replace(/\.rich-text-content, \.rich-content strong, \.rich-text-content, \.rich-content b/g, '.rich-text-content strong, .rich-content strong, .rich-text-content b, .rich-content b');
css = css.replace(/\.rich-text-content, \.rich-content em, \.rich-text-content, \.rich-content i/g, '.rich-text-content em, .rich-content em, .rich-text-content i, .rich-content i');
css = css.replace(/\.rich-text-content, \.rich-content u/g, '.rich-text-content u, .rich-content u');
css = css.replace(/\.rich-text-content, \.rich-content h1, \.rich-text-content, \.rich-content h2, \.rich-text-content, \.rich-content h3/g, '.rich-text-content h1, .rich-content h1, .rich-text-content h2, .rich-content h2, .rich-text-content h3, .rich-content h3');

fs.writeFileSync('src/index.css', css);
console.log('Fixed CSS');
