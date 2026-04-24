import './shell.css';

export function renderShell(root: HTMLElement): void {
  root.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'shell';

  // Skip-to-main navigation link for keyboard users
  const skipLink = document.createElement('a');
  skipLink.href = '#dashboard';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';

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

  const trustStatements = [
    'No cookies',
    'No analytics',
    'No backend profiling',
    'All analysis runs locally',
  ];

  const list = document.createElement('ul');
  list.className = 'trust-statements';
  for (const statement of trustStatements) {
    const item = document.createElement('li');
    item.setAttribute('data-trust', '');
    item.textContent = statement;
    list.appendChild(item);
  }
  footer.appendChild(list);

  shell.appendChild(header);
  shell.appendChild(main);
  shell.appendChild(footer);

  root.appendChild(skipLink);
  root.appendChild(header);
  root.appendChild(main);
  root.appendChild(footer);
}
