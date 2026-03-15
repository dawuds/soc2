/* ============================================
   SOC 2 Explorer — Application
   ============================================ */

const state = {
  controls: null,
  domains: null,
  requirements: {},
  evidence: null,
  riskMgmt: {},
  crossRefs: {},
  templates: null,
  route: { view: 'overview' }
};

const cache = new Map();

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function fetchJSON(path) {
  if (cache.has(path)) return cache.get(path);
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(path, data);
    return data;
  } catch (e) {
    console.error(`Failed to load ${path}:`, e);
    return null;
  }
}

function parseHash() {
  const hash = location.hash.slice(1);
  if (!hash) return { view: 'overview' };
  if (hash === 'controls') return { view: 'controls' };
  if (hash.startsWith('control/')) return { view: 'control-detail', slug: hash.slice(8) };
  if (hash === 'requirements') return { view: 'requirements' };
  if (hash === 'risk-management') return { view: 'risk-management' };
  if (hash === 'reference') return { view: 'reference' };
  if (hash.startsWith('search/')) return { view: 'search', query: decodeURIComponent(hash.slice(7)) };
  return { view: 'overview' };
}

function navigate(hash) { location.hash = hash; }

async function loadData() {
  const [controls, domains, evidence, methodology, register, nistMap, isoMap, readiness] = await Promise.all([
    fetchJSON('controls/library.json'),
    fetchJSON('controls/domains.json'),
    fetchJSON('evidence/index.json'),
    fetchJSON('risk-management/methodology.json'),
    fetchJSON('risk-management/risk-register.json'),
    fetchJSON('cross-references/nist-mapping.json'),
    fetchJSON('cross-references/iso27001-mapping.json'),
    fetchJSON('templates/readiness-assessment.json')
  ]);

  state.controls = controls;
  state.domains = domains;
  state.evidence = evidence;
  state.riskMgmt = { methodology, register };
  state.crossRefs = { nist: nistMap, iso: isoMap };
  state.templates = readiness;

  const domainSlugs = ['security', 'availability', 'processing-integrity', 'confidentiality', 'privacy'];
  const reqResults = await Promise.all(domainSlugs.map(d => fetchJSON(`requirements/by-domain/${d}.json`)));
  domainSlugs.forEach((d, i) => { state.requirements[d] = reqResults[i]; });
}

function getAllControls() {
  if (!state.controls) return [];
  const all = [];
  for (const domain of ['security', 'availability', 'processing-integrity', 'confidentiality', 'privacy']) {
    const controls = state.controls[domain] || [];
    controls.forEach(c => all.push({ ...c, domain }));
  }
  return all;
}

function renderDomainBadge(domain) {
  const names = { security: 'Security', availability: 'Availability', 'processing-integrity': 'Processing Integrity', confidentiality: 'Confidentiality', privacy: 'Privacy' };
  const colors = { security: '#2563EB', availability: '#16A34A', 'processing-integrity': '#7C3AED', confidentiality: '#0891B2', privacy: '#DB2777' };
  return `<span class="badge badge-domain" style="--domain-color:${colors[domain]}">${names[domain]}</span>`;
}

function renderTypeBadge(type) {
  const cls = { preventive: 'badge-type-preventive', detective: 'badge-type-detective', corrective: 'badge-type-corrective' };
  return `<span class="badge ${cls[type] || 'badge-category'}">${type}</span>`;
}

