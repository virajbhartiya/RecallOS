/// <reference types="chrome" />

document.addEventListener('DOMContentLoaded', async () => {
  const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
  const walletAddressInput = document.getElementById('walletAddress') as HTMLInputElement;
  const saveButton = document.getElementById('saveEndpoint') as HTMLButtonElement;
  const saveWalletButton = document.getElementById('saveWalletAddress') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load current settings
  try {
    const endpointResponse = await chrome.runtime.sendMessage({ type: 'GET_ENDPOINT' });
    if (endpointResponse.success) {
      apiEndpointInput.value = endpointResponse.endpoint;
    }
    
    const walletResponse = await chrome.runtime.sendMessage({ type: 'GET_WALLET_ADDRESS' });
    if (walletResponse.success && walletResponse.walletAddress) {
      walletAddressInput.value = walletResponse.walletAddress;
      statusDiv.textContent = `Connected: ${walletResponse.walletAddress.substring(0, 10)}...`;
      statusDiv.className = 'status success';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  // Save endpoint
  saveButton.addEventListener('click', async () => {
    const endpoint = apiEndpointInput.value.trim();
    
    if (!endpoint) {
      showStatus('Please enter an API endpoint', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'SET_ENDPOINT', 
        endpoint 
      });
      
      if (response.success) {
        showStatus('Configuration saved successfully!', 'success');
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error}`, 'error');
    }
  });

  // Save wallet address
  saveWalletButton.addEventListener('click', async () => {
    const walletAddress = walletAddressInput.value.trim();
    
    if (!walletAddress) {
      showStatus('Please enter a wallet address', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'SET_WALLET_ADDRESS', 
        walletAddress 
      });
      
      if (response.success) {
        showStatus('Wallet address saved successfully!', 'success');
        statusDiv.textContent = `Connected: ${walletAddress.substring(0, 10)}...`;
        statusDiv.className = 'status success';
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error}`, 'error');
    }
  });

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
});

 