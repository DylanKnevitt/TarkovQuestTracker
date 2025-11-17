import { AppController } from './AppController';

window.addEventListener('DOMContentLoaded', () => {
  // Initialize app controller
  new AppController();

  // Attach event listener to settings button
  const settingsBtn = document.getElementById('open-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.location.href = '/settings.html';
    });
  }
});
