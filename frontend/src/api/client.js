const API_BASE = '/api';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to load dashboard statistics');
  return res.json();
}

export async function fetchCases(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', params.limit);

  const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load credit cases');
  return res.json();
}

export async function fetchCaseById(id) {
  const res = await fetch(`${API_BASE}/cases/${id}`);
  if (!res.ok) throw new Error('Case could not be found');
  return res.json();
}

export async function updateCaseStatus(id, status, notes = '') {
  const res = await fetch(`${API_BASE}/cases/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) throw new Error('Failed to update case status');
  return res.json();
}

export async function updateCaseManualForm(id, data) {
  const res = await fetch(`${API_BASE}/cases/${id}/manual-form`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save underwriting verification form');
  return res.json();
}

export async function createCase(data) {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create new case');
  return res.json();
}

export async function fetchClients(search = '') {
  const url = search ? `${API_BASE}/clients?search=${encodeURIComponent(search)}` : `${API_BASE}/clients`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load banking clients');
  return res.json();
}

export async function createClient(data) {
  const res = await fetch(`${API_BASE}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to register client');
  return res.json();
}

export async function fetchDocuments(caseId = null) {
  const url = caseId ? `${API_BASE}/documents?case_id=${caseId}` : `${API_BASE}/documents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load documents');
  return res.json();
}

export async function createDocument(data) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to upload document');
  return res.json();
}

export async function fetchTasks(caseId = null) {
  const url = caseId ? `${API_BASE}/tasks?case_id=${caseId}` : `${API_BASE}/tasks`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load tasks');
  return res.json();
}

export async function toggleTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to update task status');
  return res.json();
}

export async function fetchHistory(caseId = null) {
  const url = caseId ? `${API_BASE}/history?case_id=${caseId}` : `${API_BASE}/history`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load audit history');
  return res.json();
}

// =========================================================
// RAIFFEISEN AI COPILOT (MULTI-AGENT EXTENSION) API CALLS
// =========================================================

export async function fetchCaseAgents(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/agents`);
  if (!res.ok) throw new Error('Failed to load modular AI agent catalog');
  return res.json();
}

export async function runModularAgent(caseId, agentId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/agents/${agentId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to execute modular AI agent: ${agentId}`);
  return res.json();
}

export async function runCaseAnalysis(caseId, options = {}) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error('Failed to execute AI multi-agent analysis');
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
  if (!res.ok) throw new Error('Failed to update finding status');
  return res.json();
}

export async function sendRemediationNotification(analysisId, payload = {}) {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/remediation/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send remediation notification');
  return res.json();
}

export async function submitHumanDecision(analysisId, payload) {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/human-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to record underwriting decision');
  return res.json();
}

export async function fetchClientById(id, signal) {
  const res = await fetch(`${API_BASE}/clients/${id}`, { signal });
  if (!res.ok) throw new Error('Could not load this client.');
  return res.json();
}

export async function fetchFinancialProfile(id, signal) {
  const res = await fetch(`${API_BASE}/clients/${id}/financial-profile`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Could not load the financial profile. Please retry.');
  return res.json();
}

export async function saveFinancialProfile(id, data) {
  const res = await fetch(`${API_BASE}/clients/${id}/financial-profile`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body.detail)
      ? body.detail.map(item => `${item.loc.slice(1).join('.')}: ${item.msg}`).join('; ')
      : body.detail;
    throw new Error(detail || 'Could not save the profile. Please retry.');
  }
  return res.json();
}
