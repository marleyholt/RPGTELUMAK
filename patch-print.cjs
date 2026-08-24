const fs = require('fs');
let content = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const targetStyle = `.sankotei-header-ribbon {
            background-color: #000000 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
          }`;

const replacementStyle = `.sankotei-header-ribbon {
            background-color: #000000 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* FIX FOR RICH TEXT EDITOR COLUMNS IN PDF */
          .rich-content div[style*="display: flex"] {
            display: flex !important;
            flex-wrap: wrap !important; /* Allow wrapping if too tight */
            overflow: visible !important;
          }
          .rich-content div[style*="overflow: auto"] {
            overflow: visible !important;
            resize: none !important;
          }
          /* Ensure text wraps nicely and doesn't get cut off */
          .rich-content {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          /* Fix font size scaling issues */
          .rich-content font {
            line-height: 1.3 !important;
          }`;

if (content.includes(targetStyle)) {
  content = content.replace(targetStyle, replacementStyle);
  fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', content);
  console.log('Success CSS patch 1');
} else {
  console.log('Target style not found');
}
