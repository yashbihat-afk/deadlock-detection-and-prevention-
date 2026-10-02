const scenarios = {
  safe: {
    available: [3, 3, 2],
    allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
    request: [[7, 4, 3], [1, 2, 2], [6, 0, 0], [0, 1, 1], [4, 3, 1]],
    mode: 'detect'
  },
  deadlock: {
    available: [0, 0],
    allocation: [[1, 0], [0, 1]],
    request: [[0, 1], [1, 0]],
    mode: 'detect'
  },
  prevention: {
    available: [3, 2, 2],
    allocation: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
    request: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
    mode: 'prevent'
  }
};

let state = copyScenario('safe');
let activeMode = 'detect';
let preventionRequest = [1, 0, 1];
let toastTimer;

function copyScenario(name) {
  const item = scenarios[name];
  return { available: [...item.available], allocation: item.allocation.map(row => [...row]), request: item.request.map(row => [...row]) };
}
function resourceName(index) { return String.fromCharCode(65 + index); }
function processName(index) { return `P${index}`; }
function intValue(value) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? Math.max(0, Math.min(999, parsed)) : 0; }
function matrixValue(matrix, row, col) { return intValue(matrix[row]?.[col] ?? 0); }

const $ = id => document.getElementById(id);
const allocationTable = $('allocation-table');
const requestTable = $('request-table');

function render() {
  const processCount = state.allocation.length;
  const resourceCount = state.available.length;
  $('process-count').textContent = String(processCount).padStart(2, '0');
  $('resource-count').textContent = String(resourceCount).padStart(2, '0');
  renderMatrix(allocationTable, state.allocation, 'allocation');
  renderMatrix(requestTable, state.request, 'request');
  $('available-fields').innerHTML = state.available.map((value, col) => `
    <label class="available-item"><span>${resourceName(col)}</span><input class="available-input" type="number" min="0" max="999" step="1" value="${value}" aria-label="Available ${resourceName(col)}" data-col="${col}"></label>`).join('');
  $('available-fields').querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    state.available[Number(input.dataset.col)] = intValue(input.value); input.value = state.available[Number(input.dataset.col)]; markEdited();
  }));
  renderProcessSelectors();
  renderRequestInputs();
}

function renderMatrix(table, matrix, kind) {
  const resources = state.available.length;
  let html = `<thead><tr><th>PID</th>${Array.from({ length: resources }, (_, col) => `<th>${resourceName(col)}</th>`).join('')}</tr></thead><tbody>`;
  matrix.forEach((row, rowIndex) => {
    html += `<tr><td>${processName(rowIndex)}</td>${Array.from({ length: resources }, (_, col) => `<td><input class="matrix-input" type="number" min="0" max="999" step="1" value="${matrixValue(matrix, rowIndex, col)}" aria-label="${kind} ${processName(rowIndex)} ${resourceName(col)}" data-row="${rowIndex}" data-col="${col}"></td>`).join('')}</tr>`;
  });
  table.innerHTML = `${html}</tbody>`;
  table.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    const row = Number(input.dataset.row), col = Number(input.dataset.col);
    state[kind][row][col] = intValue(input.value); input.value = state[kind][row][col]; markEdited();
  }));
}

function renderProcessSelectors() {
  const select = $('request-process');
  const previous = Number(select.value || 0);
  select.innerHTML = state.allocation.map((_, index) => `<option value="${index}">${processName(index)}</option>`).join('');
  select.value = String(Math.min(previous, state.allocation.length - 1));
}

function renderRequestInputs() {
  const count = state.available.length;
  preventionRequest = Array.from({ length: count }, (_, index) => intValue(preventionRequest[index] ?? 0));
  $('request-inputs').innerHTML = preventionRequest.map((value, index) => `<label><input class="request-input" type="number" min="0" max="999" step="1" value="${value}" aria-label="Request ${resourceName(index)}" data-col="${index}"></label>`).join('');
  $('request-inputs').querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    const col = Number(input.dataset.col); preventionRequest[col] = intValue(input.value); input.value = preventionRequest[col];
  }));
}

function setMode(mode) {
  activeMode = mode;
  $('tab-detect').classList.toggle('selected', mode === 'detect');
  $('tab-prevent').classList.toggle('selected', mode === 'prevent');
  $('tab-detect').setAttribute('aria-selected', String(mode === 'detect'));
  $('tab-prevent').setAttribute('aria-selected', String(mode === 'prevent'));
  $('detect-controls').classList.toggle('hidden', mode !== 'detect');
  $('prevention-controls').classList.toggle('hidden', mode !== 'prevent');
  setStatus('READY TO CHECK', mode === 'detect' ? 'Run detection to inspect the state' : 'No-hold-and-wait policy is active', false);
  clearResult();
}

