(() => {
  const labels = {
    green: 'Happy',
    blue: 'Professional',
    pink: 'Elegant',
    purple: 'Lavender',
  }

  const applyLabels = () => {
    document.querySelectorAll('.theme-picker-label').forEach(el => {
      if (el.textContent !== 'Style') el.textContent = 'Style'
    })

    document.querySelectorAll('.theme-picker select').forEach(select => {
      select.setAttribute('aria-label', 'Choose visual style')
      Array.from(select.options || []).forEach(option => {
        const next = labels[option.value]
        if (next && option.textContent !== next) option.textContent = next
      })
    })
  }

  applyLabels()
  const observer = new MutationObserver(applyLabels)
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()
