// NirmanVaani Frontend Application Logic
let currentView = 'citizen';
let allDistricts = [];
let allReports = [];
let rankedProjects = [];
let leafletMap = null;
let mapMarkers = [];
let sectorChart = null;
let languageChart = null;
let currentModalProjectId = null;
let speechRecognizer = null;
let isRecording = false;

// Regional presets for 1-click testing
const PRESETS = [
  {
    lang: 'Hindi',
    district: 'BR_MUZ',
    text: 'हमारे कांटी ब्लॉक के पास एसएच-74 को जोड़ने वाली पुलिया पिछले हफ्ते भारी बारिश में टूट गई है। 3 पंचायतों की एम्बुलेंस नहीं आ पा रही है। मरीज रास्ते में दम तोड़ रहे हैं। कृपया तुरंत मरम्मत करवाएं।'
  },
  {
    lang: 'Bengali',
    district: 'WB_PUR',
    text: 'আমাদের বলরামপুর ব্লকে নলবাহিত পানীয় জল প্রকল্প প্রায় ৬ মাস ধরে বন্ধ। ভূগর্ভস্থ জলে আর্সেনিক মাত্রাতিরিক্ত। স্কুলের বাচ্চাদের পেটের রোগ হচ্ছে।'
  },
  {
    lang: 'Tamil',
    district: 'TN_MAD',
    text: 'மதுரை வாடிப்பட்டி ஆரம்ப சுகாதார நிலையத்தில் கடந்த 4 நாட்களாக மின்சாரம் இல்லை. அவசர சிகிச்சைக்கான ஜெனரேட்டர் பழுதடைந்துள்ளது. பிரசவ வார்டில் பெண்கள் அவதிப்படுகின்றனர்.'
  },
  {
    lang: 'Bhojpuri',
    district: 'BR_SAR',
    text: 'सारण जिला के परसा में प्राथमिक विद्यालय के छत से प्लास्टर गिर रहा बा। बरसात में कमरा में पानी भर जाला। 150 बच्चा लोगन के जान के खतरा बा।'
  },
  {
    lang: 'Marathi',
    district: 'MH_GAD',
    text: 'गड़चिरोलीच्या भामरागड तालुक्यात गेल्या २ महिन्यांपासून भारतनेटचे इंटरनेट पूर्णपणे बंद आहे. ग्रामपंचायत आणि अंगणवाडीचे काम ठप्प झाले आहे.'
  }
];

const SECTOR_COLORS = {
  roads: '#f59e0b',
  water: '#0ea5e9',
  health: '#f43f5e',
  power: '#eab308',
  education: '#a855f7',
  digital_access: '#10b981',
  sanitation: '#06b6d4'
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  
  initSpeechRecognition();
  await loadDistricts();
  await loadReports();
  await fetchAnalytics();
  initMap();
  await fetchRankedProjects();
  renderCitizenTracker();
  
  // Set saved API key if present
  const savedKey = localStorage.getItem('nirmanvaani_gemini_key');
  if (savedKey) {
    document.getElementById('geminiApiKeyInput').value = savedKey;
  }
});

// Role-based Access & Policymaker Auth
let policymakerToken = sessionStorage.getItem('nirmanvaani_admin_token') || null;

function openPolicymakerAuthModal() {
  const modal = document.getElementById('policymakerAuthModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('authErrorMsg')?.classList.add('hidden');
    const input = document.getElementById('policymakerPasscodeInput');
    if (input) input.value = '';
  }
}

function closePolicymakerAuthModal() {
  document.getElementById('policymakerAuthModal')?.classList.add('hidden');
}

