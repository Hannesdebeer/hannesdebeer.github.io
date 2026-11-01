'use strict';
let dataset, selectedId, mapMode = 'origin', commuteMode = 'am';
const byId = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routeData = c => commuteMode === 'midday' ? c : c.commute?.[commuteMode] || {};
const distanceLabel = c => routeData(c).distanceKm == null ? 'Not verified' : `${routeData(c).distanceKm} km`;
const timeLabel = c => { const r = routeData(c); return r.timeMin == null ? 'Not verified' : `${r.timeMin}${r.timeMax != null && r.timeMax !== r.timeMin ? '–' + r.timeMax : ''} min`; };
const directionURL = c => { const home = c.originQuery || c.origin, office = dataset.destination.query; return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(commuteMode === 'pm' ? office : home)}&destination=${encodeURIComponent(commuteMode === 'pm' ? home : office)}&travelmode=driving`; };
function scheduleLabel() {
 if (commuteMode === 'midday') return 'Sun 1 Nov 2026 · 12:43–12:44 Dubai · Home → MCN Hive · Observed snapshot';
 const f = dataset.forecast;
 return `${f.label} · ${commuteMode === 'am' ? 'Arrive at MCN Hive by' : 'Leave MCN Hive at'} ${f[commuteMode].time} · ${f.timezone}`;
}
function renderCards() {
 const mode = byId('sort').value;
 const communities = [...dataset.communities];
 if (mode !== 'default') communities.sort((a,b) => (routeData(a)[mode === 'time' ? 'timeMax' : 'distanceKm'] ?? routeData(a)[mode === 'time' ? 'timeMin' : 'distanceKm'] ?? Infinity) - (routeData(b)[mode === 'time' ? 'timeMax' : 'distanceKm'] ?? routeData(b)[mode === 'time' ? 'timeMin' : 'distanceKm'] ?? Infinity));
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
function selectCommunity(id, resetMap = true) {
 selectedId = id;
 const c = dataset.communities.find(c => c.id === id), r = routeData(c);
 byId('selected-name').textContent = c.name;
 byId('route-endpoint').textContent = commuteMode === 'pm' ? 'from MCN Hive, Barsha Heights → home' : 'home → MCN Hive, Barsha Heights';
 byId('selected-distance').textContent = distanceLabel(c);
 byId('selected-time').textContent = timeLabel(c);
 byId('time-caption').textContent = commuteMode === 'midday' ? 'observed drive' : 'typical drive range';
 byId('selected-origin').textContent = `${commuteMode === 'pm' ? 'Home destination' : 'Starting point'}: ${c.origin}`;
 byId('selected-note').textContent = commuteMode === 'midday' ? c.note || '' : `${r.via ? 'Via ' + r.via + '. ' : ''}${r.sourceNote || 'No verified Google Maps forecast is available for this route and time.'} Landmark and address assumptions are unchanged; see origins and sources below.`;
 byId('selected-forecast').textContent = scheduleLabel();
 byId('directions').href = directionURL(c);
 if (resetMap) mapMode = 'origin';
 renderCards(); renderMap();
}
function setCommuteMode(mode) {
 commuteMode = mode;
 document.querySelectorAll('[data-commute]').forEach(button => { const active = button.dataset.commute === mode; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
 byId('schedule-note').textContent = scheduleLabel();
 byId('list-note').textContent = mode === 'midday' ? 'One-way drive · Sunday snapshot, not live traffic' : 'One-way forecast · Typical traffic range · Drive-time sort uses the upper end';
 selectCommunity(selectedId, false);
}
fetch('data.json').then(response => { if (!response.ok) throw new Error('Data unavailable'); return response.json(); }).then(data => {
 dataset = data;
 if (!Array.isArray(data.communities) || !data.communities.length) throw new Error('No communities');
 byId('destination-link').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.destination.query)}`;
 if (data.methodology) byId('methodology').textContent = data.methodology;
 if (data.forecast?.methodology) byId('forecast-methodology').textContent = data.forecast.methodology;
 if (data.assumptions) byId('assumptions').textContent = data.assumptions;
 if (data.asOf) byId('data-date').textContent = `Midday checked ${data.asOf}`;
 byId('sources').innerHTML = `${data.forecast?.limits ? '<p>' + data.forecast.limits.map(escapeHTML).join(' ') + '</p>' : ''}<ul>${data.communities.map(c => `<li><strong>${escapeHTML(c.name)}:</strong> ${escapeHTML(c.origin)}${c.sourceUrl ? ` · <a href="${escapeHTML(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(c.sourceLabel || 'Estimate source')}</a>` : ''}<br>Midday: ${escapeHTML(c.sourceNote || '')}<br>${escapeHTML(c.note || '')}${['am','pm'].map(mode => { const r = c.commute?.[mode]; return `<br>${mode.toUpperCase()} forecast: ${r?.timeMin != null ? `${r.timeMin}–${r.timeMax ?? r.timeMin} min. ${escapeHTML(r.sourceNote || '')}${r.sourceUrl ? ` <a href="${escapeHTML(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">Google Maps source ↗</a>` : ''}` : 'Not verified.'}`; }).join('')}</li>`).join('')}</ul>`;
 byId('sort').addEventListener('change',renderCards);
 ['origin','destination'].forEach(mode => byId(`${mode}-tab`).addEventListener('click', () => { mapMode = mode; renderMap(); }));
 document.querySelectorAll('[data-commute]').forEach(button => button.addEventListener('click', () => setCommuteMode(button.dataset.commute)));
 selectedId = data.communities[0].id;
 setCommuteMode(commuteMode);
}).catch(error => { console.error(error); byId('community-list').innerHTML = '<p class="loading">The comparison could not load. Please refresh the page. You can still open the destination in Google Maps.</p>'; });
