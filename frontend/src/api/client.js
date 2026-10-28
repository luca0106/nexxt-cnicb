const API_BASE = '/api';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Eroare la încărcarea statisticilor');
  return res.json();
}

export async function fetchCases(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'toate') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', params.limit);

  const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
  if (!res.ok) throw new Error('Eroare la încărcarea dosarelor');
  return res.json();
}

export async function fetchCaseById(id) {
  const res = await fetch(`${API_BASE}/cases/${id}`);
  if (!res.ok) throw new Error('Dosarul nu a putut fi găsit');
  return res.json();
}

export async function updateCaseStatus(id, status, notes = '') {
  const res = await fetch(`${API_BASE}/cases/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) throw new Error('Nu s-a putut actualiza statusul');
  return res.json();
}

export async function createCase(data) {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Nu s-a putut crea dosarul');
  return res.json();
}

export async function fetchClients(search = '') {
  const url = search ? `${API_BASE}/clients?search=${encodeURIComponent(search)}` : `${API_BASE}/clients`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Eroare la încărcarea clienților');
  return res.json();
}

export async function createClient(data) {
  const res = await fetch(`${API_BASE}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Nu s-a putut crea clientul');
  return res.json();
}

export async function fetchDocuments(caseId = null) {
  const url = caseId ? `${API_BASE}/documents?case_id=${caseId}` : `${API_BASE}/documents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Eroare la încărcarea documentelor');
  return res.json();
}

export async function fetchTasks(caseId = null) {
  const url = caseId ? `${API_BASE}/tasks?case_id=${caseId}` : `${API_BASE}/tasks`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Eroare la încărcarea sarcinilor');
  return res.json();
}

export async function toggleTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Nu s-a putut actualiza sarcina');
  return res.json();
}

export async function fetchHistory(caseId = null) {
  const url = caseId ? `${API_BASE}/history?case_id=${caseId}` : `${API_BASE}/history`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Eroare la încărcarea istoricului');
  return res.json();
}

