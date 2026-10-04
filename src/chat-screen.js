import { renderText } from './format.js';

// One fixed-size message view. Older/long imported messages remain readable with
// arrows, without adding a scrollbar or shrinking the text.
export class ChatScreen {
  constructor(root, back, next, position) {
    Object.assign(this, {root, back, next, position, messages: [], index: 0, page: 0});
    back.onclick = () => this.move(-1);
    next.onclick = () => this.move(1);
    new ResizeObserver(() => this.draw()).observe(root);
  }
  clear() { this.messages = []; this.index = this.page = 0; this.draw(); }
  add(role, content, status = 'complete') {
    const message = {role, content, status};
    this.messages.push(message); this.index = this.messages.length - 1; this.page = 0;
    this.draw(); return message;
  }
  update(message, content) { message.content = content; this.draw(); }
  move(direction) {
    if (!this.messages.length) return;
    if (direction < 0) {
      if (this.page > 0) this.page--;
      else if (this.index > 0) { this.index--; this.page = Number.MAX_SAFE_INTEGER; }
    } else if (this.page + 1 < this.pages.length) this.page++;
    else if (this.index + 1 < this.messages.length) { this.index++; this.page = 0; }
    this.draw();
  }
  replyChars() {
    const style = getComputedStyle(this.root);
    const width = this.root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = this.root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    // Reserve a line and use the width of a wide capital, leaving room for bold.
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = `700 22px ${style.fontFamily}`;
    const columns = Math.max(1, Math.floor(width / probe.measureText('W').width) - 1);
    const lines = Math.max(1, Math.floor(height / 34.1) - 1);
    return Math.max(1, Math.min(240, columns * lines));
  }
  draw() {
    this.root.replaceChildren();
    if (!this.messages.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      empty.innerHTML = '<div class="title">What’s on your mind?</div><p>Talk it through.</p>';
      this.root.append(empty); this.back.disabled = this.next.disabled = true; this.position.textContent = ''; return;
    }
    const message = this.messages[this.index];
    const article = document.createElement('article'); article.className = `message ${message.role}`;
    if (message.role === 'user') {
      const who = document.createElement('div'); who.className = 'who'; who.textContent = 'YOU'; article.append(who);
    }
    const body = document.createElement('div'); body.className = 'body'; article.append(body); this.root.append(article);
    const style = getComputedStyle(this.root);
    const height = this.root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    let remaining = Array.from(message.content); this.pages = [];
    while (remaining.length) {
      let low = 1, high = remaining.length, fit = 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2); renderText(body, remaining.slice(0, mid).join(''));
        if (article.scrollHeight <= height) { fit = mid; low = mid + 1; } else high = mid - 1;
      }
      if (fit < remaining.length) {
        const boundary = remaining.slice(0, fit).join('').lastIndexOf(' ');
        if (boundary > fit / 2) fit = Array.from(remaining.slice(0, fit).join('').slice(0, boundary + 1)).length;
      }
      this.pages.push(remaining.splice(0, fit).join(''));
    }
    if (!this.pages.length) this.pages.push('');
    this.page = Math.min(this.page, this.pages.length - 1);
    renderText(body, this.pages[this.page]);
    this.back.disabled = this.index === 0 && this.page === 0;
    this.next.disabled = this.index === this.messages.length - 1 && this.page === this.pages.length - 1;
    this.position.textContent = `${this.index + 1} / ${this.messages.length}` + (this.pages.length > 1 ? ` · ${this.page + 1}/${this.pages.length}` : '');
  }
}
