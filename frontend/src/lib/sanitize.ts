const ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
  'A', 'H1', 'H2', 'H3', 'H4', 'FONT', 'CODE', 'PRE', 'HR',
]);
const ALLOWED_ATTRS = new Set(['href', 'style', 'align', 'size', 'face', 'color']);

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(child.tagName)) child.remove();
        else child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const unsafeHref = name === 'href' && !/^(https?:|mailto:)/i.test(attr.value.trim());
        const unsafeStyle = name === 'style' && /url\(|expression\(/i.test(attr.value);
        if (!ALLOWED_ATTRS.has(name) || unsafeHref || unsafeStyle) child.removeAttribute(attr.name);
      }
      if (child.tagName === 'A') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      walk(child);
    }
  };
  walk(root);
  // second pass catches children that were unwrapped from disallowed tags
  walk(root);
  return root.innerHTML;
}
