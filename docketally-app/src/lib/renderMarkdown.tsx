import React from "react";

/**
 * Lightweight markdown renderer for record fields.
 * Handles: **bold**, bullet lists (- ), numbered lists (1. )
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bullet list block
    if (/^\s*- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) {
        items.push(lines[i].replace(/^\s*- /, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: "4px 0", paddingLeft: 20 }}>
          {items.map((item, j) => (
            <li key={j} style={{ marginBottom: 2 }}>{inlineBold(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list block
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: "4px 0", paddingLeft: 20 }}>
          {items.map((item, j) => (
            <li key={j} style={{ marginBottom: 2 }}>{inlineBold(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular line
    if (line.trim() === "") {
      elements.push(<br key={`br-${i}`} />);
    } else {
      const needsBreak = i < lines.length - 1 && !/^\s*[-\d]/.test(lines[i + 1] || "");
      elements.push(
        <span key={`p-${i}`}>
          {inlineBold(line)}
          {needsBreak ? <br /> : null}
        </span>
      );
    }
    i++;
  }

  return <>{elements}</>;
}

/** Replace **text** with <strong>text</strong> */
function inlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
