/* ========================================
   ALAN VAULT - MARKDOWN SUPPORT
   Markdown Parsing & Rendering
   ======================================== */

class MarkdownParser {
    constructor() {
        this.options = {
            breaks: true,
            highlight: true,
            tables: true,
            taskLists: true
        };
    }
    
    parse(markdown) {
        let html = markdown;
        
        // Escape HTML
        html = this.escapeHtml(html);
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold and Italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Strikethrough
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px;">');
        
        // Blockquotes
        html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Horizontal rule
        html = html.replace(/^---$/gim, '<hr>');
        
        // Task lists
        html = html.replace(/^- \[x\] (.*$)/gim, '<li class="task-item completed"><input type="checkbox" checked disabled> $1</li>');
        html = html.replace(/^- \[ \] (.*$)/gim, '<li class="task-item"><input type="checkbox" disabled> $1</li>');
        
        // Unordered lists
        html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Ordered lists
        html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
        
        // Tables
        if (this.options.tables) {
            html = this.parseTables(html);
        }
        
        // Line breaks
        if (this.options.breaks) {
            html = html.replace(/\n/g, '<br>');
        }
        
        // Paragraphs
        html = html.replace(/^(?!<[^>]+>)(.*$)/gim, '<p>$1</p>');
        html = html.replace(/<p><br><\/p>/g, '');
        
        return html;
    }
    
    parseTables(html) {
        const tableRegex = /\n(\|.+\|)\n\|[-: |]+\|\n((?:\|.+\|\n?)+)/g;
        
        return html.replace(tableRegex, (match, headerRow, bodyRows) => {
            const headers = headerRow.split('|').filter(cell => cell.trim());
            const rows = bodyRows.trim().split('\n').map(row => 
                row.split('|').filter(cell => cell.trim())
            );
            
            let tableHtml = '<table class="markdown-table">';
            tableHtml += '<thead><tr>';
            headers.forEach(header => {
                tableHtml += `<th>${header.trim()}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
            
            rows.forEach(row => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                    tableHtml += `<td>${cell.trim()}</td>`;
                });
                tableHtml += '</tr>';
            });
            
            tableHtml += '</tbody></table>';
            return tableHtml;
        });
    }
    
    toMarkdown(html) {
        let markdown = html;
        
        // Headers
        markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n');
        markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n');
        markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n');
        
        // Bold and Italic
        markdown = markdown.replace(/<strong><em>(.*?)<\/em><\/strong>/g, '***$1***');
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
        markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
        
        // Links
        markdown = markdown.replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)');
        
        // Images
        markdown = markdown.replace(/<img src="(.*?)" alt="(.*?)".*?>/g, '![$2]($1)');
        
        // Code blocks
        markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```');
        markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');
        
        // Lists
        markdown = markdown.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
            return content.replace(/<li>(.*?)<\/li>/g, '- $1\n');
        });
        markdown = markdown.replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) => {
            let i = 1;
            return content.replace(/<li>(.*?)<\/li>/g, () => `${i++}. $1\n`);
        });
        
        // Blockquotes
        markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/gs, '> $1\n\n');
        
        // Paragraphs
        markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n\n');
        
        // Line breaks
        markdown = markdown.replace(/<br>/g, '\n');
        
        return markdown.trim();
    }
    
    escapeHtml(text) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, match => htmlEscapes[match]);
    }
    
    unescapeHtml(text) {
        const htmlUnescapes = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'"
        };
        return text.replace(/&(?:amp|lt|gt|quot|#39);/g, match => htmlUnescapes[match]);
    }
    
    highlightCode(code, language) {
        // Simple code highlighting (can be extended with libraries like Prism.js)
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'extends'];
        let highlighted = code;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="code-keyword">${keyword}</span>`);
        });
        
        // Strings
        highlighted = highlighted.replace(/(["'])(.*?)\1/g, '<span class="code-string">$1$2$1</span>');
        
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>');
        
        return highlighted;
    }
    
    extractPlainText(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }
    
    getWordCount(text) {
        const plainText = this.extractPlainText(text);
        return plainText.trim().split(/\s+/).filter(w => w.length > 0).length;
    }
    
    getReadingTime(text) {
        const wordsPerMinute = 200;
        const wordCount = this.getWordCount(text);
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        return minutes;
    }
    
    generateTableOfContents(html) {
        const toc = [];
        const headings = html.match(/<h[2-3][^>]*>.*?<\/h[2-3]>/g) || [];
        
        headings.forEach((heading, index) => {
            const text = heading.replace(/<[^>]*>/g, '');
            const level = heading.match(/<h([2-3])/)[1];
            const id = `section-${index}`;
            
            toc.push({
                id: id,
                text: text,
                level: parseInt(level)
            });
        });
        
        return toc;
    }
}

// Initialize markdown parser
const markdownParser = new MarkdownParser();
window.markdownParser = markdownParser;