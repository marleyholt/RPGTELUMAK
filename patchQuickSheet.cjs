const fs = require('fs');
let code = fs.readFileSync('src/components/NpcQuickSheet.tsx', 'utf-8');

// Add ExternalLink import
code = code.replace(
  "import { X, Minus, Maximize2, Image as ImageIcon, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';",
  "import { X, Minus, Maximize2, Image as ImageIcon, FileText, Download, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';"
);

// Add onOpenFull to props
code = code.replace(
  '  onClose: () => void;',
  '  onClose: () => void;\\n  onOpenFull?: () => void;'
);

// Destructure onOpenFull
code = code.replace(
  'export function NpcQuickSheet({ npc, onClose, initialPos, startMinimized = true }: NpcQuickSheetProps) {',
  'export function NpcQuickSheet({ npc, onClose, onOpenFull, initialPos, startMinimized = true }: NpcQuickSheetProps) {'
);

// Add the button
code = code.replace(
  '          <button onClick={toggleMinimize}',
  `          {onOpenFull && (
            <button onClick={onOpenFull} className="p-1 text-white/50 hover:text-white transition" title="Abrir Ficha do NPC Completa">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={toggleMinimize}`
);

// Also add user-select styles so GM can select text
// Change QuickSheetPanel.tsx and NpcQuickSheet.tsx body to have select-text
fs.writeFileSync('src/components/NpcQuickSheet.tsx', code);