function setStatus(title, foot, warning) {
  $('state-label').textContent = title;
  $('state-foot').textContent = foot;
  $('status-mark').textContent = warning ? '!' : '✓';
  document.querySelector('.state-card').classList.toggle('warning', Boolean(warning));
}

function markEdited() {
  setStatus('STATE MODIFIED', 'Run the algorithm to update the result', false);
}

function clearResult() {
  $('result-panel').className = 'result-panel';
  $('result-icon').textContent = '◎';
  $('result-overline').textContent = 'ANALYSIS OUTPUT';
  $('result-title').textContent = 'Ready when you are';
  $('result-copy').textContent = activeMode === 'detect' ? 'Run the detector to trace how the system can complete.' : 'Submit a resource bundle to apply the prevention policy.';
  $('result-detail').innerHTML = '<span class="detail-placeholder">Your execution trace will appear here.</span>';
}

function showToast(message) {
  const toast = $('toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
}

function matrixText(matrix) { return matrix.map(row => row.map(intValue).join(',')).join(';'); }
function apiUrl(route, fields) {
  const params = new URLSearchParams();
  params.set('available', state.available.join(','));
  params.set('allocation', matrixText(state.allocation));
  if (state.request.length) params.set('request', matrixText(state.request));
  Object.entries(fields || {}).forEach(([key, value]) => params.set(key, String(value)));
  return `${route}?${params.toString()}`;
}

async function requestApi(route, fields = {}) {
  const response = await fetch(apiUrl(route, fields), { headers: { Accept: 'application/json' } });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || `Server returned ${response.status}`);
  return data;
}

function renderDetection(data) {
  const deadlocked = data.deadlocked || [];
  const safe = deadlocked.length === 0;
  $('result-panel').className = `result-panel ${safe ? 'success' : 'danger'}`;
  $('result-icon').textContent = safe ? '✓' : '!';
  $('result-overline').textContent = safe ? 'SAFE STATE · DETECTION COMPLETE' : 'DEADLOCK FOUND · DETECTION COMPLETE';
  $('result-title').textContent = safe ? 'Every process can finish.' : `${deadlocked.length} process${deadlocked.length === 1 ? '' : 'es'} cannot proceed.`;
  $('result-copy').textContent = safe ? 'The available instances are enough to let each process complete in sequence.' : 'These processes are left waiting after no remaining request can be satisfied.';
  const detail = $('result-detail');
  if (!safe) {
    const completed = data.safeSequence || [];
    detail.innerHTML = `<span class="sequence-label">COMPLETED</span>${completed.length ? completed.map(pid => `<span class="sequence-node">${processName(pid)}</span>`).join('') : '<span class="detail-placeholder">none</span>'}<span class="sequence-label" style="margin-left:8px">DEADLOCKED</span>${deadlocked.map(pid => `<span class="sequence-node">${processName(pid)}</span>`).join('')}`;
  } else if ((data.steps || []).length) {
    detail.innerHTML = `<span class="sequence-label">SAFE SEQUENCE</span>${data.safeSequence.map(pid => `<span class="sequence-node">${processName(pid)}</span>`).join('')}`;
  } else {
    detail.innerHTML = '<span class="sequence-label">SAFE SEQUENCE</span><span class="sequence-node">No active allocations</span>';
  }
  setStatus(safe ? 'SAFE STATE' : 'DEADLOCK FOUND', safe ? `${(data.safeSequence || []).length} processes can finish` : `${deadlocked.map(processName).join(', ')} are blocked`, !safe);
}

async function runDetection() {
  const button = $('run-detection'); button.disabled = true; button.textContent = 'Analyzing…';
  try { renderDetection(await requestApi('/api/detect')); }
  catch (error) { showToast(error.message); setStatus('BACKEND ERROR', 'Check that the C server is running', true); }
  finally { button.disabled = false; button.innerHTML = 'Run detection <span>↗</span>'; }
}

function renderPreventionResult(status, title, copy, tone, detail) {
  $('result-panel').className = `result-panel ${tone}`;
  $('result-icon').textContent = status === 'granted' ? '✓' : status === 'waiting' ? '…' : '!';
  $('result-overline').textContent = `PREVENTION POLICY · ${status.toUpperCase()}`;
  $('result-title').textContent = title;
  $('result-copy').textContent = copy;
  $('result-detail').innerHTML = detail || '<span class="detail-placeholder">No resource state change.</span>';
}