async function submitPolicymakerAuth() {
  const input = document.getElementById('policymakerPasscodeInput');
  const passcode = input ? input.value.trim() : '';
  const errorMsg = document.getElementById('authErrorMsg');
  
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    if (res.ok) {
      const data = await res.json();
      policymakerToken = data.token;
      sessionStorage.setItem('nirmanvaani_admin_token', policymakerToken);
      closePolicymakerAuthModal();
      actuallySwitchToPolicymaker();
    } else {
      if (errorMsg) errorMsg.classList.remove('hidden');
    }
  } catch (err) {
    if (errorMsg) errorMsg.classList.remove('hidden');
  }
}

// View Switcher
function switchView(view) {
  if (view === 'policymaker' && !policymakerToken) {
    openPolicymakerAuthModal();
    return;
  }
  if (view === 'policymaker') {
    actuallySwitchToPolicymaker();
  } else {
    actuallySwitchToCitizen();
  }
}

function actuallySwitchToCitizen() {
  currentView = 'citizen';
  const citizenView = document.getElementById('citizenView');
  const policymakerView = document.getElementById('policymakerView');
  const citizenBtn = document.getElementById('tabCitizenBtn');
  const policymakerBtn = document.getElementById('tabPolicymakerBtn');

  citizenView.classList.remove('hidden');
  policymakerView.classList.add('hidden');
  citizenBtn.className = 'px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 bg-amber-500 text-slate-950 shadow';
  policymakerBtn.className = 'px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 text-slate-300 hover:text-white';
  if (window.lucide) lucide.createIcons();
}

function actuallySwitchToPolicymaker() {
  currentView = 'policymaker';
  const citizenView = document.getElementById('citizenView');
  const policymakerView = document.getElementById('policymakerView');
  const citizenBtn = document.getElementById('tabCitizenBtn');
  const policymakerBtn = document.getElementById('tabPolicymakerBtn');

  citizenView.classList.add('hidden');
  policymakerView.classList.remove('hidden');
  policymakerBtn.className = 'px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 bg-amber-500 text-slate-950 shadow';
  citizenBtn.className = 'px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 text-slate-300 hover:text-white';

  setTimeout(() => {
    if (leafletMap) leafletMap.invalidateSize();
    renderCharts();
  }, 200);
  if (window.lucide) lucide.createIcons();
}

