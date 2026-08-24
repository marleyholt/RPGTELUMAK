const fs = require('fs');
let content = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const targetStyle = `.rich-content div[style*="overflow: auto"] {
            overflow: visible !important;
            resize: none !important;
          }`;

const replacementStyle = `.rich-content div[style*="overflow: auto"] {
            overflow: visible !important;
            resize: none !important;
            border: none !important; /* Remove the dashed borders for clean PDF */
            padding: 0 !important; /* Remove padding to maximize space */
          }
          /* We add a small gap in flex to replace padding */
          .rich-content div[style*="display: flex"] {
            gap: 1.5rem !important; 
          }`;

if (content.includes(targetStyle)) {
  content = content.replace(targetStyle, replacementStyle);
  fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', content);
  console.log('Success CSS patch borders');
} else {
  console.log('Target style not found');
}
