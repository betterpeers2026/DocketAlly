"use client";

import React, { useRef, useCallback } from "react";

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  rows?: number;
  required?: boolean;
  style?: React.CSSProperties;
}

const toolbarBtnBase: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  borderRadius: 6,
  border: "1px solid #D6D3D1",
  background: "#FFFFFF",
  fontSize: 13,
  fontWeight: 600,
  color: "#44403C",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  display: "inline-flex",
  alignItems: "center",
  transition: "background 0.1s, border-color 0.1s, color 0.1s",
};

export default function RichTextarea({
  value,
  onChange,
  placeholder,
  minHeight,
  rows,
  required,
  style,
}: RichTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const getSelection = useCallback(() => {
    const el = ref.current;
    if (!el) return { start: 0, end: 0, text: "" };
    return {
      start: el.selectionStart,
      end: el.selectionEnd,
      text: value.slice(el.selectionStart, el.selectionEnd),
    };
  }, [value]);

  const replaceRange = useCallback(
    (start: number, end: number, replacement: string, cursorOffset?: number) => {
      const next = value.slice(0, start) + replacement + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const pos = cursorOffset ?? start + replacement.length;
        el.setSelectionRange(pos, pos);
        el.focus();
      });
    },
    [value, onChange]
  );

  /* ---- Bold ---- */
  const handleBold = useCallback(() => {
    const { start, end, text } = getSelection();
    if (text) {
      replaceRange(start, end, `**${text}**`);
    } else {
      replaceRange(start, end, "**bold text**", start + 2);
    }
  }, [getSelection, replaceRange]);

  /* ---- Bullet list ---- */
  const handleBullet = useCallback(() => {
    const { start, end, text } = getSelection();
    if (text && text.includes("\n")) {
      const lines = text.split("\n");
      const toggled = lines.every((l) => l.startsWith("- "));
      const result = toggled
        ? lines.map((l) => l.replace(/^- /, "")).join("\n")
        : lines.map((l) => `- ${l}`).join("\n");
      replaceRange(start, end, result);
    } else {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = value.indexOf("\n", start);
      const eol = lineEnd === -1 ? value.length : lineEnd;
      const line = value.slice(lineStart, eol);
      if (line.startsWith("- ")) {
        replaceRange(lineStart, eol, line.slice(2));
      } else {
        replaceRange(lineStart, eol, `- ${line}`);
      }
    }
  }, [getSelection, replaceRange, value]);

  /* ---- Numbered list ---- */
  const handleNumbered = useCallback(() => {
    const { start, end, text } = getSelection();
    if (text && text.includes("\n")) {
      const lines = text.split("\n");
      const toggled = lines.every((l) => /^\d+\.\s/.test(l));
      const result = toggled
        ? lines.map((l) => l.replace(/^\d+\.\s/, "")).join("\n")
        : lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
      replaceRange(start, end, result);
    } else {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = value.indexOf("\n", start);
      const eol = lineEnd === -1 ? value.length : lineEnd;
      const line = value.slice(lineStart, eol);
      if (/^\d+\.\s/.test(line)) {
        replaceRange(lineStart, eol, line.replace(/^\d+\.\s/, ""));
      } else {
        replaceRange(lineStart, eol, `1. ${line}`);
      }
    }
  }, [getSelection, replaceRange, value]);

  /* ---- Keydown handler (Tab, Shift+Tab, Enter list continuation) ---- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const el = ref.current;
      if (!el) return;

      // Tab → insert 2 spaces
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const start = el.selectionStart;
        replaceRange(start, el.selectionEnd, "  ", start + 2);
        return;
      }

      // Shift+Tab → remove 2 spaces from line start
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const lineStart = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
        const lineEnd = value.indexOf("\n", el.selectionStart);
        const eol = lineEnd === -1 ? value.length : lineEnd;
        const line = value.slice(lineStart, eol);
        if (line.startsWith("  ")) {
          replaceRange(lineStart, eol, line.slice(2));
        }
        return;
      }

      // Enter → continue bullet or numbered list
      if (e.key === "Enter") {
        const cursor = el.selectionStart;
        const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
        const line = value.slice(lineStart, cursor);

        // Bullet continuation
        const bulletMatch = line.match(/^(\s*- )(.*)/);
        if (bulletMatch) {
          // If the line content after prefix is empty, end the list
          if (!bulletMatch[2].trim()) {
            e.preventDefault();
            replaceRange(lineStart, cursor, "\n");
            return;
          }
          e.preventDefault();
          replaceRange(cursor, cursor, "\n- ");
          return;
        }

        // Numbered list continuation
        const numMatch = line.match(/^(\s*)(\d+)\.\s(.*)/);
        if (numMatch) {
          if (!numMatch[3].trim()) {
            e.preventDefault();
            replaceRange(lineStart, cursor, "\n");
            return;
          }
          e.preventDefault();
          const nextNum = parseInt(numMatch[2], 10) + 1;
          replaceRange(cursor, cursor, `\n${numMatch[1]}${nextNum}. `);
          return;
        }
      }
    },
    [value, replaceRange]
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <button
          type="button"
          onClick={handleBold}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F5F5F4";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
          }}
          style={{ ...toolbarBtnBase, fontWeight: 700 }}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={handleBullet}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F5F5F4";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
          }}
          style={toolbarBtnBase}
          title="Bullet List"
        >
          &bull; List
        </button>
        <button
          type="button"
          onClick={handleNumbered}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F5F5F4";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
          }}
          style={toolbarBtnBase}
          title="Numbered List"
        >
          1. List
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        rows={rows}
        style={{
          ...style,
          minHeight: minHeight ?? undefined,
        }}
      />
    </div>
  );
}
