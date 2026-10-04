// Model output never becomes raw HTML. All formatting is constructed with DOM text nodes.
export function renderText(root, text) {
  root.replaceChildren();
  for (const line of text.split('\n')) {
    const row = document.createElement('div');
    row.className = 'line';
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const value = heading ? heading[1] : line;
    if (heading) row.classList.add('heading');
    const parts = value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        const b = document.createElement('strong'); b.textContent = part.slice(2, -2); row.append(b);
      } else if (part.startsWith('`') && part.endsWith('`')) {
        const c = document.createElement('code'); c.textContent = part.slice(1, -1); row.append(c);
      } else row.append(document.createTextNode(part));
    }
    if (!value) row.append(document.createElement('br'));
    root.append(row);
  }
}
export function formatSpend(cost) {return `${(cost * 100).toFixed(2)}¢`;}