// Load Districts
async function loadDistricts() {
  try {
    const res = await fetch('/api/districts');
    allDistricts = await res.json();
    
    const select = document.getElementById('inputDistrictSelect');
    allDistricts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.state})`;
      select.appendChild(opt);
    });

    document.getElementById('tickerDistrictsCount').textContent = allDistricts.length;
  } catch (err) {
    console.error('Error loading districts:', err);
  }
}

// Load Reports
async function loadReports() {
  try {
    const res = await fetch('/api/reports');
    allReports = await res.json();
    document.getElementById('tickerReportsCount').textContent = allReports.length;
  } catch (err) {
    console.error('Error loading reports:', err);
  }
}

// 1-Click Preset Loader
function loadPreset(idx) {
  const p = PRESETS[idx];
  if (!p) return;
  
  document.getElementById('complaintInput').value = p.text;
  document.getElementById('inputLanguageSelect').value = p.lang;
  document.getElementById('inputDistrictSelect').value = p.district;
  
  // Trigger instant structuring preview
  previewGeminiStructuring();
}

// Web Speech API Integration
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log('Web Speech API not natively supported in this browser; will simulate speech on mic toggle.');
    return;
  }

  speechRecognizer = new SpeechRecognition();
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = 'hi-IN'; // Default to Indian Hindi / bilingual

  speechRecognizer.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    const input = document.getElementById('complaintInput');
    input.value = (input.value + ' ' + transcript).trim();
  };

  speechRecognizer.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    stopRecordingUI();
  };

  speechRecognizer.onend = () => {
    stopRecordingUI();
  };
}

function toggleVoiceRecording() {
  isRecording = !isRecording;
  const btn = document.getElementById('voiceRecordBtn');
  const micText = document.getElementById('micStatusText');
  const wave = document.getElementById('recordingWave');

  if (isRecording) {
    btn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-sm bg-rose-600 text-white animate-pulse';
    micText.textContent = 'Listening... Click to Stop';
    wave.classList.remove('hidden');

    if (speechRecognizer) {
      try {
        speechRecognizer.start();
      } catch (e) {
        console.log('Speech recognition start note:', e);
      }
    } else {
      // Fallback: If browser restricts mic access without HTTPS, load sample spoken audio transcript
      setTimeout(() => {
        if (isRecording) {
          const sample = 'हमारे मुजफ्फरपुर के कांटी में बाढ़ से सड़क कट गई है, गाड़ियां बंद हैं';
          document.getElementById('complaintInput').value = sample;
        }
      }, 1500);
    }
  } else {
    stopRecordingUI();
    if (speechRecognizer) {
      try {
        speechRecognizer.stop();
      } catch (e) {}
    }
    // Auto preview once stopped
    if (document.getElementById('complaintInput').value.trim().length > 5) {
      previewGeminiStructuring();
    }
  }
}

function stopRecordingUI() {
  isRecording = false;
  const btn = document.getElementById('voiceRecordBtn');
  const micText = document.getElementById('micStatusText');
  const wave = document.getElementById('recordingWave');
  btn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-sm bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100';
  micText.textContent = 'Speak Complaint (Voice Input)';
  wave.classList.add('hidden');
}

// Preview Gemini Structuring
async function previewGeminiStructuring() {
  const text = document.getElementById('complaintInput').value.trim();
  if (!text) {
    alert('Please enter or speak a complaint first.');
    return;
  }

  const badge = document.getElementById('aiStatusBadge');
  badge.textContent = 'Analyzing with Gemini...';
  badge.className = 'text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-400/30 animate-pulse';

  const apiKey = localStorage.getItem('nirmanvaani_gemini_key') || null;

  try {
    const res = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, api_key: apiKey })
    });
    const data = await res.json();
    renderAIStructuringCard(data);
    badge.textContent = 'Structured via Gemini';
    badge.className = 'text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-400/30';
  } catch (err) {
    console.error('Error previewing Gemini structuring:', err);
    badge.textContent = 'Engine Ready';
  }
}

function renderAIStructuringCard(data) {
  document.getElementById('aiOutputPlaceholder').classList.add('hidden');
  const card = document.getElementById('aiOutputCard');
  card.classList.remove('hidden');

  const lang = data.detected_language || data.original_language || 'Auto';
  document.getElementById('aiLangBadge').textContent = lang;
  document.getElementById('aiTranslation').textContent = `"${data.translated_text || ''}"`;
  
  const sec = data.sector || 'roads';
  const secBadge = document.getElementById('aiSectorBadge');
  secBadge.textContent = sec.replace('_', ' ');
  secBadge.style.backgroundColor = `${SECTOR_COLORS[sec] || '#f59e0b'}22`;
  secBadge.style.color = SECTOR_COLORS[sec] || '#f59e0b';
  secBadge.style.borderColor = `${SECTOR_COLORS[sec] || '#f59e0b'}55`;

  const urgBadge = document.getElementById('aiUrgencyBadge');
  urgBadge.textContent = `${data.urgency_score || 3} / 5 (${data.urgency_reason || 'Urgent'})`;

  const loc = data.extracted_location || {};
  const districtName = loc.district || data.district_name || 'District';
  const stateName = loc.state || data.state || 'State';
  const blockName = loc.block || data.block || 'Local';
  const landmarkName = loc.landmark || data.landmark || 'Locality';
  document.getElementById('aiLocationText').textContent = `${districtName}, ${stateName} • Block: ${blockName} • ${landmarkName}`;
  document.getElementById('aiActionText').textContent = data.suggested_action || 'Administrative intervention recommended';
  
  const badge = document.getElementById('aiStatusBadge');
  if (badge) {
    badge.textContent = 'Structured via Gemini';
    badge.className = 'text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-400/30';
  }

  if (window.lucide) lucide.createIcons();
}

// Submit Complaint
async function submitComplaint() {
  const text = document.getElementById('complaintInput').value.trim();
  if (!text || text.length < 5) {
    alert('Please enter a valid complaint description (minimum 5 characters).');
    return;
  }
  if (text.length > 1500) {
    alert('Complaint text cannot exceed 1500 characters.');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="animate-spin mr-2">⟳</span> Structuring & Ingesting...';

  const language = document.getElementById('inputLanguageSelect').value;
  const district_id = document.getElementById('inputDistrictSelect').value || null;
  const apiKey = localStorage.getItem('nirmanvaani_gemini_key') || null;

  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
        district_id,
        voice_recorded: isRecording,
        api_key: apiKey
      })
    });

    if (!res.ok) throw new Error('Submission failed');
    const newReport = await res.json();

    // Show success & structured result
    renderAIStructuringCard(newReport);
    const successBanner = document.getElementById('submissionSuccessBanner');
    successBanner.classList.remove('hidden');
    document.getElementById('generatedTicketId').textContent = newReport.id;

    // Refresh data
    await loadReports();
    await fetchAnalytics();
    await fetchRankedProjects();
    renderCitizenTracker();
    updateMapPins();

    // Reset input
    document.getElementById('complaintInput').value = '';
    alert(`Grievance successfully submitted! Ticket ID: ${newReport.id}\nRanked on Policymaker Dashboard.`);
  } catch (err) {
    console.error('Error submitting complaint:', err);
    alert('Failed to submit report. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4 mr-2"></i><span>Analyze & Submit to Platform</span>';
    if (window.lucide) lucide.createIcons();
  }
}

// Persistent Device Fingerprinting for Endorsements
function getDeviceId() {
  let id = localStorage.getItem('nirmanvaani_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('nirmanvaani_device_id', id);
  }
  return id;
}

// Community Endorsement ("Me Too") with Per-Device Deduplication
async function endorseReport(reportId, evt) {
  if (evt) evt.stopPropagation();
  try {
    const res = await fetch(`/api/reports/${reportId}/endorse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getDeviceId()
      }
    });
    const data = await res.json();
    if (res.status === 409 || data.already_endorsed) {
      alert('You have already endorsed this community grievance (+1). Duplicate endorsements are prevented to maintain signal integrity.');
      return;
    }
    if (data.success) {
      const el = document.getElementById(`endorse-count-${reportId}`);
      if (el) el.textContent = data.endorsements;
      await fetchRankedProjects();
    }
  } catch (err) {
    console.error('Error endorsing report:', err);
  }
}

