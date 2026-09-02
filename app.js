const KEY = 'planificador-rondas-v1';
const names = ['Baldo Cortés','Miguel Fonseca','Santiago Rodríguez','Juan Alcaraz','Cesar Rijo','Francisco Espallargas','Jesús Cañadas','Ioan Totoi','Alberto Rodríguez','Gary Correa','Marcos Cano','Alberto Fernández','José Barberá','Daniele Mauro','Ángel López','José Romero','Roberto Sepulveda','Rubén Millán','Alex Marugán','Pablo Rodríguez'];
const defaults = names.map(name => ({ name, accommodation: !['Baldo Cortés','Miguel Fonseca','Santiago Rodríguez','Ioan Totoi','Gary Correa','Roberto Sepulveda'].includes(name), microphones: ['Alberto Rodríguez','Daniele Mauro','Ángel López','José Romero','Alex Marugán'].includes(name), audio: ['Alberto Rodríguez','Daniele Mauro','Alex Marugán','Pablo Rodríguez'].includes(name), sound: name === 'Pablo Rodríguez', availability: name !== 'Baldo Cortés' && name !== 'Miguel Fonseca' && name !== 'Santiago Rodríguez' && name !== 'Juan Alcaraz', days: name === 'Juan Alcaraz' ? 'Miércoles' : 'Ambos' }));
let state = JSON.parse(localStorage.getItem(KEY) || 'null') || { people: defaults, history: [], schedule: null };
let deferredPrompt;
const $ = id => document.getElementById(id);
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const formatDate = date => new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
const isoDate = date => date.toISOString().slice(0,10);
const monday = date => { const d = new Date(date); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(12,0,0,0); return d; };
const dayAllowed = (person, day) => person.days === 'Ambos' || person.days === day;
const usedCount = name => state.history.filter(item => item.name === name).length;
function eligible(task, day, selected, predicate = () => true, constraints = {}) { return state.people.filter(p => { if (!p.availability || !dayAllowed(p,day) || !p[task] || selected.includes(p.name) || !predicate(p)) return false; const lastMicrosDate = constraints.lastMicros && constraints.lastMicros[p.name]; if (lastMicrosDate && constraints.date && (new Date(constraints.date+'T12:00:00') - new Date(lastMicrosDate+'T12:00:00')) / 86400000 < 3) return false; return true; }); }
function choose(task, day, selected, counts, predicate = () => true, constraints = {}) { const candidates = eligible(task, day, selected, predicate, constraints); const roleCounts = constraints.roleCounts || {}; const lastUsed = constraints.lastUsed || {}; candidates.sort((a,b) => (counts[a.name] || 0)-(counts[b.name] || 0) || ((roleCounts[task] && roleCounts[task][a.name]) || 0)-((roleCounts[task] && roleCounts[task][b.name]) || 0) || String(lastUsed[a.name] || '1900-01-01').localeCompare(String(lastUsed[b.name] || '1900-01-01')) || a.name.localeCompare(b.name,'es')); return candidates[0] || null; }
function taskForRole(role) { if (role.startsWith('Acomodación')) return 'accommodation'; if (role.startsWith('Micros')) return 'microphones'; if (role === 'MULT') return 'audio'; return 'sound'; }
function replaceAssignment(meeting, index, name, counts, lastMicros, roleCounts, lastUsed) { const assignment = meeting.assignments[index]; const task = taskForRole(assignment.role); const oldName = assignment.name; if (oldName === name) return; if (oldName !== 'Sin asignar') { counts[oldName] = Math.max(0, (counts[oldName] || 0) - 1); roleCounts[task][oldName] = Math.max(0, (roleCounts[task][oldName] || 0) - 1); } assignment.name = name; if (name !== 'Sin asignar') { counts[name] = (counts[name] || 0) + 1; roleCounts[task][name] = (roleCounts[task][name] || 0) + 1; lastUsed[name] = meeting.date; if (assignment.role.startsWith('Micros')) lastMicros[name] = meeting.date; } }
function pairLimitedPeople(weekdayMeeting, publicMeeting, counts, lastMicros, roleCounts, lastUsed) {
  const nextPairs = {};
  weekdayMeeting.assignments.forEach((weekdayAssignment,index) => {
    if (weekdayAssignment.role.startsWith('Acomodación')) return;
    const sundayAssignment = publicMeeting.assignments[index];
    const weekdayPerson = state.people.find(person => person.name === weekdayAssignment.name);
    if (!sundayAssignment) return;
    const sundayPerson = state.people.find(person => person.name === sundayAssignment.name);
    if (!weekdayPerson) return;
    const task = taskForRole(weekdayAssignment.role);
    if (weekdayPerson.days === 'Miércoles') {
      const selected = publicMeeting.assignments.filter((_,otherIndex) => otherIndex !== index).map(assignment => assignment.name);
      const partner = choose(task, 'Domingo', selected, counts, person => person.days === 'Domingo', {date:publicMeeting.date,lastMicros,roleCounts,lastUsed});
      if (partner) replaceAssignment(publicMeeting,index,partner.name,counts,lastMicros,roleCounts,lastUsed);
    } else if (sundayPerson && sundayPerson.days === 'Domingo') {
      const selected = weekdayMeeting.assignments.filter((_,otherIndex) => otherIndex !== index).map(assignment => assignment.name);
      const partner = choose(task, 'Miércoles', selected, counts, person => person.days === 'Miércoles', {date:weekdayMeeting.date,lastMicros,roleCounts,lastUsed});
      if (partner) replaceAssignment(weekdayMeeting,index,partner.name,counts,lastMicros,roleCounts,lastUsed);
    }
    const finalWeekday = state.people.find(person => person.name === weekdayMeeting.assignments[index].name);
    const finalSunday = state.people.find(person => person.name === publicMeeting.assignments[index].name);
    if (finalWeekday && finalSunday && (finalWeekday.days !== 'Ambos' || finalSunday.days !== 'Ambos')) nextPairs[weekdayAssignment.role] = { weekday: weekdayMeeting.assignments[index].name, sunday: publicMeeting.assignments[index].name };
  });
  return nextPairs;
}
function meeting(date, day, label, counts, accommodationOverride = null, overrides = {}, lastMicros = {}, roleCounts = {}, lastUsed = {}, shareMulti = false, multiOverride = null) {
  const selected = [];
  const take = (task, role, predicate = () => true) => { const preferred = overrides[role] ? state.people.find(person => person.name === overrides[role]) : null; const usablePreferred = preferred && preferred.availability && dayAllowed(preferred,day) && preferred[task] && !selected.includes(preferred.name) && !(lastMicros[preferred.name] && (new Date(date) - new Date(lastMicros[preferred.name]+'T12:00:00')) / 86400000 < 3); let p = usablePreferred ? preferred : choose(task,day,selected,counts,predicate,{date:isoDate(date),lastMicros,roleCounts,lastUsed}); if (!p && (role.startsWith('Acomodación') || (role === 'MULT' && shareMulti))) p = choose(task,day,selected,counts); if (p) { selected.push(p.name); counts[p.name] = (counts[p.name] || 0) + 1; roleCounts[task][p.name] = (roleCounts[task][p.name] || 0) + 1; lastUsed[p.name] = isoDate(date); if (role.startsWith('Micros')) lastMicros[p.name] = isoDate(date); } return p ? p.name : 'Sin asignar'; };
  const accommodationOne = accommodationOverride ? accommodationOverride[0] : take('accommodation','Acomodación 1',person => person.days === 'Ambos');
  const accommodationTwo = accommodationOverride ? accommodationOverride[1] : take('accommodation','Acomodación 2',person => person.days === 'Ambos');
  if (accommodationOverride) accommodationOverride.forEach(name => { selected.push(name); counts[name] = (counts[name] || 0) + 1; });
  const microphonesOne = take('microphones','Micros 1');
  const microphonesTwo = take('microphones','Micros 2');
  const multi = multiOverride || take('audio','MULT',person => !shareMulti || person.days === 'Ambos');
  if (multiOverride) { selected.push(multiOverride); counts[multiOverride] = (counts[multiOverride] || 0) + 1; roleCounts.audio[multiOverride] = (roleCounts.audio[multiOverride] || 0) + 1; lastUsed[multiOverride] = isoDate(date); }
  const soundName = take('sound','SON');
  return { date: isoDate(date), day, label, assignments: [
    {role:'Acomodación 1', name:accommodationOne}, {role:'Acomodación 2', name:accommodationTwo},
    {role:'Micros 1', name:microphonesOne}, {role:'Micros 2', name:microphonesTwo},
    {role:'MULT', name:multi}, {role:'SON', name:soundName === 'Sin asignar' ? 'Pablo Rodríguez' : soundName}
  ]};
}
function generate() {
  const base = monday(new Date($('monthDate').value + 'T12:00:00'));
  const counts = Object.fromEntries(state.people.map(person => [person.name, usedCount(person.name)]));
  const lastMicros = {};
  const lastUsed = {};
  const roleCounts = { accommodation:{}, microphones:{}, audio:{}, sound:{} };
  state.history.forEach(item => { const task = taskForRole(item.category); roleCounts[task][item.name] = (roleCounts[task][item.name] || 0) + 1; if (!lastUsed[item.name] || item.date > lastUsed[item.name]) lastUsed[item.name] = item.date; });
  state.history.filter(item => item.category.startsWith('Micros')).forEach(item => { if (!lastMicros[item.name] || item.date > lastMicros[item.name]) lastMicros[item.name] = item.date; });
  let repeatForNextWeek = {};
  const weeks = Array.from({length:5},(_,i) => { const mon = new Date(base); mon.setDate(mon.getDate()+i*7); const wed = new Date(mon); wed.setDate(mon.getDate()+2); const sun = new Date(mon); sun.setDate(mon.getDate()+6); const weekdayMeeting = meeting(wed,'Miércoles','Reunión de entre semana',counts,null,Object.fromEntries(Object.entries(repeatForNextWeek).map(([role,pair]) => [role,pair.weekday])),lastMicros,roleCounts,lastUsed,true); const sharedAccommodation = weekdayMeeting.assignments.filter(a => a.role.startsWith('Acomodación')).map(a => a.name); const sharedMulti = weekdayMeeting.assignments.find(a => a.role === 'MULT')?.name; const publicMeeting = meeting(sun,'Domingo','Reunión pública',counts,sharedAccommodation,Object.fromEntries(Object.entries(repeatForNextWeek).map(([role,pair]) => [role,pair.sunday])),lastMicros,roleCounts,lastUsed,false,sharedMulti); const previousRoles = new Set(Object.keys(repeatForNextWeek)); const newPairs = pairLimitedPeople(weekdayMeeting,publicMeeting,counts,lastMicros,roleCounts,lastUsed); previousRoles.forEach(role => delete newPairs[role]); repeatForNextWeek = newPairs; return { title:`Semana del ${formatDate(mon).slice(0,5)} al ${formatDate(sun).slice(0,5)}`, meetings:[weekdayMeeting,publicMeeting]}; });
  state.schedule = { generatedAt:new Date().toISOString(), weeks }; save(); renderSchedule(); toast('Propuesta generada');
}
function renderSchedule() {
  if (!state.schedule) { $('schedule').innerHTML = '<div class="backup-card"><h3>Aún no hay una propuesta</h3><p class="muted">Elige una fecha y pulsa “Generar propuesta”.</p></div>'; $('stats').innerHTML=''; $('fairness').innerHTML=''; return; }
  const all = state.schedule.weeks.flatMap(w=>w.meetings.flatMap(m=>m.assignments)); const assigned = all.filter(x=>x.name !== 'Sin asignar').length; const peopleUsed = new Set(all.filter(x=>x.name !== 'Sin asignar').map(x=>x.name)).size;
  $('stats').innerHTML = `<div class="stat"><strong>${state.schedule.weeks.length}</strong><span>semanas preparadas</span></div><div class="stat"><strong>${assigned}</strong><span>asignaciones cubiertas</span></div><div class="stat"><strong>${peopleUsed}</strong><span>personas incluidas</span></div>`;
  const options = name => ['Sin asignar', ...state.people.map(p=>p.name)].filter((value,index,array)=>array.indexOf(value)===index).map(value=>`<option value="${esc(value)}" ${value===name?'selected':''}>${esc(value)}</option>`).join('');
  $('schedule').innerHTML = state.schedule.weeks.map((week,wi) => `<article class="week"><div class="week-title"><strong>${esc(week.title)}</strong><span class="pill">${week.meetings.length} reuniones</span></div><div class="meetings">${week.meetings.map((m,mi)=>`<div class="meeting"><h3>${esc(m.label)}</h3><p class="meeting-date">${esc(formatDate(new Date(m.date+'T12:00:00')))}</p>${m.day==='Domingo'?'<p class="shared-note">Acomodación y MULT compartidos con el miércoles</p>':''}${m.assignments.map((a,ai)=>`<div class="assignment"><span class="role">${esc(a.role)}</span><select class="assignment-person" data-wi="${wi}" data-mi="${mi}" data-ai="${ai}">${options(a.name)}</select></div>`).join('')}</div>`).join('')}</div></article>`).join('');
  renderFairness();
}
function renderFairness() { const proposal = {}; state.schedule.weeks.forEach(week => week.meetings.forEach(meeting => meeting.assignments.forEach(assignment => { if (assignment.name !== 'Sin asignar') proposal[assignment.name] = (proposal[assignment.name] || 0) + 1; }))); const rows = state.people.map(person => ({name:person.name, history:usedCount(person.name), proposal:proposal[person.name] || 0})).sort((a,b)=>(a.history+a.proposal)-(b.history+b.proposal) || a.name.localeCompare(b.name,'es')); const historicalMonths = new Set(state.history.map(item => item.date && item.date.slice(0,7))).size; $('fairness').innerHTML = `<div class="fairness-card"><div class="fairness-heading"><div><p class="eyebrow">Comprobación antes de confirmar</p><h3>Equidad acumulada</h3></div><span class="pill">${historicalMonths} meses previos</span></div><p class="muted">La propuesta prioriza menos asignaciones acumuladas, menor uso de la función y más tiempo desde la última asignación.</p><div class="fairness-grid"><div class="fairness-row fairness-labels"><span>Persona</span><span>Histórico</span><span>Propuesta</span><span>Total</span></div>${rows.map(row=>`<div class="fairness-row"><strong>${esc(row.name)}</strong><span>${row.history}</span><span>${row.proposal}</span><strong>${row.history+row.proposal}</strong></div>`).join('')}</div></div>`; }
function renderPeople() { $('peopleList').innerHTML = state.people.map((p,i)=>`<div class="person-card"><div class="person-name">${esc(p.name)}</div><div class="check-group"><label class="check"><input type="checkbox" data-i="${i}" data-k="accommodation" ${p.accommodation?'checked':''}> Acomodación</label><label class="check"><input type="checkbox" data-i="${i}" data-k="microphones" ${p.microphones?'checked':''}> Micros</label><label class="check"><input type="checkbox" data-i="${i}" data-k="audio" ${p.audio?'checked':''}> MULT</label><label class="check"><input type="checkbox" data-i="${i}" data-k="sound" ${p.sound?'checked':''}> SON</label></div><select data-i="${i}" data-k="availability"><option ${p.availability?'selected':''} value="true">Disponible</option><option ${!p.availability?'selected':''} value="false">No disponible</option></select><select data-i="${i}" data-k="days"><option ${p.days==='Ambos'?'selected':''}>Ambos</option><option ${p.days==='Miércoles'?'selected':''}>Miércoles</option><option ${p.days==='Domingo'?'selected':''}>Domingo</option></select><div class="count">${usedCount(p.name)}<small>veces</small></div><button class="delete-person" data-delete="${i}" title="Eliminar">×</button></div>`).join(''); }
function renderHistory() { const list = [...state.history].reverse(); $('historyList').innerHTML = list.length ? list.map(item=>`<div class="history-item"><div><strong>${esc(item.name)}</strong><small>${esc(item.category)} · ${esc(item.day)}</small></div><small>${esc(formatDate(new Date(item.date+'T12:00:00')))}</small></div>`).join('') : '<div class="backup-card"><p class="muted">Todavía no hay asignaciones guardadas.</p></div>'; }
function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2400); }
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view')); tab.classList.add('active'); $(tab.dataset.tab).classList.add('active-view'); }));
$('generateBtn').addEventListener('click',generate); $('printBtn').addEventListener('click',()=>window.print());
$('schedule').addEventListener('change',event=>{ const select=event.target.closest('.assignment-person'); if(!select) return; const wi=Number(select.dataset.wi); const mi=Number(select.dataset.mi); const ai=Number(select.dataset.ai); const assignment=state.schedule.weeks[wi].meetings[mi].assignments[ai]; assignment.name=select.value; if (assignment.role.startsWith('Acomodación') || assignment.role === 'MULT') { const otherMeeting=state.schedule.weeks[wi].meetings[mi === 0 ? 1 : 0]; const linked=otherMeeting.assignments.find(item=>item.role===assignment.role); if(linked) linked.name=select.value; } save(); renderSchedule(); toast('Asignación modificada'); });
$('saveHistoryBtn').addEventListener('click',()=>{ if(!state.schedule) return toast('Genera una propuesta primero'); state.schedule.weeks.forEach(w=>w.meetings.forEach(m=>m.assignments.forEach(a=>{if(a.name!=='Sin asignar') state.history.push({date:m.date,day:m.day,category:a.role,name:a.name});}))); save(); renderHistory(); renderPeople(); toast('Plan guardado en el histórico'); });
$('peopleList').addEventListener('change',event=>{ const el=event.target; const i=Number(el.dataset.i); if(Number.isNaN(i)) return; state.people[i][el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value === 'true' ? true : el.value; save(); renderSchedule(); renderPeople(); });
$('peopleList').addEventListener('click',event=>{ const button=event.target.closest('[data-delete]'); if(!button) return; state.people.splice(Number(button.dataset.delete),1); save(); renderPeople(); toast('Persona eliminada'); });
$('addPersonBtn').addEventListener('click',()=>{ const name=prompt('Nombre de la persona'); if(!name || state.people.some(p=>p.name.toLowerCase()===name.trim().toLowerCase())) return; state.people.push({name:name.trim(),accommodation:false,microphones:false,audio:false,sound:false,availability:true,days:'Ambos'}); save(); renderPeople(); });
$('clearHistoryBtn').addEventListener('click',()=>{ if(confirm('¿Borrar todo el histórico?')) { state.history=[]; save(); renderHistory(); renderPeople(); toast('Histórico borrado'); } });
$('exportBtn').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`copia-rondas-${isoDate(new Date())}.json`; a.click(); URL.revokeObjectURL(a.href); });
$('importInput').addEventListener('change',event=>{ const file=event.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try { const imported=JSON.parse(reader.result); if(!Array.isArray(imported.people)||!Array.isArray(imported.history)) throw Error(); state=imported; save(); renderAll(); toast('Copia restaurada'); } catch { toast('La copia no es válida'); } }; reader.readAsText(file); });
function renderAll(){ renderSchedule(); renderPeople(); renderHistory(); }
$('monthDate').value = isoDate(new Date()); renderAll();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault(); deferredPrompt=event; $('installBtn').classList.remove('hidden');}); $('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return; deferredPrompt.prompt(); deferredPrompt=null; $('installBtn').classList.add('hidden');});
