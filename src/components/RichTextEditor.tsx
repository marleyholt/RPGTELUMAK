import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Columns, Palette } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const COLORS = [
  '#FFFFFF', // Branco
  '#EF4444', // Vermelho (Dano/Ataque)
  '#22C55E', // Verde (Cura/Veneno)
  '#3B82F6', // Azul (Magia/Frio)
  '#EAB308', // Amarelo (Luz/Ouro)
  '#A855F7', // Roxo (Arcano/Sombrio)
  '#F97316', // Laranja (Fogo)
  '#06B6D4', // Ciano (Raio/Gelo)
  '#EC4899', // Rosa (Ilusão/Carisma)
  '#9CA3AF', // Cinza (Neutro/Pedra)
];

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Somente atualiza se estiver vazio ou inicializando, 
  // para nao perder o cursor durante a digitação
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !editorRef.current.contains(document.activeElement)) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertColumns = () => {
    // Adicionamos divs internas e mudamos para overflow: auto. 
    const html = `<div style="display: flex; gap: 1rem; margin: 0.5rem 0; width: 100%; align-items: stretch; word-break: break-word;">
      <div style="width: 50%; min-width: 15%; max-width: 85%; resize: horizontal; overflow: auto; padding: 0.5rem; border: 1px dashed #666; min-height: 2rem;">
        <div>Coluna 1 (Arraste o canto para redimensionar)</div>
      </div>
      <div style="flex: 1; padding: 0.5rem; border: 1px dashed #666; min-height: 2rem; overflow: auto;">
        <div>Coluna 2</div>
      </div>
    </div><br/>`;
    exec('insertHTML', html);
  };

  const handleFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    exec('fontSize', e.target.value);
    e.target.value = ""; // reset dropdown
  };

  const handleCommand = (e: React.MouseEvent, command: string, val?: string) => {
    e.preventDefault();
    exec(command, val);
  };

  return (
    <div className="w-full border border-white/20 rounded-md overflow-hidden bg-black/40 flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-white/5 border-b border-white/20">
        <select 
          onChange={handleFontSize} 
          className="bg-black/50 border border-white/20 text-white/90 text-xs rounded p-1 outline-none mr-1 cursor-pointer"
          title="Tamanho da Fonte"
          defaultValue=""
        >
          <option value="" disabled>Tamanho</option>
          <option value="1">Mínimo</option>
          <option value="2">Pequeno</option>
          <option value="3">Normal</option>
          <option value="4">Médio</option>
          <option value="5">Grande</option>
          <option value="6">Gigante</option>
        </select>
        
        <div className="w-px h-4 bg-white/20 mx-1" />

        <button type="button" onMouseDown={(e) => handleCommand(e, 'bold')} className="p-1.5 hover:bg-white/10 rounded" title="Negrito">
          <Bold size={16} />
        </button>
        <button type="button" onMouseDown={(e) => handleCommand(e, 'italic')} className="p-1.5 hover:bg-white/10 rounded" title="Itálico">
          <Italic size={16} />
        </button>
        <button type="button" onMouseDown={(e) => handleCommand(e, 'underline')} className="p-1.5 hover:bg-white/10 rounded" title="Sublinhado">
          <Underline size={16} />
        </button>
        
        <div className="w-px h-4 bg-white/20 mx-1" />
        
        <button type="button" onMouseDown={(e) => handleCommand(e, 'insertUnorderedList')} className="p-1.5 hover:bg-white/10 rounded" title="Lista">
          <List size={16} />
        </button>
        <button type="button" onMouseDown={(e) => handleCommand(e, 'insertOrderedList')} className="p-1.5 hover:bg-white/10 rounded" title="Lista Numerada">
          <ListOrdered size={16} />
        </button>
        
        <div className="w-px h-4 bg-white/20 mx-1" />

        {/* Color Palette */}
        <div className="flex items-center gap-1 mx-1 px-2 py-1 bg-black/30 rounded border border-white/10">
          <Palette size={14} className="text-white/50 mr-1" />
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onMouseDown={(e) => handleCommand(e, 'foreColor', color)}
              className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
              style={{ backgroundColor: color }}
              title="Mudar Cor"
            />
          ))}
        </div>

        <div className="w-px h-4 bg-white/20 mx-1" />
        
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertColumns(); }} className="p-1.5 hover:bg-white/10 rounded flex items-center gap-1" title="Inserir Colunas Lado a Lado">
          <Columns size={16} /> <span className="text-xs font-bold">Colunas</span>
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="p-3 min-h-[150px] outline-none text-sm text-white/90 overflow-y-auto rich-text-content"
        style={{ minHeight: '150px' }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
