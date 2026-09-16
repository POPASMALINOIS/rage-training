/* Rage Training 2.4.58. Local-only, single writer, read before any startup save. */
(() => {
  'use strict';
  if (window.RageLocalData) return;
  const VERSION = '2.4.58';
  const ROOT = 'rageTraining:database:v1';
  const BACKUP = 'rageTraining:database:previous:v1';
  const LOCK = 'rage-training-local-writer-v1';
  const area = window.localStorage;
  const proto = Storage.prototype;
  const nativeGet = proto.getItem;
  const nativeSet = proto.setItem;
  const nativeRemove = proto.removeItem;
  const nativeClear = proto.clear;
  const get = key => nativeGet.call(area, key);
  const put = (key, value) => nativeSet.call(area, key, value);
  const clone = value => JSON.parse(JSON.stringify(value));
  let loaded = false, writer = false, acquiring = false;
  let baseline = null, previous = null, release = null;
  let permittedRemoval = null, bulk = false;
  let phase = 'loading', message = 'Leyendo los datos guardados…';

  function array(raw, label, fallback) {
    if (raw === null) return clone(fallback);
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error(`Los datos de ${label} no tienen un formato válido. No se han sustituido.`);
    }
    return value;
  }
  function valid(db) {
    if (!db || db.schema !== 1 || !Number.isInteger(db.revision) || db.revision < 1) throw new Error('La base local no es válida. No se ha reiniciado.');
    array(JSON.stringify(db.clientes), 'clientes', []);
    array(JSON.stringify(db.entrenadores), 'entrenadores', []);
    return db;
  }
  function snapshot() {
    const raw = get(ROOT);
    if (raw !== null) return valid(JSON.parse(raw));
    return {schema:1, revision:0, clientes:array(get('clientes'), 'clientes', []),
      entrenadores:array(get('entrenadores'), 'entrenadores', entrenadoresIniciales)};
  }
  function hydrate(db) {
    clientes = clone(db.clientes);
    entrenadores = clone(db.entrenadores);
    clientes.forEach(c => {
      c.bonoTotal = c.bonoTotal ?? c.bonoDisponible ?? 0;
      c.bonoDisponible = c.bonoDisponible ?? c.bonoTotal;
      c.bonoDuracion = c.bonoDuracion || '60';
      c.bonoModalidad = c.bonoModalidad || 'Individual';
      ['clases', 'rutinas', 'controles', 'pagos'].forEach(k => { if (c[k] == null) c[k] = []; });
    });
    if (typeof clienteActual !== 'undefined' && clienteActual) clienteActual = clientes.find(c => String(c.id) === String(clienteActual.id)) || null;
    previous = db;
    baseline = get(ROOT);
    loaded = true;
    window.RageDatosCargados = true;
  }
  function panel(state, text) {
    phase = state; message = text;
    const draw = () => {
      let el = document.getElementById('rage-storage-guard');
      if (state === 'ready') { if (el) el.remove(); return; }
      if (!document.body) return;
      if (!el) {
        el = document.createElement('section'); el.id = 'rage-storage-guard';
        el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
        el.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#07101df5;display:flex;align-items:center;justify-content:center;padding:24px;color:#fff;font:16px/1.5 Arial,sans-serif';
        el.innerHTML = '<div style="max-width:520px;padding:24px;border:1px solid #617084;border-radius:16px;background:#0d192a"><h2 style="margin-top:0">Protección de datos de Rage</h2><p data-message></p><div style="display:flex;gap:12px;flex-wrap:wrap"><button type="button" data-retry style="padding:12px;border:0;border-radius:8px;background:#f15a24;color:#fff;font:inherit">Continuar</button><button type="button" data-export style="padding:12px;border:1px solid #617084;border-radius:8px;background:#16263c;color:#fff;font:inherit">Exportar copia</button></div></div>';
        el.querySelector('[data-retry]').onclick = () => { if (phase === 'readonly') acquire(); else location.reload(); };
        el.querySelector('[data-export]').onclick = () => { try { exportBackup(); } catch (e) { alert(e.message); } };
        document.body.appendChild(el);
      }
      el.querySelector('[data-message]').textContent = text;
      el.querySelector('[data-retry]').disabled = state === 'loading';
    };
    if (document.body) draw(); else document.addEventListener('DOMContentLoaded', () => panel(phase, message), {once:true});
  }
  function fail(text) {
    panel('error', text + ' Los datos guardados se conservan. Exporta una copia y recarga antes de continuar.');
    throw new Error(text);
  }
  function syncPerson() {
    clientes.forEach(c => {
      if (!Array.isArray(c.personas)) return;
      const p = c.personas.find(p => String(p.id) === String(c.seguimientoPersonaActivaId));
      if (!p) return;
      if (Array.isArray(c.mesociclos)) p.mesociclos = c.mesociclos;
      if (Array.isArray(c.mediciones)) p.mediciones = c.mediciones;
    });
  }
  function commit(next) {
    if (!loaded || !writer || phase !== 'ready') throw new Error('Esta pestaña todavía no tiene habilitado el guardado.');
    if (get(ROOT) !== baseline) return fail('Los datos han cambiado fuera de esta pestaña. Se ha bloqueado la sobrescritura.');
    array(JSON.stringify(next.clientes), 'clientes', []);
    array(JSON.stringify(next.entrenadores), 'entrenadores', []);
    if (!bulk) {
      for (const k of ['clientes', 'entrenadores']) {
        const ids = new Set(next[k].map(c => String(c.id)));
        const removed = previous[k].filter(c => !ids.has(String(c.id)));
        if (removed.some(c => !permittedRemoval || permittedRemoval.key !== k || permittedRemoval.id !== String(c.id))) {
          return fail('Se ha impedido eliminar registros sin una orden de borrado.');
        }
      }
    }
    if (baseline && JSON.stringify(next.clientes) === JSON.stringify(previous.clientes) && JSON.stringify(next.entrenadores) === JSON.stringify(previous.entrenadores)) return true;
    const db = {schema:1, revision:previous.revision + 1, version:VERSION, savedAt:new Date().toISOString(), clientes:next.clientes, entrenadores:next.entrenadores};
    const raw = JSON.stringify(db);
    try {
      if (baseline) put(BACKUP, baseline); // A failed backup or commit never discards the good database.
      put(ROOT, raw); // Both collections are committed in ONE storage operation.
    } catch (e) {
      return fail('No se ha podido guardar. Puede faltar espacio o el navegador puede tener bloqueado el almacenamiento.');
    }
    baseline = raw; previous = JSON.parse(raw);
    // Compatibility mirrors are not the source of truth; old tabs can never overwrite ROOT.
    try { put('clientes', JSON.stringify(db.clientes)); put('entrenadores', JSON.stringify(db.entrenadores)); } catch (_) {}
    return true;
  }
  function save() {
    if (!loaded || !writer || phase !== 'ready') return false; // Background startup checks are read-only until ready.
    syncPerson();
    return commit({clientes, entrenadores});
  }
  function loadOnce() {
    if (loaded) return true;
    if (phase === 'error') return false;
    hydrate(snapshot());
    return true;
  }
  function requireWriter() {
    if (!loaded || !writer || phase !== 'ready') throw new Error('Cierra las otras pestañas de Rage y pulsa Continuar para editar.');
  }
  function acquire() {
    if (acquiring || writer) return;
    if (!navigator.locks || !navigator.locks.request) {
      panel('error', 'Abre el enlace oficial desde una versión actualizada de Chrome. Este navegador no permite proteger la edición entre pestañas.'); return;
    }
    acquiring = true;
    navigator.locks.request(LOCK, {mode:'exclusive', ifAvailable:true}, lock => {
      acquiring = false;
      if (!lock) { panel('readonly', 'Rage está abierta en otra pestaña de este dispositivo. Ciérrala y pulsa Continuar. Así ninguna pestaña sobrescribe el trabajo de otra.'); return; }
      writer = true;
      try {
        if (get(ROOT) !== baseline) hydrate(snapshot());
        panel('ready', '');
        save(); // The first validated, complete snapshot becomes the new local database.
        window.dispatchEvent(new CustomEvent('rage:data-ready'));
        setTimeout(() => {
          if (!writer || phase !== 'ready') return;
          for (const fn of ['actualizarResumen','renderClientes','renderCalendarioSemanal','renderEntrenadores']) {
            try { if (typeof window[fn] === 'function') window[fn](); } catch (e) { console.error('[Rage] Vista:', e); }
          }
          const label = document.querySelector('.sidebar-footer small');
          if (label) label.textContent = 'Datos locales · v' + VERSION;
        }, 0);
      } catch (e) {
        writer = false; panel('error', e.message); return;
      }
      return new Promise(resolve => { release = resolve; });
    }).catch(e => { acquiring = false; writer = false; panel('error', 'No se ha podido activar el guardado: ' + e.message); });
  }

  // Route the legacy modules' direct reads/writes through the same protected database.
  // Other storage keys and sessionStorage keep their native behaviour.
  proto.getItem = function(key) {
    key = String(key);
    if (this === area && (key === 'clientes' || key === 'entrenadores')) {
      const raw = get(ROOT);
      if (raw !== null) return JSON.stringify(valid(JSON.parse(raw))[key]);
    }
    return nativeGet.call(this, key);
  };
  proto.setItem = function(key, value) {
    key = String(key);
    if (this === area && (key === 'clientes' || key === 'entrenadores')) {
      requireWriter();
      const next = {clientes:clone(previous.clientes), entrenadores:clone(previous.entrenadores)};
      next[key] = array(String(value), key, []);
      commit(next); return;
    }
    return nativeSet.call(this, key, value);
  };
  proto.removeItem = function(key) {
    key = String(key);
    if (this === area && (key === 'clientes' || key === 'entrenadores' || key === ROOT || key === BACKUP)) return fail('Usa la opción de borrado confirmada de Ajustes.');
    return nativeRemove.call(this, key);
  };
  proto.clear = function() {
    if (this === area) return fail('Se ha bloqueado un vaciado general del almacenamiento.');
    return nativeClear.call(this);
  };
  window.guardarDatos = save;
  window.cargarDatos = loadOnce;
  for (const [fn, key] of [['eliminarCliente','clientes'], ['eliminarEntrenador','entrenadores']]) {
    const original = window[fn];
    if (typeof original !== 'function') continue;
    window[fn] = function(id) {
      requireWriter(); permittedRemoval = {key, id:String(id)};
      try { return original.apply(this, arguments); } finally { permittedRemoval = null; }
    };
  }
  function exportBackup() {
    const db = snapshot();
    const backup = {app:'Rage Training', version:VERSION, fecha:new Date().toISOString(), clientes:db.clientes, entrenadores:db.entrenadores,
      ajustes:JSON.parse(get('rageTrainingAjustes') || '{}'), tarifas:window.RageTarifas ? window.RageTarifas.load() : JSON.parse(get('rageTrainingTarifasV1') || '{}')};
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.dataset.rageBackupDownload = '1'; a.download = `rage-training-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importBackup(data) {
    requireWriter();
    const next = {clientes:array(JSON.stringify(data.clientes), 'clientes', []), entrenadores:array(JSON.stringify(data.entrenadores), 'entrenadores', [])};
    bulk = true;
    try { commit(next); hydrate(snapshot()); } finally { bulk = false; }
    if (data.ajustes) put('rageTrainingAjustes', JSON.stringify(data.ajustes));
    if (data.tarifas) put('rageTrainingTarifasV1', JSON.stringify(data.tarifas));
  }
  function clearData() {
    requireWriter();
    if (prompt('Esta acción vaciará clientes y entrenadores de este dispositivo. Escribe BORRAR para confirmar.') !== 'BORRAR') return;
    bulk = true;
    try { commit({clientes:[], entrenadores:clone(entrenadoresIniciales)}); hydrate(snapshot()); } finally { bulk = false; }
    nativeRemove.call(area, 'rageTrainingAjustes'); nativeRemove.call(area, 'rageTrainingTarifasV1');
    location.reload();
  }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  for (const type of ['click','pointerup','submit','keydown','change']) {
    window.addEventListener(type, event => {
      if (phase !== 'ready' && !event.target.closest?.('#rage-storage-guard, [data-rage-backup-download]')) stop(event);
    }, true);
  }
  window.addEventListener('click', event => {
    const code = event.target.closest?.('button[onclick]')?.getAttribute('onclick') || '';
    if (code.includes('exportarCopiaRage(')) { stop(event); exportBackup(); }
    if (code.includes('borrarDatosRage(')) { stop(event); clearData(); }
  }, true);
  window.addEventListener('change', async event => {
    if (event.target.id !== 'ajImportFile') return;
    stop(event);
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      array(JSON.stringify(data.clientes), 'clientes', []); array(JSON.stringify(data.entrenadores), 'entrenadores', []);
      if (!confirm('La importación sustituirá los datos actuales. Se conservará una copia local anterior. ¿Continuar?')) return;
      importBackup(data); location.reload();
    } catch (e) { alert('No se ha importado la copia: ' + e.message); }
    finally { event.target.value = ''; }
  }, true);
  window.addEventListener('storage', event => {
    if (event.key === ROOT && event.newValue !== baseline && writer) panel('error', 'Los datos han cambiado fuera de esta pestaña. Exporta una copia y recarga. No se sobrescribirá la información guardada.');
  });
  window.addEventListener('pagehide', () => { writer = false; if (release) { release(); release = null; } });
  window.addEventListener('pageshow', event => { if (event.persisted) { hydrate(snapshot()); acquire(); } });
  window.RageLocalData = {version:VERSION, snapshot, save, importBackup, exportBackup, status:() => ({loaded,writer,phase}), key:ROOT};
  try { loadOnce(); panel('loading', message); acquire(); }
  catch (e) { panel('error', 'No se han podido leer los datos. No se ha creado una lista vacía ni se ha sobrescrito nada. ' + e.message); }
})();
