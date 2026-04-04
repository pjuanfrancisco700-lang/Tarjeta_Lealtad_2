/*
  app.js
  Lógica principal de la tarjeta de lealtad.
  - Conexión con Apps Script
  - Render del dashboard
  - Registro, login y almacenamiento local
*/

const CONFIG = window.APP_CONFIG || {};
    const API_URL = CONFIG.apiUrl || 'PEGAR_AQUI_TU_WEB_APP';
        const STORAGE_KEY = CONFIG.storageKey || 'tarjetaLealtadCliente';

    const registerView = document.getElementById('registerView');
    const appView = document.getElementById('appView');
    const registerFeedback = document.getElementById('registerFeedback');
    const btnCrearCuenta = document.getElementById('btnCrearCuenta');
    const btnYaTengoCuenta = document.getElementById('btnYaTengoCuenta');
    const btnIngresarCuenta = document.getElementById('btnIngresarCuenta');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    const btnSalir = document.getElementById('btnSalir');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnBorrarCuenta = document.getElementById('btnBorrarCuenta');
    const loginModal = document.getElementById('loginModal');
    const loginFeedback = document.getElementById('loginFeedback');
    const loginIdCliente = document.getElementById('loginIdCliente');
    const contactoInput = document.getElementById('contacto');

    const state = {
      cliente: null,
      metaPuntos: Number(CONFIG.metaPuntos || 10),
      recompensa: CONFIG.recompensa || 'Café gratis',
      negocio: CONFIG.negocio || 'Mi negocio',
      movimientos: []
    };

    function applyBranding() {
      document.title = state.negocio ? `Tarjeta de Lealtad | ${state.negocio}` : 'Tarjeta de Lealtad';

      document.querySelectorAll('.brand-name').forEach((node) => {
        node.textContent = state.negocio;
      });

      document.querySelectorAll('.brand-logo').forEach((node) => {
        node.src = CONFIG.logo || 'assets/logo.svg';
        node.alt = `Logo de ${state.negocio}`;
      });

      if (CONFIG.theme?.accent) {
        document.documentElement.style.setProperty('--accent', CONFIG.theme.accent);
      }
    }

    function showRegister(message = '', type = 'error') {
      registerView.classList.remove('hidden');
      appView.classList.add('hidden');
      closeLoginModal();

      if (message) {
        registerFeedback.textContent = message;
        registerFeedback.className = `feedback ${type}`;
        registerFeedback.classList.remove('hidden');
      } else {
        registerFeedback.classList.add('hidden');
      }
    }

    function showApp() {
      registerView.classList.add('hidden');
      appView.classList.remove('hidden');
      closeLoginModal();
    }

    function openLoginModal() {
      loginModal.classList.remove('hidden');
      loginFeedback.classList.add('hidden');
      loginIdCliente.value = '';
      setTimeout(() => loginIdCliente.focus(), 50);
    }

    function closeLoginModal() {
      loginModal.classList.add('hidden');
      loginFeedback.classList.add('hidden');
      loginIdCliente.value = '';
    }

    function showLoginFeedback(message, type = 'error') {
      loginFeedback.textContent = message;
      loginFeedback.className = `feedback ${type}`;
      loginFeedback.classList.remove('hidden');
    }

    function saveLocalCliente(cliente) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cliente));
    }

    function getLocalCliente() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      } catch {
        return null;
      }
    }

    function clearLocalCliente() {
      localStorage.removeItem(STORAGE_KEY);
    }

    function safeText(value, fallback = '—') {
      return value && String(value).trim() ? String(value).trim() : fallback;
    }

    function formatDate(value) {
      if (!value) return 'Sin movimientos todavía';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return safeText(value, 'Sin fecha');
      return date.toLocaleString('es-GT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    function buildQrData(id) {
      const targetUrl = `https://pjuanfrancisco700-lang.github.io/Confirmar_punto/?id=${encodeURIComponent(id)}`;
      return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(targetUrl)}`;
    }

    function parseContacto(contacto) {
      const value = String(contacto || '').trim();
      return {
        telefono: value && !value.includes('@') ? value : '',
        correo: value && value.includes('@') ? value : ''
      };
    }

    function renderCups(points, goal) {
      const cupsGrid = document.getElementById('cupsGrid');
      cupsGrid.innerHTML = '';
      const total = Math.max(goal, 10);

      for (let i = 1; i <= total; i += 1) {
        const item = document.createElement('div');
        item.className = `cup ${i <= points ? 'filled' : ''}`;
        item.textContent = '☕';
        cupsGrid.appendChild(item);
      }
    }

    function renderMovimientos() {
      const container = document.getElementById('movimientosList');
      container.innerHTML = '';

      if (!state.movimientos.length) {
        container.innerHTML = `
          <div class="row-card">
            <div class="row-left">
              <div class="row-icon">🧾</div>
              <div>
                <strong>Aún no hay movimientos</strong>
                <p>Cuando te marquen puntos aparecerán aquí.</p>
              </div>
            </div>
          </div>
        `;
        return;
      }

      state.movimientos.forEach((mov) => {
        const row = document.createElement('div');
        const isSuma = String(mov.tipo || '').toUpperCase() === 'SUMA';
        row.className = 'row-card';
        row.innerHTML = `
          <div class="row-left">
            <div class="row-icon">${isSuma ? '☕' : '🎁'}</div>
            <div>
              <strong>${isSuma ? 'Punto agregado' : 'Canje de recompensa'}</strong>
              <p>${formatDate(mov.fecha)}</p>
            </div>
          </div>
          <div class="pill">${isSuma ? '+1 punto' : 'Canje'}</div>
        `;
        container.appendChild(row);
      });
    }

    function renderCliente() {
      const c = state.cliente;
      if (!c) return;

      document.getElementById('saludoNombre').textContent = `Hola, ${safeText(c.nombre, 'cliente')}`;
      document.getElementById('perfilNombre').textContent = safeText(c.nombre);
      document.getElementById('perfilTelefono').textContent = safeText(c.telefono, 'No registrado');
      document.getElementById('perfilCorreo').textContent = safeText(c.correo, 'No registrado');
      document.getElementById('perfilId').textContent = safeText(c.id_cliente);

      document.getElementById('pointsCount').textContent = Number(c.puntos || 0);
      document.getElementById('goalCount').textContent = state.metaPuntos;
      document.getElementById('metaId').textContent = `ID: ${safeText(c.id_cliente)}`;
      document.getElementById('metaEstado').textContent = `Estado: ${safeText(c.estado, 'ACTIVO')}`;

      const premioDisponible = String(c.premio_disponible || 'NO').toUpperCase() === 'SI';
      const faltan = Math.max(0, state.metaPuntos - Number(c.puntos || 0));

      document.getElementById('heroText').textContent = premioDisponible
        ? `¡Ya tienes tu ${state.recompensa.toLowerCase()} disponible!`
        : `Acumula ${state.metaPuntos} puntos y gana un ${state.recompensa.toLowerCase()}.`;

      document.getElementById('faltanText').textContent = premioDisponible
        ? 'Ya puedes pedir tu recompensa en caja.'
        : `Te faltan ${faltan} ${faltan === 1 ? 'punto' : 'puntos'} para tu premio.`;

      document.getElementById('promoTitle').textContent = premioDisponible ? 'Premio disponible' : 'Promoción base';
      document.getElementById('promoSubtitle').textContent = premioDisponible
        ? `Muéstrale tu tarjeta al encargado para canjear tu ${state.recompensa.toLowerCase()}.`
        : `Acumula ${state.metaPuntos} puntos y gana un ${state.recompensa.toLowerCase()}.`;

      document.getElementById('perfilPremio').textContent = premioDisponible
        ? `${state.recompensa} disponible`
        : 'Sin premio disponible';

      document.getElementById('qrImage').src = buildQrData(c.qr_id || c.id_cliente);
      renderCups(Number(c.puntos || 0), Number(state.metaPuntos || 10));
      renderMovimientos();
    }

    async function apiGet(params) {
      const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
      const res = await fetch(url);
      return res.json();
    }

    async function loadClientFromServer(id) {
      const data = await apiGet({ action: 'getClient', id });
      if (!data.ok) throw new Error(data.message || 'No se pudo cargar el cliente');
      state.cliente = data.cliente;
      saveLocalCliente(data.cliente);
    }

    async function loadDashboardMeta() {
      try {
        const data = await apiGet({ action: 'getDashboard' });
        if (data.ok && data.dashboard) {
          state.movimientos = (data.dashboard.ultimos_movimientos || []).filter(
            (m) => String(m.id_cliente || '') === String(state.cliente?.id_cliente || '')
          );
        }
      } catch (err) {
        console.warn('No se pudieron cargar movimientos.', err);
      }
    }

    async function hydrateClientApp() {
      const local = getLocalCliente();
      if (!local || !local.id_cliente) {
        showRegister();
        return;
      }

      if (API_URL.includes('PEGAR_AQUI')) {
        const demoCliente = {
          id_cliente: 'CLT001',
          nombre: 'Cliente demo',
          telefono: '',
          correo: '',
          puntos: 4,
          premio_disponible: 'NO',
          qr_id: 'CLT001',
          estado: 'ACTIVO'
        };
        state.cliente = demoCliente;
        state.movimientos = [
          { fecha: new Date().toISOString(), tipo: 'SUMA', id_cliente: 'CLT001' }
        ];
        saveLocalCliente(demoCliente);
        renderCliente();
        showApp();
        return;
      }

      try {
        await loadClientFromServer(local.id_cliente);
        await loadDashboardMeta();
        renderCliente();
        showApp();
      } catch (error) {
        console.error(error);
        showRegister('No se pudo recuperar la cuenta guardada. Regístrala de nuevo o revisa la API.', 'error');
      }
    }

    async function loginExistingClient() {
      const input = loginIdCliente.value.trim();

      if (!input) {
        showLoginFeedback('Ingresa tu teléfono, correo o ID para continuar.', 'error');
        return;
      }

      if (API_URL.includes('PEGAR_AQUI')) {
        const demoCliente = {
          id_cliente: 'CLT001',
          nombre: 'Cliente demo',
          telefono: input.includes('@') ? '' : input,
          correo: input.includes('@') ? input : '',
          puntos: 4,
          premio_disponible: 'NO',
          qr_id: 'CLT001',
          estado: 'ACTIVO'
        };
        state.cliente = demoCliente;
        state.movimientos = [
          { fecha: new Date().toISOString(), tipo: 'SUMA', id_cliente: 'CLT001' }
        ];
        saveLocalCliente(demoCliente);
        renderCliente();
        showApp();
        return;
      }

      try {
        btnIngresarCuenta.disabled = true;
        btnIngresarCuenta.textContent = 'Ingresando...';
        const data = await apiGet({ action: 'getClientAny', input });
        if (!data.ok) throw new Error(data.message || 'No se pudo encontrar la cuenta');
        state.cliente = data.cliente;
        saveLocalCliente(data.cliente);
        await loadDashboardMeta();
        renderCliente();
        showApp();
      } catch (error) {
        showLoginFeedback(error.message || 'No se encontró ninguna cuenta con ese dato.', 'error');
      } finally {
        btnIngresarCuenta.disabled = false;
        btnIngresarCuenta.textContent = 'Ingresar';
      }
    }

    async function registerClient() {
      const nombre = document.getElementById('nombre').value.trim();
      const contacto = contactoInput.value.trim();
      const { telefono, correo } = parseContacto(contacto);

      if (!nombre) {
        showRegister('Ingresa tu nombre para crear la cuenta.', 'error');
        return;
      }

      if (!contacto) {
        showRegister('Ingresa tu teléfono o correo para continuar.', 'error');
        return;
      }

      if (API_URL.includes('PEGAR_AQUI')) {
        const demoCliente = {
          id_cliente: 'CLT001',
          nombre,
          telefono,
          correo,
          puntos: 3,
          premio_disponible: 'NO',
          qr_id: 'CLT001',
          estado: 'ACTIVO'
        };
        state.cliente = demoCliente;
        state.movimientos = [
          { fecha: new Date().toISOString(), tipo: 'SUMA', id_cliente: 'CLT001' },
          { fecha: new Date(Date.now() - 86400000).toISOString(), tipo: 'SUMA', id_cliente: 'CLT001' }
        ];
        saveLocalCliente(demoCliente);
        renderCliente();
        showApp();
        return;
      }

      try {
        btnCrearCuenta.disabled = true;
        btnCrearCuenta.textContent = 'Creando...';
        const data = await apiGet({ action: 'registerClient', nombre, telefono, correo });
        if (!data.ok) throw new Error(data.message || 'No se pudo crear la cuenta');

        state.cliente = data.cliente;
        state.movimientos = [];
        saveLocalCliente(data.cliente);
        renderCliente();
        showApp();
      } catch (error) {
        showRegister(error.message || 'Ocurrió un error al crear la cuenta.', 'error');
      } finally {
        btnCrearCuenta.disabled = false;
        btnCrearCuenta.textContent = 'Crear cuenta';
      }
    }

    function handleNav(tabId) {
      document.querySelectorAll('.tab-panel').forEach((el) => el.classList.add('hidden'));
      document.getElementById(tabId).classList.remove('hidden');
      document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
    }

    function runSelfTests() {
      console.assert(parseContacto('55554444').telefono === '55554444', 'Debe detectar teléfono');
      console.assert(parseContacto('hola@correo.com').correo === 'hola@correo.com', 'Debe detectar correo');
      console.assert(parseContacto('').telefono === '' && parseContacto('').correo === '', 'Vacío debe regresar vacío');
      console.assert(safeText('', 'x') === 'x', 'safeText debe usar fallback');
    }

    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleNav(btn.dataset.tab));
    });

    btnCrearCuenta.addEventListener('click', registerClient);
    btnYaTengoCuenta.addEventListener('click', openLoginModal);
    btnIngresarCuenta.addEventListener('click', loginExistingClient);
    btnCerrarModal.addEventListener('click', closeLoginModal);
    btnCancelarModal.addEventListener('click', closeLoginModal);

    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) closeLoginModal();
    });

    loginIdCliente.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loginExistingClient();
    });

    contactoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') registerClient();
    });

    btnSalir.addEventListener('click', () => {
      clearLocalCliente();
      state.cliente = null;
      state.movimientos = [];
      showRegister();
      handleNav('tabHome');
    });

    btnBorrarCuenta.addEventListener('click', () => {
      clearLocalCliente();
      state.cliente = null;
      state.movimientos = [];
      showRegister('Cuenta eliminada de este dispositivo.', 'ok');
    });

    btnRefresh.addEventListener('click', async () => {
      if (!state.cliente?.id_cliente || API_URL.includes('PEGAR_AQUI')) return;
      try {
        await loadClientFromServer(state.cliente.id_cliente);
        await loadDashboardMeta();
        renderCliente();
      } catch (err) {
        console.error(err);
      }
    });

    applyBranding();
    runSelfTests();
    hydrateClientApp();