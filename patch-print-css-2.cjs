const fs = require('fs');
let content = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const targetStyle = `.rich-content {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }`;

const replacementStyle = `.rich-content {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          /* Make sure actual tables don't break horribly */
          .rich-content table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          .rich-content tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .rich-content td, .rich-content th {
            border: 1px solid #ccc !important;
            padding: 4px !important;
          }
          .rich-content th {
            background-color: #eee !important;
          }
          
          /* Prevent flex from hiding content in print */
          .rich-content div[style*="display: flex"] {
            display: flex !important;
            flex-wrap: wrap !important;
            width: 100% !important;
            page-break-inside: avoid !important; 
          }
          
          /* Force auto height for everything */
          .rich-content * {
            height: auto !important;
            min-height: 0 !important;
          }`;

if (content.includes(targetStyle)) {
  content = content.replace(targetStyle, replacementStyle);
  fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', content);
  console.log('Success CSS patch 2');
} else {
  console.log('Target style not found');
}
