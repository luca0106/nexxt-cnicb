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

export async function updateCaseManualForm(id, data) {
  const res = await fetch(`${API_BASE}/cases/${id}/manual-form`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Nu s-a putut salva formularul de verificare');
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

export async function createDocument(data) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Nu s-a putut încărca documentul');
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

// =========================================================
// RAIFFEISEN AI COPILOT (MULTI-AGENT EXTENSION) API CALLS
// =========================================================

export async function runCaseAnalysis(caseId, options = {}) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error('Eroare la rularea analizei AI multi-agent');
  return res.json();
}

export async function fetchLatestCaseAnalysis(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/analysis`);
  if (!res.ok) return null;
  return res.json();
}

export async function resolveFinding(analysisId, findingId, payload) {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/findings/${findingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Nu s-a putut actualiza constatarea');
  return res.json();
}

export async function sendRemediationNotification(analysisId, payload = {}) {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/remediation/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Eroare la trimiterea notificării de remediere');
  return res.json();
}

export async function submitHumanDecision(analysisId, payload) {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/human-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Eroare la înregistrarea deciziei ofițerului');
  return res.json();
}
