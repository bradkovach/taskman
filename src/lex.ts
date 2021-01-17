//import Tokenizr from "tokenizr";

import Tokenizr from 'tokenizr';

export const lexer = new Tokenizr();

// a line with ||128:barcodeHere||
// lexer.rule(/\|\|128:([0-9a-zA-Z]+)\|\|/, (ctx,match) => {
//     ctx.accept('code128', match[1]);
// });

// // code39
// lexer.rule(/\|\|39:([0-9a-zA-Z]+)\|\|/, (ctx,match) => {
//     ctx.accept('code39', match[1]);
// });

// A line with a link on it
lexer.rule(/\[(.+)\]\((.+)\)/, (ctx,matches) => {
    ctx.accept('link', [matches[1], matches[2]]);
})

// a line with ||qr:barcodeHere||
lexer.rule(/\|\|qr:([^\|]+)\|\|/, (ctx,match) => {
    ctx.accept('qr', match[1]);
});

// bold
lexer.rule(/\*\*(.+)\*\*/g, (ctx,match)=> {
    ctx.accept('bold', match[1]);
});

// underline
lexer.rule(/\_\_([^\_]+)\_\_/g, (ctx,match)=>{
    ctx.accept('underline', match[1]);
});

lexer.rule(/(\n|\r\n)/, (ctx,match) => {
    ctx.accept('newline');
});

// markdown-style headings
lexer.rule(/^\#+(.+)/, (ctx, match) => {
    ctx.accept('title', match[1].trim());
});



// horizontal rule
lexer.rule(/^\-+$/, (ctx, match) => {
    ctx.accept('hr');
});

// centered
lexer.rule(/\:(\-+)(.+)(\1)\:/, (ctx, matches) => {
    ctx.accept('center', matches[2].trim());
});

// any whitespace
lexer.rule(/(\s+)/, (ctx, match) => {
    ctx.accept('ws', match[1]);
});

// any words
lexer.rule(/(\w+)/, (ctx, match) => {
    ctx.accept('word', match[1]);
});