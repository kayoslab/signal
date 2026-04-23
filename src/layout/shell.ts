import './shell.css';

export function renderShell(root: HTMLElement): void {
  root.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'shell';

  const header = document.createElement('header');
  header.className = 'shell-header';
  const title = document.createElement('h1');
  title.textContent = 'Signal Intelligence';
  header.appendChild(title);

  const main = document.createElement('main');
  main.id = 'dashboard';
  main.className = 'dashboard';

  const footer = document.createElement('footer');
  footer.className = 'shell-footer';
  footer.textContent = 'All analysis runs locally. No data leaves your browser.';

  shell.appendChild(header);
  shell.appendChild(main);
  shell.appendChild(footer);

  root.appendChild(header);
  root.appendChild(main);
  root.appendChild(footer);
}
