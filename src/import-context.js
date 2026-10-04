export const CONTEXT_LIMIT = 32000;
export async function appendMarkdownFiles(files, current = '') {
  const sections = [];
  for (const file of files) {
    if (!/\.(md|markdown)$/i.test(file.name)) throw new Error('Choose .md or .markdown files.');
    if (file.size > CONTEXT_LIMIT) throw new Error(`${file.name} is too large. The context limit is 32 KB.`);
    const content = (await file.text()).replace(/^\uFEFF/, '').trim();
    if (!content) throw new Error(`${file.name} is empty.`);
    const name = file.name.replace(/[\r\n]/g, ' ');
    sections.push(`## ${name}\n\n${content}`);
  }
  if (!sections.length) return current;
  const combined = [current.trim(), ...sections].filter(Boolean).join('\n\n');
  if (new TextEncoder().encode(combined).length > CONTEXT_LIMIT) {
    throw new Error('Combined context exceeds 32 KB. Shorten the context or select fewer files.');
  }
  return combined;
}
