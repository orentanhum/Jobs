(() => {
  const COPYRIGHT = 'Copyright © 2026 Oren Tanhum. All rights reserved.';

  const addLegalUi = () => {
    const aside = document.querySelector('aside');
    if (aside && !document.getElementById('jobtrack-about-legal')) {
      const button = document.createElement('button');
      button.id = 'jobtrack-about-legal';
      button.type = 'button';
      button.className = 'flex w-full items-center gap-2 rounded-lg p-3 text-sm';
      button.setAttribute('aria-label', 'About and Legal');
      button.innerHTML = '<span aria-hidden="true" style="font-size:18px;line-height:1">🛡️</span><span>About & Legal</span>';
      button.addEventListener('click', () => { window.location.href = '/about.html'; });
      aside.appendChild(button);
    }

    const appRoot = document.getElementById('root');
    if (appRoot && !document.getElementById('jobtrack-copyright-footer')) {
      const footer = document.createElement('footer');
      footer.id = 'jobtrack-copyright-footer';
      footer.style.cssText = 'padding:14px 18px;text-align:center;font:600 11px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0';
      const link = document.createElement('a');
      link.href = '/about.html';
      link.textContent = `${COPYRIGHT} · About, Terms, Privacy & Legal`;
      link.style.cssText = 'color:inherit;text-decoration:none';
      footer.appendChild(link);
      appRoot.insertAdjacentElement('afterend', footer);
    }
  };

  addLegalUi();
  const observer = new MutationObserver(addLegalUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
