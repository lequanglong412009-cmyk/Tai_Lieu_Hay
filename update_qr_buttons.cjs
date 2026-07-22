const fs = require('fs');

function updateFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    const qrContainerRegex = /<div className="bg-white p-2\.5 rounded-\[1\.5rem\] shadow-xl mb-5 border border-slate-100 w-44 h-44 relative group">([\s\S]*?)<\/button>\s*<\/div>/g;
    
    content = content.replace(qrContainerRegex, (match, innerContent) => {
        // extract the button
        const buttonRegex = /<button[\s\S]*?onClick=\{async \(e\) => \{[\s\S]*?\}<\/button>/;
        const buttonMatch = match.match(buttonRegex);
        if (!buttonMatch) return match;
        
        let buttonContent = buttonMatch[0];
        
        // replace button class
        buttonContent = buttonContent.replace(/className="absolute inset-0[^"]*"/, 'className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all mt-3 border border-indigo-100/50"');
        buttonContent = buttonContent.replace(/<Download className="w-5 h-5" \/>/g, '<Download className="w-4 h-4" />');
        
        // replace the original button with nothing inside the img container
        const imgOnlyContainer = match.replace(buttonRegex, '').replace(' relative group', '').replace(' h-44', ' h-44 mx-auto').replace(' mb-5', '');
        
        return `<div className="mb-6 w-44">\n                    ${imgOnlyContainer}\n                    ${buttonContent}\n                  </div>`;
    });

    fs.writeFileSync(path, content, 'utf8');
}

updateFile('src/pages/DocumentDetail.tsx');
updateFile('src/pages/CourseDetail.tsx');
