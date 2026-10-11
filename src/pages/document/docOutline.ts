/** Facts derived from a serialized Lexical editor state (JSON string). */
export interface DocFacts {
  headings: { level: 1 | 2 | 3; text: string; index: number }[];
  words: number;
  checklist: { done: number; total: number };
}

interface LexicalNode {
  type?: string;
  tag?: string;
  text?: string;
  listType?: string;
  checked?: boolean;
  children?: LexicalNode[];
}

function textOf(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text;
  return (node.children ?? []).map(textOf).join('');
}

export function analyzeDoc(serialized: string | null | undefined): DocFacts {
  const facts: DocFacts = { headings: [], words: 0, checklist: { done: 0, total: 0 } };
  if (!serialized) return facts;
  let root: LexicalNode | undefined;
  try {
    root = (JSON.parse(serialized) as { root?: LexicalNode }).root;
  } catch {
    return facts;
  }
  if (!root) return facts;

  let headingIndex = 0;
  const walk = (node: LexicalNode, inCheckList: boolean) => {
    if (node.type === 'heading' && /^h[1-3]$/.test(node.tag ?? '')) {
      const text = textOf(node).trim();
      if (text) facts.headings.push({ level: Number(node.tag?.[1]) as 1 | 2 | 3, text, index: headingIndex });
      headingIndex += 1;
    }
    if (typeof node.text === 'string') facts.words += node.text.trim().split(/\s+/).filter(Boolean).length;
    if (inCheckList && node.type === 'listitem') {
      facts.checklist.total += 1;
      if (node.checked) facts.checklist.done += 1;
    }
    const childInCheck = node.type === 'list' ? node.listType === 'check' : inCheckList;
    for (const child of node.children ?? []) walk(child, childInCheck);
  };
  walk(root, false);
  return facts;
}

/** Scrolls to the n-th h1–h3 rendered inside the editor. */
export function scrollToHeading(container: HTMLElement | null, index: number) {
  const headings = container?.querySelectorAll('.editor-input h1, .editor-input h2, .editor-input h3');
  const target = headings?.[index] as HTMLElement | undefined;
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
