// API Service — centralized file for all backend HTTP calls
// This keeps all URLs in one place so if backend URL changes, you update here only

const BASE_URL = 'http://localhost:8000/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
};

export const apiService = {
  // HCP calls
  getHCPs: () =>
    fetch(`${BASE_URL}/hcps/`).then(handleResponse),

  searchHCP: (name) =>
    fetch(`${BASE_URL}/hcps/search/${name}`).then(handleResponse),

  createHCP: (data) =>
    fetch(`${BASE_URL}/hcps/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  // Interaction calls
  getInteractions: () =>
    fetch(`${BASE_URL}/interactions/`).then(handleResponse),

  createInteraction: (data) =>
    fetch(`${BASE_URL}/interactions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateInteraction: (id, data) =>
    fetch(`${BASE_URL}/interactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  deleteInteraction: (id) =>
    fetch(`${BASE_URL}/interactions/${id}`, {
      method: 'DELETE'
    }).then(handleResponse),

  // AI Chat call
  sendChat: (message, hcpId) =>
    fetch(`${BASE_URL}/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, hcp_id: hcpId })
    }).then(handleResponse),
};