import React, { useRef, useState } from 'react';
import { Bold, Eye, Heading2, Italic, List, Pilcrow } from 'lucide-react';
import type { LocalizedText } from '../types/birthday.ts';

function renderInlineSegments(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }
  return nodes;
}

export function RichTextDisplay({
  text,
  className = '',
  compact = false,
}: {
  text: string;
  className?: string;
  compact?: boolean;
}) {
  if (!text || !text.trim()) return null;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];
  let blockKey = 0;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const joined = paragraphLines.join(' ').trim();
    if (joined) {
      blocks.push(
        <p key={`p-${blockKey++}`} className={compact ? 'leading-relaxed' : 'leading-[1.85]'}>
          {renderInlineSegments(joined)}
        </p>,
      );
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${blockKey++}`}
        className="list-disc ps-5 space-y-1 text-start"
      >
        {listItems.map((item, idx) => (
          <li key={`li-${idx}`} className="leading-relaxed">
            {renderInlineSegments(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      const headingText = trimmed.replace(/^#{1,3}\s+/, '');
      blocks.push(
        <h4
          key={`h-${blockKey++}`}
          className="font-display text-lg sm:text-xl font-semibold pt-1"
        >
          {renderInlineSegments(headingText)}
        </h4>,
      );
      continue;
    }

    if (/^([-*•])\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^([-*•])\s+/, ''));
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return (
    <div className={`space-y-2.5 ${className}`}>
      {blocks}
    </div>
  );
}

interface RichTextEditorProps {
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  rows?: number;
  helperText?: string;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  rows = 5,
  helperText,
}: RichTextEditorProps) {
  const [activeLang, setActiveLang] = useState<'en' | 'ar'>('en');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const currentVal = value[activeLang] || '';

  const applyFormat = (mode: 'heading' | 'bold' | 'italic' | 'list' | 'paragraph') => {
    const el = textareaRef.current;
    const text = currentVal;
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    const selected = text.slice(start, end);

    let insertion = '';
    if (mode === 'bold') {
      insertion = `**${selected || (activeLang === 'ar' ? 'نص بارز' : 'bold text')}**`;
    } else if (mode === 'italic') {
      insertion = `*${selected || (activeLang === 'ar' ? 'نص مائل' : 'italic text')}*`;
    } else if (mode === 'heading') {
      const prefix = start > 0 && text[start - 1] !== '\n' ? '\n' : '';
      insertion = `${prefix}## ${selected || (activeLang === 'ar' ? 'عنوان جانبي' : 'Section Heading')}`;
    } else if (mode === 'list') {
      const lines = (selected || (activeLang === 'ar' ? 'نقطة أولى\nنقطة ثانية' : 'First line\nSecond line'))
        .split('\n')
        .map((l) => (l.startsWith('- ') ? l : `- ${l}`))
        .join('\n');
      const prefix = start > 0 && text[start - 1] !== '\n' ? '\n' : '';
      insertion = `${prefix}${lines}`;
    } else {
      insertion = `\n\n${selected}`;
    }

    const updated = text.slice(0, start) + insertion + text.slice(end);
    onChange({ ...value, [activeLang]: updated });

    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursor = start + insertion.length;
        textareaRef.current.setSelectionRange(cursor, cursor);
      }
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-[#C5A46D]/25 bg-[#1E191E] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-medium text-[#C5A46D]">{label}</label>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border border-[#C5A46D]/30 bg-[#292329] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveLang('en')}
              className={`rounded px-2.5 py-1 font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeLang === 'en' ? 'bg-[#C5A46D] text-[#292329]' : 'text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
              }`}
            >
              English (LTR)
            </button>
            <button
              type="button"
              onClick={() => setActiveLang('ar')}
              className={`rounded px-2.5 py-1 font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeLang === 'ar' ? 'bg-[#C5A46D] text-[#292329]' : 'text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
              }`}
            >
              العربية (RTL)
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
              showPreview
                ? 'border-[#D9A5AE] bg-[#713F50] text-[#F5EBDD]'
                : 'border-[#C5A46D]/30 bg-[#292329] text-[#F5EBDD]/80 hover:text-[#F5EBDD]'
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>{showPreview ? 'Edit' : 'Preview'}</span>
          </button>
        </div>
      </div>

      {!showPreview && (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#C5A46D]/15 pb-2">
          <button
            type="button"
            onClick={() => applyFormat('heading')}
            title="Heading"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#F5EBDD]/85 hover:bg-white/10"
          >
            <Heading2 className="h-3.5 w-3.5 text-[#C5A46D]" />
            <span>Heading</span>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            title="Bold"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#F5EBDD]/85 hover:bg-white/10"
          >
            <Bold className="h-3.5 w-3.5 text-[#C5A46D]" />
            <span>Bold</span>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            title="Italic"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#F5EBDD]/85 hover:bg-white/10"
          >
            <Italic className="h-3.5 w-3.5 text-[#C5A46D]" />
            <span>Italic</span>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('list')}
            title="Bullet list"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#F5EBDD]/85 hover:bg-white/10"
          >
            <List className="h-3.5 w-3.5 text-[#C5A46D]" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('paragraph')}
            title="Paragraph break"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#F5EBDD]/85 hover:bg-white/10"
          >
            <Pilcrow className="h-3.5 w-3.5 text-[#C5A46D]" />
            <span>Paragraph</span>
          </button>
        </div>
      )}

      {showPreview ? (
        <div
          dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
          className="min-h-[110px] rounded-lg border border-[#C5A46D]/25 bg-[#F5EBDD] p-4 text-sm text-[#292329]"
        >
          {currentVal.trim() ? (
            <RichTextDisplay text={currentVal} />
          ) : (
            <p className="text-xs text-[#292329]/50 italic">No text yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={currentVal}
          dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
          onChange={(e) => onChange({ ...value, [activeLang]: e.target.value })}
          placeholder={
            activeLang === 'ar'
              ? 'اكتب المحتوى هنا باللغة العربية...'
              : 'Write your formatted message in English...'
          }
          className="w-full rounded-lg border border-[#C5A46D]/25 bg-[#292329] px-3 py-2.5 text-xs leading-relaxed text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
        />
      )}

      {helperText && <p className="text-[11px] text-[#F5EBDD]/55">{helperText}</p>}
    </div>
  );
}