function renderOverview() {
  const allControls = getAllControls();
  const domains = state.controls ? state.controls.domains : [];
  return `
    <div class="main">
      <div class="disclaimer">
        <strong>Constructed-Indicative Content.</strong> This explorer contains indicative content based on AICPA Trust Services Criteria.
        It is not a substitute for official AICPA guidance. Engage a qualified CPA firm for SOC 2 examinations.
      </div>
      <div class="stats-banner">
        <div class="stat"><div class="stat-value">${allControls.length}</div><div class="stat-label">Controls</div></div>
        <div class="stat"><div class="stat-value">5</div><div class="stat-label">TSC Categories</div></div>
        <div class="stat"><div class="stat-value">${state.evidence ? state.evidence.evidence.length : 0}</div><div class="stat-label">Evidence Items</div></div>
        <div class="stat"><div class="stat-value">${state.riskMgmt.register ? state.riskMgmt.register.risks.length : 0}</div><div class="stat-label">Risk Items</div></div>
      </div>
      <h2 style="margin-bottom:1rem">Trust Services Categories</h2>
      <div class="control-grid">
        ${domains.map(d => `
          <div class="control-card" onclick="navigate('controls')">
            <div class="control-card-header">${renderDomainBadge(d.slug)}</div>
            <div class="control-card-title">${escHtml(d.name)}</div>
            <div class="control-card-desc">${escHtml(d.description)}</div>
            <div class="control-card-meta">
              <span class="badge badge-category">${(state.controls[d.slug] || []).length} controls</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderControls() {
  const allControls = getAllControls();
  const domainSlugs = ['all', 'security', 'availability', 'processing-integrity', 'confidentiality', 'privacy'];
  const domainNames = { all: 'All', security: 'Security', availability: 'Availability', 'processing-integrity': 'Proc. Integrity', confidentiality: 'Confidentiality', privacy: 'Privacy' };
  let activeDomain = 'all';

  function render(domain) {
    const filtered = domain === 'all' ? allControls : allControls.filter(c => c.domain === domain);
    return `
      <div class="main">
        <h2 style="margin-bottom:1rem">Controls (${filtered.length})</h2>
        <div class="domain-filter">
          ${domainSlugs.map(d => `<button class="domain-pill ${domain === d ? 'active' : ''}" onclick="window._filterDomain('${d}')">${domainNames[d]} (${d === 'all' ? allControls.length : allControls.filter(c => c.domain === d).length})</button>`).join('')}
        </div>
        <div class="control-grid">
          ${filtered.map(c => `
            <div class="control-card" onclick="navigate('control/${c.slug}')">
              <div class="control-card-header">
                <span class="control-id">${escHtml(c.id)}</span>
                ${renderDomainBadge(c.domain)}
              </div>
              <div class="control-card-title">${escHtml(c.name)}</div>
              <div class="control-card-desc">${escHtml(c.description)}</div>
              <div class="control-card-meta">
                ${c.series ? `<span class="badge badge-category">${escHtml(c.seriesName)}</span>` : ''}
                ${renderTypeBadge(c.type)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  window._filterDomain = function(d) { activeDomain = d; document.getElementById('app').innerHTML = render(d); };
  return render(activeDomain);
}

function renderControlDetail(slug) {
  const allControls = getAllControls();
  const ctrl = allControls.find(c => c.slug === slug);
  if (!ctrl) return '<div class="main"><div class="error-state"><h2>Control not found</h2></div></div>';
  const evidenceItems = state.evidence ? state.evidence.evidence.filter(e => e.controlRef === ctrl.id) : [];

  return `
    <div class="main">
      <nav class="breadcrumbs">
        <a href="#controls">Controls</a><span class="sep">›</span>
        <span class="current">${escHtml(ctrl.id)} ${escHtml(ctrl.name)}</span>
      </nav>
      <div class="control-detail">
        <div class="control-detail-header">
          <div class="control-detail-id-row">
            <span class="control-id" style="font-size:1rem">${escHtml(ctrl.id)}</span>
            ${renderDomainBadge(ctrl.domain)}
            ${renderTypeBadge(ctrl.type)}
            ${ctrl.series ? `<span class="badge badge-category">${escHtml(ctrl.seriesName)}</span>` : ''}
          </div>
          <h2 class="control-detail-title">${escHtml(ctrl.name)}</h2>
          <p class="control-detail-desc">${escHtml(ctrl.description)}</p>
        </div>
        ${ctrl.keyActivities ? `
          <div class="detail-section">
            <h3 class="detail-section-title">Key Activities</h3>
            <ul class="activity-list">${ctrl.keyActivities.map(a => `<li>${escHtml(a)}</li>`).join('')}</ul>
          </div>` : ''}
        ${evidenceItems.length > 0 ? `
          <div class="detail-section">
            <h3 class="detail-section-title">Evidence Items</h3>
            ${evidenceItems.map(e => `
              <div class="evidence-item">
                <div class="evidence-item-header">
                  <span class="evidence-id">${escHtml(e.id)}</span>
                  <span class="evidence-item-name">${escHtml(e.name)}</span>
                </div>
                <p class="evidence-item-desc">${escHtml(e.description)}</p>
                <div class="evidence-item-meta">
                  <span><strong>Format:</strong> ${escHtml(e.format)}</span>
                  <span><strong>Frequency:</strong> ${escHtml(e.frequency)}</span>
                  <span><strong>Owner:</strong> ${escHtml(e.owner)}</span>
                </div>
              </div>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
}

function renderRequirements() {
  const domains = ['security', 'availability', 'processing-integrity', 'confidentiality', 'privacy'];
  const names = { security: 'Security', availability: 'Availability', 'processing-integrity': 'Processing Integrity', confidentiality: 'Confidentiality', privacy: 'Privacy' };
  return `
    <div class="main">
      <h2 style="margin-bottom:1rem">Requirements by Category</h2>
      ${domains.map(d => {
        const req = state.requirements[d];
        if (!req) return '';
        return `
          <div class="detail-section">
            <h3 class="detail-section-title">${names[d]} (${req.requirements.length} requirements)</h3>
            ${req.requirements.map(r => `
              <div class="artifact-card">
                <div class="artifact-card-header">
                  <span class="artifact-card-name">${escHtml(r.id)}</span>
                  <span class="badge ${r.priority === 'critical' ? 'badge-mandatory' : 'badge-type-corrective'}">${r.priority}</span>
                </div>
                <p class="artifact-card-desc">${escHtml(r.requirement)}</p>
                <div class="artifact-card-meta">
                  <span class="meta-item"><strong>Criteria:</strong> ${escHtml(r.controlRef)}</span>
                  <span class="meta-item"><strong>Owner:</strong> ${escHtml(r.owner)}</span>
                </div>
              </div>`).join('')}
          </div>`;
      }).join('')}
    </div>`;
}

function renderRiskManagement() {
  const meth = state.riskMgmt.methodology;
  const reg = state.riskMgmt.register;
  return `
    <div class="main">
      <h2 style="margin-bottom:1rem">Risk Management</h2>
      ${meth ? `
        <div class="detail-section">
          <h3 class="detail-section-title">Methodology</h3>
          <p style="color:var(--text-secondary);margin-bottom:1rem">${escHtml(meth.description)}</p>
          <div class="requirements-grid">
            ${meth.riskRating.bands.map(b => `
              <div class="requirement-block" style="background:${b.color}15;border-color:${b.color}">
                <div class="requirement-block-label" style="color:${b.color}">${b.label} (${b.range[0]}-${b.range[1]})</div>
                <p style="font-size:var(--font-size-sm);color:var(--text-secondary)">${escHtml(b.action)}</p>
              </div>`).join('')}
          </div>
        </div>` : ''}
      ${reg ? `
        <div class="detail-section">
          <h3 class="detail-section-title">Risk Register (${reg.risks.length} risks)</h3>
          ${reg.risks.map(r => {
            const color = r.inherentRisk >= 16 ? '#ef4444' : r.inherentRisk >= 10 ? '#f97316' : r.inherentRisk >= 5 ? '#f59e0b' : '#22c55e';
            const resColor = r.residualRisk >= 16 ? '#ef4444' : r.residualRisk >= 10 ? '#f97316' : r.residualRisk >= 5 ? '#f59e0b' : '#22c55e';
            return `
              <div class="artifact-card">
                <div class="artifact-card-header">
                  <span class="artifact-card-name">${escHtml(r.id)} — ${escHtml(r.title)}</span>
                  <div style="display:flex;gap:0.5rem">
                    <span class="risk-score-badge" style="background:${color}20;color:${color}">Inherent: ${r.inherentRisk}</span>
                    <span class="risk-score-badge" style="background:${resColor}20;color:${resColor}">Residual: ${r.residualRisk}</span>
                  </div>
                </div>
                <p class="artifact-card-desc">${escHtml(r.description)}</p>
                <div class="artifact-card-meta">
                  <span class="meta-item"><strong>Category:</strong> ${escHtml(r.category)}</span>
                  <span class="meta-item"><strong>Criteria:</strong> ${escHtml(r.criteriaRef)}</span>
                  <span class="meta-item"><strong>Owner:</strong> ${escHtml(r.owner)}</span>
                </div>
              </div>`;
          }).join('')}
        </div>` : ''}
    </div>`;
}

function renderReference() {
  return `
    <div class="main">
      <h2 style="margin-bottom:1rem">Cross-References</h2>
      ${state.crossRefs.nist ? `
        <div class="detail-section">
          <h3 class="detail-section-title">SOC 2 → NIST CSF 2.0 (${state.crossRefs.nist.mappings.length} mappings)</h3>
          <div class="fw-mappings">
            ${state.crossRefs.nist.mappings.map(m => `
              <div class="xref-card">
                <span class="xref-source">${escHtml(m.soc2Criteria)}</span>
                <span class="badge badge-category">${escHtml(m.relationship)}</span>
                <span class="xref-target">${escHtml(m.nistFunction)} / ${escHtml(m.nistCategory)}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
      ${state.crossRefs.iso ? `
        <div class="detail-section">
          <h3 class="detail-section-title">SOC 2 → ISO 27001 (${state.crossRefs.iso.mappings.length} mappings)</h3>
          <div class="fw-mappings">
            ${state.crossRefs.iso.mappings.map(m => `
              <div class="xref-card">
                <span class="xref-source">${escHtml(m.soc2Criteria)}</span>
                <span class="badge badge-category">${escHtml(m.relationship)}</span>
                <span class="xref-target">${escHtml(m.isoControl)}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
      ${state.templates ? `
        <div class="detail-section">
          <h3 class="detail-section-title">Readiness Assessment Template</h3>
          <p style="color:var(--text-secondary);margin-bottom:1rem">${escHtml(state.templates.description)}</p>
          ${state.templates.categories.map(cat => `
            <div style="margin-bottom:1rem">
              <h4 style="font-size:var(--font-size-base);font-weight:600;margin-bottom:0.5rem">${escHtml(cat.name)}</h4>
              <ul class="activity-list">${cat.items.map(item => `<li>${escHtml(item.item)}</li>`).join('')}</ul>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
}

function renderSearch(query) {
  const allControls = getAllControls();
  const q = query.toLowerCase();
  const results = allControls.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  return `
    <div class="main">
      <p class="search-results-header">${results.length} result${results.length !== 1 ? 's' : ''} for "${escHtml(query)}"</p>
      <div class="control-grid">
        ${results.map(c => `
          <div class="control-card" onclick="navigate('control/${c.slug}')">
            <div class="control-card-header"><span class="control-id">${escHtml(c.id)}</span>${renderDomainBadge(c.domain)}</div>
            <div class="control-card-title">${escHtml(c.name)}</div>
            <div class="control-card-desc">${escHtml(c.description)}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function exportToCSV() {
  const allControls = getAllControls();
  const rows = [['ID', 'Name', 'Category', 'Series', 'Type', 'Description']];
  allControls.forEach(c => rows.push([c.id, c.name, c.domain, c.seriesName || '', c.type, c.description.replace(/"/g, '""')]));
  const csv = rows.map(r => r.map(f => `"${f}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'soc2-controls.csv';
  a.click();
}

async function render() {
  const app = document.getElementById('app');
  const route = parseHash();
  state.route = route;
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === route.view));
  switch (route.view) {
    case 'overview': app.innerHTML = renderOverview(); break;
    case 'controls': app.innerHTML = renderControls(); break;
    case 'control-detail': app.innerHTML = renderControlDetail(route.slug); break;
    case 'requirements': app.innerHTML = renderRequirements(); break;
    case 'risk-management': app.innerHTML = renderRiskManagement(); break;
    case 'reference': app.innerHTML = renderReference(); break;
    case 'search': app.innerHTML = renderSearch(route.query); break;
    default: app.innerHTML = renderOverview();
  }
}

async function init() {
  await loadData();
  render();
  window.addEventListener('hashchange', render);
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && searchInput.value.trim()) navigate('search/' + encodeURIComponent(searchInput.value.trim()));
    });
  }
}

init();
