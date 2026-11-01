'use strict';
let dataset, selectedId, mapMode = 'origin';
const byId = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const distanceLabel = c => c.distanceKm == null ? 'Not verified' : `${c.distanceKm} km`;
const timeLabel = c => c.timeMin == null ? 'Not verified' : `${c.timeMin}${c.timeMax && c.timeMax !== c.timeMin ? '–' + c.timeMax : ''} min`;
const directionURL = c => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(c.originQuery || c.origin)}&destination=${encodeURIComponent(dataset.destination.query)}&travelmode=driving`;
function renderCards() {
 const mode = byId('sort').value;
 const communities = [...dataset.communities];
 if (mode !== 'default') communities.sort((a,b) => (a[mode === 'time' ? 'timeMin' : 'distanceKm'] ?? Infinity) - (b[mode === 'time' ? 'timeMin' : 'distanceKm'] ?? Infinity));
 byId('community-list').innerHTML = communities.map(c => `<button class="community-card${c.id === selectedId ? ' active' : ''}" data-id="${escapeHTML(c.id)}" aria-pressed="${c.id === selectedId}"><span class="community-number">${String(dataset.communities.findIndex(x => x.id === c.id) + 1).padStart(2,'0')}</span><span><span class="community-name">${escapeHTML(c.name)}</span><span class="community-caption">${escapeHTML(c.caption || '')}</span></span><span class="card-metrics"><span class="card-time">${escapeHTML(timeLabel(c))}</span><span class="card-distance">${escapeHTML(distanceLabel(c))}</span></span></button>`).join('');
 byId('community-list').querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectCommunity(button.dataset.id)));
}
function renderMap() {
 const c = dataset.communities.find(c => c.id === selectedId);
 const destination = mapMode === 'destination';
 const query = destination ? dataset.destination.query : c.originQuery || c.origin;
 byId('map').src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${destination ? 15 : 13}&output=embed`;
 byId('map').title = `Google map showing ${destination ? dataset.destination.name : c.origin}`;
 ['origin','destination'].forEach(mode => { byId(`${mode}-tab`).classList.toggle('active', mode === mapMode); byId(`${mode}-tab`).setAttribute('aria-pressed',String(mode === mapMode)); });
}
function selectCommunity(id) {
 selectedId = id;
 const c = dataset.communities.find(c => c.id === id);
 byId('selected-name').textContent = c.name;
 byId('selected-distance').textContent = distanceLabel(c);
 byId('selected-time').textContent = timeLabel(c);
 byId('selected-origin').textContent = `Starting point: ${c.origin}`;
 byId('selected-note').textContent = c.note || '';
 byId('directions').href = directionURL(c);
 mapMode = 'origin';
 renderCards(); renderMap();
}
fetch('data.json').then(response => { if (!response.ok) throw new Error('Data unavailable'); return response.json(); }).then(data => {
 dataset = data;
 if (!Array.isArray(data.communities) || !data.communities.length) throw new Error('No communities');
 byId('destination-link').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.destination.query)}`;
 if (data.methodology) byId('methodology').textContent = data.methodology;
 if (data.assumptions) byId('assumptions').textContent = data.assumptions;
 if (data.asOf) byId('data-date').textContent = `Estimates checked ${data.asOf}`;
 byId('sources').innerHTML = `<ul>${data.communities.map(c => `<li><strong>${escapeHTML(c.name)}:</strong> ${escapeHTML(c.origin)}${c.sourceUrl ? ` · <a href="${escapeHTML(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(c.sourceLabel || 'Estimate source')}</a>` : ''}${c.sourceNote ? ` — ${escapeHTML(c.sourceNote)}` : ''}</li>`).join('')}</ul>`;
 byId('sort').addEventListener('change',renderCards);
 ['origin','destination'].forEach(mode => byId(`${mode}-tab`).addEventListener('click', () => { mapMode = mode; renderMap(); }));
 selectCommunity(data.communities[0].id);
}).catch(error => { console.error(error); byId('community-list').innerHTML = '<p class="loading">The comparison could not load. Please refresh the page. You can still open the destination in Google Maps.</p>'; });
