import { parse, DocumentCstNode } from '@xml-tools/parser';
import { buildAst, XMLElement, XMLDocument } from '@xml-tools/ast';

interface Span {
  startOffset: number;
  endOffset: number;
}

function contains(pos: Span | undefined, offset: number): boolean {
  return !!pos && offset >= pos.startOffset && offset <= pos.endOffset;
}

function qualifiedName(el: XMLElement): string {
  return el.ns ? el.ns + ':' + (el.name as string) : (el.name as string);
}

function indexAmongSiblings(parent: XMLElement, el: XMLElement): number | null {
  const same = parent.subElements.filter((s) => s.name === el.name && s.ns === el.ns);
  if (same.length < 2) return null;
  return same.indexOf(el);
}

function hasCommentOrCdata(text: string, el: XMLElement): boolean {
  const open = el.syntax.openBody?.endOffset;
  const close = el.syntax.closeBody?.startOffset;
  if (open === undefined || close === undefined) return false;
  const inner = text.slice(open + 1, close);
  return inner.includes('<!--') || inner.includes('<![CDATA[');
}

function isCollapsedTextElement(text: string, el: XMLElement): boolean {
  return (
    el.attributes.length === 0 &&
    el.subElements.length === 0 &&
    !hasCommentOrCdata(text, el)
  );
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
    path.push(qualifiedName(el));
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

    // @xml-tools does not expose CDATA/comment node positions, so a cursor
    // resting inside them resolves to the element path rather than #cdata/#comment.
    if (!isCollapsedTextElement(text, el)) path.push('#text');
    return path;
  }

  return path.length ? path : null;
}
