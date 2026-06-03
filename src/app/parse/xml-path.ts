import { parse, DocumentCstNode } from '@xml-tools/parser';
import { buildAst, XMLElement, XMLDocument } from '@xml-tools/ast';

interface Span {
  startOffset: number;
  endOffset: number;
}

function contains(pos: Span | undefined, offset: number): boolean {
  return !!pos && offset >= pos.startOffset && offset <= pos.endOffset + 1;
}

function indexAmongSiblings(parent: XMLElement, el: XMLElement): number | null {
  const same = parent.subElements.filter((s) => s.name === el.name);
  if (same.length < 2) return null;
  return same.indexOf(el);
}

function isCollapsedTextElement(el: XMLElement): boolean {
  return el.attributes.length === 0 && el.subElements.length === 0;
}

export function xmlPathAtOffset(text: string, offset: number): (string | number)[] | null {
  let doc: XMLDocument;
  try {
    const { cst, tokenVector } = parse(text);
    doc = buildAst(cst as DocumentCstNode, tokenVector);
  } catch {
    return null;
  }

  const root = doc.rootElement;
  if (!root || root.name === null || !contains(root.position, offset)) return null;

  const path: (string | number)[] = [];
  let el: XMLElement = root;
  let parent: XMLElement | null = null;

  while (el) {
    path.push(el.name as string);
    if (parent) {
      const idx = indexAmongSiblings(parent, el);
      if (idx !== null) path.push(idx);
    }

    const attr = el.attributes.find((a) => contains(a.position, offset));
    if (attr && attr.key !== null) {
      path.push('@_' + attr.key);
      return path;
    }

    const child = el.subElements.find((c) => c.name !== null && contains(c.position, offset));
    if (child) {
      parent = el;
      el = child;
      continue;
    }

    if (!isCollapsedTextElement(el)) path.push('#text');
    return path;
  }

  return path.length ? path : null;
}