async function submitBundle() {
  const pid = Number($('request-process').value || 0);
  if (!preventionRequest.some(value => value > 0)) { showToast('Enter at least one resource instance.'); return; }
  const fields = { pid, bundle: preventionRequest.join(',') };
  const button = $('submit-request'); button.disabled = true;
  try {
    const data = await requestApi('/api/prevent', fields);
    if (data.status === 'granted') {
      state.available = data.available; state.allocation = data.allocation;
      render();
      const bundle = preventionRequest.map((value, index) => `${resourceName(index)} × ${value}`).filter((_, index) => preventionRequest[index] > 0).join(' · ');
      renderPreventionResult('granted', `${processName(pid)} received the full bundle.`, `The request was granted atomically: ${bundle}.`, 'success', `<span class="trace-line">New available: <strong>${state.available.map((n, i) => `${resourceName(i)} ${n}`).join(' · ')}</strong></span>`);
      setStatus('BUNDLE GRANTED', `${processName(pid)} now holds resources`, false);
    } else if (data.status === 'waiting') {
      renderPreventionResult('waiting', 'Bundle waits; nothing was allocated.', data.message, '', `<span class="trace-line">Available now: <strong>${state.available.map((n, i) => `${resourceName(i)} ${n}`).join(' · ')}</strong></span>`);
      setStatus('REQUEST WAITING', 'No resources were reserved', false);
    } else {
      renderPreventionResult('rejected', 'Request rejected by policy.', data.message, 'danger');
      setStatus('POLICY REJECTED', 'Release held resources before requesting', true);
    }
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
}

async function releaseBundle() {
  const pid = Number($('request-process').value || 0);
  const button = $('release-resources'); button.disabled = true;
  try {
    const data = await requestApi('/api/release', { pid });
    state.available = data.available; state.allocation = data.allocation; render();
    renderPreventionResult('granted', `${processName(pid)} released its allocation.`, 'All held instances are back in the available pool.', 'success', `<span class="trace-line">Available now: <strong>${state.available.map((n, i) => `${resourceName(i)} ${n}`).join(' · ')}</strong></span>`);
    setStatus('RESOURCES RELEASED', `${processName(pid)} holds no resources`, false);
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
}

function loadScenario(name) {
  state = copyScenario(name);
  preventionRequest = Array.from({ length: state.available.length }, (_, index) => index === 0 || index === 2 ? 1 : 0);
  render(); setMode(scenarios[name].mode);
  if (name === 'deadlock') showToast('Circular wait loaded: P0 ↔ P1');
  if (name === 'prevention') showToast('Prevention sandbox loaded. Try a bundle for P0.');
}

document.querySelectorAll('.mode-tab').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
$('scenario').addEventListener('change', event => loadScenario(event.target.value));
$('reset-state').addEventListener('click', () => loadScenario($('scenario').value));
$('run-detection').addEventListener('click', runDetection);
$('submit-request').addEventListener('click', submitBundle);
$('release-resources').addEventListener('click', releaseBundle);
$('add-process').addEventListener('click', () => {
  if (state.allocation.length >= 12) return showToast('The simulator supports up to 12 processes.');
  state.allocation.push(Array(state.available.length).fill(0)); state.request.push(Array(state.available.length).fill(0)); render(); markEdited();
});
$('remove-process').addEventListener('click', () => {
  if (state.allocation.length <= 1) return showToast('At least one process is required.');
  state.allocation.pop(); state.request.pop(); render(); markEdited();
});
$('add-resource').addEventListener('click', () => {
  if (state.available.length >= 8) return showToast('The simulator supports up to 8 resource types.');
  state.available.push(1); state.allocation.forEach(row => row.push(0)); state.request.forEach(row => row.push(0)); preventionRequest.push(0); render(); markEdited();
});
$('remove-resource').addEventListener('click', () => {
  if (state.available.length <= 1) return showToast('At least one resource type is required.');
  state.available.pop(); state.allocation.forEach(row => row.pop()); state.request.forEach(row => row.pop()); preventionRequest.pop(); render(); markEdited();
});

render();
fetch('/api/health').then(response => response.json()).then(data => {
  $('server-label').textContent = data.status === 'ok' ? 'C SERVER ONLINE' : 'SERVER ERROR';
  if (data.status !== 'ok') document.querySelector('.server-indicator').classList.add('offline');
}).catch(() => {
  $('server-label').textContent = 'SERVER OFFLINE'; document.querySelector('.server-indicator').classList.add('offline');
});