// Render Citizen Tracker List
function renderCitizenTracker() {
  const container = document.getElementById('citizenReportsList');
  const search = document.getElementById('trackerSearchInput')?.value?.toLowerCase() || '';
  const sector = document.getElementById('trackerSectorSelect')?.value || 'all';

  let filtered = allReports.filter(r => {
    const matchesSearch = !search || 
      r.id.toLowerCase().includes(search) || 
      r.original_text.toLowerCase().includes(search) || 
      r.district_name.toLowerCase().includes(search);
    const matchesSector = sector === 'all' || r.sector === sector;
    return matchesSearch && matchesSector;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="col-span-2 text-center py-8 text-slate-400 text-xs">No matching citizen grievances found.</div>';
    return;
  }

  container.innerHTML = filtered.map(r => {
    const color = SECTOR_COLORS[r.sector] || '#64748b';
    const statusBadges = {
      SUBMITTED: '<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">1/4 Submitted</span>',
      VERIFIED: '<span class="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-bold">2/4 AI Verified</span>',
      PRIORITIZED: '<span class="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">3/4 Prioritized in Plan</span>',
      BUDGET_ALLOCATED: '<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">4/4 Budget Approved</span>'
    };

    return `
      <div class="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="font-mono text-xs font-bold text-slate-900">${r.id}</span>
            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style="background-color: ${color}22; color: ${color}; border: 1px solid ${color}44;">
              ${r.sector.replace('_', ' ')}
            </span>
          </div>
          ${statusBadges[r.status] || statusBadges.VERIFIED}
        </div>

        <p class="text-xs text-slate-800 font-medium line-clamp-2">${escapeHtml(r.original_text)}</p>

        ${r.original_language !== 'English' ? `
          <p class="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
            ${escapeHtml(r.translated_text)}
          </p>
        ` : ''}

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <div>
            <strong class="text-slate-700">${r.district_name}</strong>, ${r.state} • <span class="text-amber-600">Urgency: ${r.urgency_score}/5</span>
          </div>
          <button onclick="endorseReport('${r.id}', event)" class="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-lg font-semibold transition border border-slate-200">
            <span>👍 Me Too</span>
            <span id="endorse-count-${r.id}" class="bg-white px-1.5 py-0.2 rounded font-bold text-slate-800 text-[10px]">${r.endorsements_count || 1}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function filterCitizenReports() {
  renderCitizenTracker();
}

// Leaflet GIS Map Initialization
function initMap() {
  const mapElem = document.getElementById('hotspotMap');
  if (!mapElem) return;

  // Center on India
  leafletMap = L.map('hotspotMap').setView([22.9734, 82.6563], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors | NirmanVaani DPI'
  }).addTo(leafletMap);

  updateMapPins();
}

function updateMapPins() {
  if (!leafletMap) return;

  // Clear existing markers
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  // Group projects by district for markers
  const districtGroups = {};
  rankedProjects.forEach(p => {
    if (!districtGroups[p.district_id]) {
      districtGroups[p.district_id] = [];
    }
    districtGroups[p.district_id].push(p);
  });

  allDistricts.forEach(d => {
    const projs = districtGroups[d.id] || [];
    const topProj = projs[0];
    const color = topProj ? (SECTOR_COLORS[topProj.sector] || '#f59e0b') : '#94a3b8';
    const radius = topProj ? Math.max(10, Math.min(24, topProj.score / 4)) : 8;

    const marker = L.circleMarker([d.lat, d.lng], {
      radius: radius,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    }).addTo(leafletMap);

    const popupContent = `
      <div class="space-y-1.5">
        <div class="font-bold text-slate-900 text-sm">${d.name}, ${d.state}</div>
        <div class="text-[11px] text-slate-500">Population: ${d.population.toLocaleString()}</div>
        ${topProj ? `
          <div class="pt-1 border-t border-slate-100">
            <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white" style="background:${color}">
              ${topProj.sector.replace('_', ' ')}
            </span>
            <div class="font-bold text-slate-800 text-xs mt-1">Score: ${topProj.score}/100 (#${topProj.rank})</div>
            <div class="text-[10px] text-slate-600">${topProj.title}</div>
            <button onclick="openEvidenceModal('${topProj.id}')" class="mt-2 w-full py-1 bg-slate-900 text-white rounded text-[10px] font-semibold hover:bg-slate-800">
              View Evidence Dossier
            </button>
          </div>
        ` : '<div class="text-xs text-slate-400">Baseline monitoring</div>'}
      </div>
    `;

    marker.bindPopup(popupContent);
    mapMarkers.push(marker);
  });
}

// Weight Sliders & Live Recalculation
function updateWeights() {
  const w1 = parseInt(document.getElementById('sliderW1').value);
  const w2 = parseInt(document.getElementById('sliderW2').value);
  const w3 = parseInt(document.getElementById('sliderW3').value);

  document.getElementById('w1Display').textContent = `${w1}%`;
  document.getElementById('w2Display').textContent = `${w2}%`;
  document.getElementById('w3Display').textContent = `${w3}%`;

  fetchRankedProjects();
}

// Fetch Ranked Projects
async function fetchRankedProjects() {
  const w1 = parseInt(document.getElementById('sliderW1')?.value || 35) / 100;
  const w2 = parseInt(document.getElementById('sliderW2')?.value || 40) / 100;
  const w3 = parseInt(document.getElementById('sliderW3')?.value || 25) / 100;

  const state = document.getElementById('filterState')?.value || 'all';
  const sector = document.getElementById('filterSector')?.value || 'all';
  const status = document.getElementById('filterStatus')?.value || 'all';

  try {
    const url = `/api/projects?w1=${w1}&w2=${w2}&w3=${w3}&state=${state}&sector=${sector}&status=${status}`;
    const res = await fetch(url);
    rankedProjects = await res.json();
    renderRankedProjects();
    updateMapPins();
  } catch (err) {
    console.error('Error fetching ranked projects:', err);
  }
}

// Render Ranked Projects Cards
function renderRankedProjects() {
  const container = document.getElementById('projectsContainer');
  if (!container) return;

  if (rankedProjects.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-slate-400 text-xs">No projects match the current filter criteria.</div>';
    return;
  }

  container.innerHTML = rankedProjects.map(p => {
    const color = SECTOR_COLORS[p.sector] || '#f59e0b';
    const bd = p.score_breakdown || {};
    const isApproved = p.status === 'BUDGET_APPROVED';

    return `
      <div class="p-5 rounded-2xl border ${isApproved ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-white hover:border-amber-300'} transition shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center space-x-3">
            <span class="w-8 h-8 rounded-xl ${p.rank <= 3 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-700 font-bold'} flex items-center justify-center text-sm shadow-sm">
              #${p.rank}
            </span>
            <div>
              <h4 class="font-bold text-slate-900 text-base leading-tight">${p.title}</h4>
              <div class="text-xs text-slate-500 mt-0.5">
                <strong class="text-slate-700">${p.district_name}</strong>, ${p.state} • Scheme: <span class="text-amber-700 font-medium">${p.suggested_scheme}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold uppercase px-2.5 py-1 rounded-lg" style="background-color: ${color}22; color: ${color}; border: 1px solid ${color}44;">
              ${p.sector.replace('_', ' ')}
            </span>
            ${isApproved 
              ? '<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1"><i data-lucide="check-check" class="w-3.5 h-3.5"></i><span>Budget Approved</span></span>'
              : '<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg">Pending Review</span>'
            }
          </div>
        </div>

        <!-- Composite Score & Dynamic Breakdown Bar -->
        <div class="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-slate-600">Explainable Priority Score:</span>
            <span class="text-slate-900 font-black text-sm">${p.score} <span class="text-slate-400 font-normal text-xs">/ 100</span></span>
          </div>

          <!-- Progress bar with 3 color segments -->
          <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
            <div style="width: ${bd.demand_component || 30}%" class="bg-amber-500 h-full" title="Demand Component: ${bd.demand_component}"></div>
            <div style="width: ${bd.infra_gap_component || 40}%" class="bg-sky-500 h-full" title="Infra Gap Component: ${bd.infra_gap_component}"></div>
            <div style="width: ${bd.population_component || 25}%" class="bg-emerald-500 h-full" title="Population Reach: ${bd.population_component}"></div>
          </div>

          <div class="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span class="flex items-center space-x-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span>Demand: ${bd.demand_component || '--'}</span></span>
            <span class="flex items-center space-x-1"><span class="w-2 h-2 rounded-full bg-sky-500"></span><span>Deficit Gap: ${bd.infra_gap_component || '--'}</span></span>
            <span class="flex items-center space-x-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>Pop Reach: ${bd.population_component || '--'}</span></span>
          </div>
        </div>

        <!-- Metrics & Actions Footer -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          <div class="flex items-center space-x-4 text-slate-600">
            <div>Citizens Impacted: <strong class="text-slate-900">${p.citizens_benefited.toLocaleString()}</strong></div>
            <div>Feedback Reports: <strong class="text-slate-900">${p.demand_count}</strong></div>
            <div>Estimated Budget: <strong class="text-emerald-700 font-bold">${p.estimated_budget}</strong></div>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="openEvidenceModal('${p.id}')" class="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition flex items-center space-x-1">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
              <span>Evidence Dossier</span>
            </button>
            ${!isApproved ? `
              <button onclick="quickApproveProject('${p.id}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center space-x-1 shadow-sm">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                <span>Approve Budget</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Quick Approve (Role Protected)
async function quickApproveProject(projId) {
  if (!policymakerToken) {
    openPolicymakerAuthModal();
    return;
  }
  try {
    const res = await fetch(`/api/projects/${projId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${policymakerToken}`,
        'X-Policymaker-Auth': policymakerToken
      }
    });
    if (res.status === 401 || res.status === 403) {
      alert('Authentication error: Administrator privileges required to approve budget.');
      sessionStorage.removeItem('nirmanvaani_admin_token');
      policymakerToken = null;
      openPolicymakerAuthModal();
      return;
    }
    const data = await res.json();
    if (data.success) {
      await fetchRankedProjects();
      await loadReports();
      renderCitizenTracker();
      alert(`DPI Budget successfully approved for ${projId}!`);
    }
  } catch (err) {
    console.error('Error approving project:', err);
  }
}

// Evidence Dossier Modal
function openEvidenceModal(projId) {
  const p = rankedProjects.find(item => item.id === projId);
  if (!p) return;

  currentModalProjectId = projId;
  const district = allDistricts.find(d => d.id === p.district_id) || {};
  const bd = p.score_breakdown || {};

  document.getElementById('modalProjectTitle').textContent = `${p.title} (#${p.rank})`;
  document.getElementById('modalTotalScore').textContent = `Score: ${p.score} / 100`;
  document.getElementById('modalDemandComponent').textContent = `${bd.demand_component || '--'} (Norm: ${bd.normalized_demand})`;
  document.getElementById('modalGapComponent').textContent = `${bd.infra_gap_component || '--'} (Norm: ${bd.normalized_infra_gap})`;
  document.getElementById('modalPopComponent').textContent = `${bd.population_component || '--'} (Norm: ${bd.normalized_population})`;

  document.getElementById('modalBudget').textContent = p.estimated_budget;
  document.getElementById('modalScheme').textContent = p.suggested_scheme;

  // Baseline data rendering
  const metricsBox = document.getElementById('modalBaselineMetrics');
  const idx = district.indices || {};
  metricsBox.innerHTML = `
    <div class="grid grid-cols-2 gap-2 text-[11px]">
      <div>Census Population: <strong>${(district.population || 0).toLocaleString()}</strong></div>
      <div>Roads Unconnected Deficit: <strong>${idx.roads_unconnected_pct || 0}%</strong></div>
      <div>Tap Water Deficit: <strong>${idx.water_tap_deficit_pct || 0}%</strong></div>
      <div>Rural PHC Doctor Deficit: <strong>${idx.phc_shortage_pct || 0}%</strong></div>
      <div>Daily Power Deficit: <strong>${idx.power_deficit_hours_daily || 0} hrs</strong></div>
      <div>Digital Connectivity Gap: <strong>${idx.digital_connectivity_gap_pct || 0}%</strong></div>
    </div>
  `;

  // Reports
  const reportsList = document.getElementById('modalReportsList');
  if (p.evidence_reports && p.evidence_reports.length > 0) {
    reportsList.innerHTML = p.evidence_reports.map(r => `
      <div class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
        <div class="flex items-center justify-between text-[11px] text-slate-500">
          <span class="font-mono font-bold text-slate-800">${r.id} (${r.original_language})</span>
          <span class="text-rose-600 font-bold">Urgency: ${r.urgency_score}/5</span>
        </div>
        <p class="text-slate-800 italic">"${escapeHtml(r.original_text)}"</p>
        <p class="text-slate-600 text-[11px] font-medium">[English]: ${escapeHtml(r.translated_text)}</p>
      </div>
    `).join('');
  } else {
    reportsList.innerHTML = '<div class="text-slate-400 italic">No direct complaints attached to this dossier.</div>';
  }

  // Button state
  const approveBtn = document.getElementById('modalApproveBtn');
  if (p.status === 'BUDGET_APPROVED') {
    approveBtn.disabled = true;
    approveBtn.textContent = 'Already Budget Approved';
    approveBtn.className = 'px-5 py-2 bg-slate-300 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed';
  } else {
    approveBtn.disabled = false;
    approveBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 mr-1"></i><span>Approve for DPI Budget Allocation</span>';
    approveBtn.className = 'px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center shadow';
  }

  document.getElementById('evidenceModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeEvidenceModal() {
  document.getElementById('evidenceModal').classList.add('hidden');
  currentModalProjectId = null;
}

async function approveCurrentProject() {
  if (!currentModalProjectId) return;
  await quickApproveProject(currentModalProjectId);
  closeEvidenceModal();
}

// Pitch Deck Modal
function openPitchDeckModal() {
  document.getElementById('pitchDeckModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closePitchDeckModal() {
  document.getElementById('pitchDeckModal').classList.add('hidden');
}

// Settings Modal
function openSettingsModal() {
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveApiKey() {
  const key = document.getElementById('geminiApiKeyInput').value.trim();
  if (key) {
    localStorage.setItem('nirmanvaani_gemini_key', key);
    alert('Gemini API key saved! Live AI calls will use this key.');
  } else {
    localStorage.removeItem('nirmanvaani_gemini_key');
    alert('API key cleared. System will use intelligent local NLP structuring engine.');
  }
  closeSettingsModal();
}

// Fetch & Render Analytics Charts
async function fetchAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    renderCharts(data);
  } catch (err) {
    console.error('Error fetching analytics:', err);
  }
}

function renderCharts(analyticsData) {
  if (!analyticsData) return;

  const sectorCanvas = document.getElementById('sectorChart');
  const langCanvas = document.getElementById('languageChart');
  if (!sectorCanvas || !langCanvas) return;

  // Sector Doughnut Chart
  if (sectorChart) sectorChart.destroy();
  const secLabels = Object.keys(analyticsData.sector_distribution);
  const secValues = Object.values(analyticsData.sector_distribution);
  const secBg = secLabels.map(l => SECTOR_COLORS[l] || '#94a3b8');

  sectorChart = new Chart(sectorCanvas, {
    type: 'doughnut',
    data: {
      labels: secLabels.map(s => s.replace('_', ' ').toUpperCase()),
      datasets: [{
        data: secValues,
        backgroundColor: secBg,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
      }
    }
  });

  // Language Bar Chart
  if (languageChart) languageChart.destroy();
  const langLabels = Object.keys(analyticsData.language_distribution);
  const langValues = Object.values(analyticsData.language_distribution);

  languageChart = new Chart(langCanvas, {
    type: 'bar',
    data: {
      labels: langLabels,
      datasets: [{
        label: 'Submissions',
        data: langValues,
        backgroundColor: '#10b981',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

// Export CSV for Ministry officials
function exportProjectsCSV() {
  if (!rankedProjects.length) {
    alert('No projects to export');
    return;
  }

  const headers = ['Rank', 'Title', 'District', 'State', 'Sector', 'Score', 'Citizens Impacted', 'Budget', 'Scheme', 'Status'];
  const rows = rankedProjects.map(p => [
    p.rank,
    `"${p.title.replace(/"/g, '""')}"`,
    p.district_name,
    p.state,
    p.sector,
    p.score,
    p.citizens_benefited,
    p.estimated_budget,
    p.suggested_scheme,
    p.status
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `NirmanVaani_DPI_Ranked_Projects_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility: Enhanced HTML Escaping
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#47;');
}
