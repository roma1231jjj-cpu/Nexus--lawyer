import React from 'react';

function inline(text: string, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d+\])/g).filter(Boolean);
  return (
    <React.Fragment key={key}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
        if (/^\[\d+\]$/.test(part)) return <span className="ref" key={i}>{part}</span>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

export function Rich({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const content = paragraph.join(' ');
    nodes.push(<p key={`p-${nodes.length}`}>{inline(content, 0)}</p>);
    paragraph = [];
  };

  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {bullets.map((item, i) => (
          <li key={i}>{inline(item, i)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  const flushNumbered = () => {
    if (!numbered.length) return;
    nodes.push(
      <ol key={`ol-${nodes.length}`}>
        {numbered.map((item, i) => (
          <li key={i}>{inline(item, i)}</li>
        ))}
      </ol>
    );
    numbered = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushNumbered();
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushAll();
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      flushAll();
      nodes.push(<h3 key={`h-${nodes.length}`}>{inline(heading[1], 0)}</h3>);
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      flushNumbered();
      bullets.push(bullet[1]);
      continue;
    }
    const ordered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      flushBullets();
      numbered.push(ordered[2]);
      continue;
    }
    flushBullets();
    flushNumbered();
    paragraph.push(line);
  }
  flushAll();

  return <>{nodes}</>;
}
