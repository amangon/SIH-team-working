import { useRef, useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { LANGUAGES, cn } from '@/utils';

/**
 * Lightweight code editor: synced line numbers, monospace textarea,
 * copy & download actions, language selector.
 */
export function CodeEditor({ code, onChange, language, onLanguageChange, readOnly = false, minRows = 12 }) {
  const [copied, setCopied] = useState(false);
  const lineRef = useRef(null);
  const lines = (code || '').split('\n').length;

  const copy = async () => {
    await navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const extMap = { javascript: 'js', typescript: 'ts', python: 'py', java: 'java', c: 'c', cpp: 'cpp', go: 'go', rust: 'rs', jsx: 'jsx', html: 'html', css: 'css', sql: 'sql', dart: 'dart', json: 'json', bash: 'sh' };
    const blob = new Blob([code || ''], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `code.${extMap[language] || 'txt'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 border-b border-white/10">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <select
          value={language}
          onChange={(e) => onLanguageChange?.(e.target.value)}
          disabled={readOnly}
          className="ml-2 bg-transparent text-xs text-gray-300 outline-none cursor-pointer [&>option]:bg-gray-800"
        >
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={copy} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition" title="Copy">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button type="button" onClick={download} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition" title="Download">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex max-h-96 overflow-auto">
        <pre
          ref={lineRef}
          aria-hidden
          className="py-3 px-3 text-right text-xs leading-6 text-gray-600 select-none bg-gray-900/80 font-mono sticky left-0"
        >
          {Array.from({ length: Math.max(lines, minRows) }, (_, i) => i + 1).join('\n')}
        </pre>
        <textarea
          value={code || ''}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          rows={Math.max(lines, minRows)}
          placeholder={readOnly ? '' : '// Paste or write your code here…'}
          className={cn(
            'flex-1 py-3 pr-4 pl-2 bg-transparent text-gray-100 font-mono text-xs leading-6 outline-none resize-none min-w-0',
            'placeholder:text-gray-600'
          )}
        />
      </div>
    </div>
  );
}
