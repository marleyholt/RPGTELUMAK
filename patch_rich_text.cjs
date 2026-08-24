const fs = require('fs');

let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

const oldInsert = `  const insertColumns = () => {
    // Adicionamos divs internas e mudamos para overflow: auto. 
    const html = \`<div style="display: flex; gap: 1rem; margin: 0.5rem 0; width: 100%; align-items: stretch; word-break: break-word;">
      <div style="width: 50%; min-width: 15%; max-width: 85%; resize: horizontal; overflow: auto; padding: 0.5rem; border: 1px dashed #666; min-height: 2rem;">
        <div>Coluna 1 (Arraste o canto para redimensionar)</div>
      </div>
      <div style="flex: 1; padding: 0.5rem; border: 1px dashed #666; min-height: 2rem; overflow: auto;">
        <div>Coluna 2</div>
      </div>
    </div><br/>\`;
    exec('insertHTML', html);
  };`;

const newInsert = `  const insertColumns = () => {
    const html = \`<table style="width: 100%; border-collapse: collapse; margin: 0.5rem 0; table-layout: fixed;" class="editor-layout-table">
      <tbody>
        <tr>
          <td style="width: 50%; padding: 0.5rem; border: 1px dashed rgba(255,255,255,0.3) !important; vertical-align: top;">
            <div>Coluna 1</div>
          </td>
          <td style="width: 50%; padding: 0.5rem; border: 1px dashed rgba(255,255,255,0.3) !important; vertical-align: top;">
            <div>Coluna 2</div>
          </td>
        </tr>
      </tbody>
    </table><p><br/></p>\`;
    exec('insertHTML', html);
  };`;

if (code.includes('display: flex')) {
    code = code.replace(oldInsert, newInsert);
    fs.writeFileSync('src/components/RichTextEditor.tsx', code);
    console.log('Patched RichTextEditor.tsx');
} else {
    console.log('Could not find target in RichTextEditor.tsx');
}

let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.rich-content li')) {
    css = css.replace(
        '.rich-text-content ul, .rich-content ul {', 
        '.rich-text-content li, .rich-content li {\n  display: list-item;\n  margin-left: 0.5rem;\n}\n.rich-text-content ul, .rich-content ul {'
    );
    css = css.replace(
        'list-style-type: disc;',
        'list-style-type: disc;\n  list-style-position: inside;'
    );
    css = css.replace(
        'list-style-type: decimal;',
        'list-style-type: decimal;\n  list-style-position: inside;'
    );
    fs.writeFileSync('src/index.css', css);
    console.log('Patched index.css');
} else {
    console.log('index.css already patched');
}
