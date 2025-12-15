let userMenuOpen = false;
  
  function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    const button = document.getElementById('user-menu-button');
    userMenuOpen = !userMenuOpen;
    
    if (userMenuOpen) {
      dropdown.classList.remove('opacity-0', 'invisible', '-translate-y-2');
      dropdown.classList.add('opacity-100', 'visible', 'translate-y-0');
      button.setAttribute('aria-expanded', 'true');
    } else {
      dropdown.classList.add('opacity-0', 'invisible', '-translate-y-2');
      dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0');
      button.setAttribute('aria-expanded', 'false');
    }
  }
  
  // 点击外部关闭菜单
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    if (!menu.contains(e.target) && userMenuOpen) {
      toggleUserMenu();
    }
  });