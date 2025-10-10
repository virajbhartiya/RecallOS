/// <reference types="chrome" />

document.addEventListener('DOMContentLoaded', async () => {
  const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
  const saveButton = document.getElementById('saveEndpoint') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load current endpoint
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ENDPOINT' });
    if (response.success) {
      apiEndpointInput.value = response.endpoint;
    }
  } catch (error) {
    console.error('Error loading endpoint:', error);
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

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
});

 