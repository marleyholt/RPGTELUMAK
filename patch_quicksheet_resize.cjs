const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const importTarget = `import Markdown from 'react-markdown';`;
const newImportTarget = `// Removed Markdown import`;
code = code.replace(importTarget, newImportTarget);

const stateTarget = `  const [activeTab, setActiveTab] = useState(defaultSections[0]);`;
const newStateTarget = `  const [activeTab, setActiveTab] = useState(defaultSections[0]);
  
  // Dragging logic
  const [pos, setPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 340 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPos({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };`;
code = code.replace(stateTarget, newStateTarget);

const containerTarget = `    <div className="fixed right-4 bottom-20 w-80 max-w-[calc(100vw-2rem)] bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e1f22] border-b border-white/5 cursor-move">`;

const newContainerTarget = `    <div 
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden animate-fade-in"
      style={{
        left: pos.x,
        top: pos.y,
        width: '320px',
        height: '340px',
        minWidth: '280px',
        minHeight: '200px',
        resize: 'both'
      }}
    >
      <div 
        className="flex items-center justify-between px-3 py-2 bg-[#1e1f22] border-b border-white/5 cursor-move select-none shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >`;
code = code.replace(containerTarget, newContainerTarget);

const htmlTarget1 = `<Markdown>{character.html_ataques || '*Nenhum ataque cadastrado.*'}</Markdown>`;
const newHtmlTarget1 = `{!character.html_ataques ? <p className="text-white/40 italic">Nenhum ataque cadastrado.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_ataques }} />}`;
code = code.replace(htmlTarget1, newHtmlTarget1);

const htmlTarget2 = `<Markdown>{character.html_defesa || '*Nenhuma defesa cadastrada.*'}</Markdown>`;
const newHtmlTarget2 = `{!character.html_defesa ? <p className="text-white/40 italic">Nenhuma defesa cadastrada.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_defesa }} />}`;
code = code.replace(htmlTarget2, newHtmlTarget2);

const htmlTarget3 = `<Markdown>{character.html_dons || '*Nenhum dom cadastrado.*'}</Markdown>`;
const newHtmlTarget3 = `{!character.html_dons ? <p className="text-white/40 italic">Nenhum dom cadastrado.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_dons }} />}`;
code = code.replace(htmlTarget3, newHtmlTarget3);

const htmlTarget4 = `<Markdown>{character.html_equipamentos || '*Nenhum equipamento cadastrado.*'}</Markdown>`;
const newHtmlTarget4 = `{!character.html_equipamentos ? <p className="text-white/40 italic">Nenhum equipamento cadastrado.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_equipamentos }} />}`;
code = code.replace(htmlTarget4, newHtmlTarget4);

const contentDivTarget = `      <div className="p-3 h-64 overflow-y-auto custom-scroll">
        {renderSection(activeTab)}
      </div>`;
const newContentDivTarget = `      <div className="p-3 flex-1 overflow-y-auto custom-scroll min-h-0">
        {renderSection(activeTab)}
      </div>`;
code = code.replace(contentDivTarget, newContentDivTarget);

fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('Patched QuickSheet resize/drag and HTML');
