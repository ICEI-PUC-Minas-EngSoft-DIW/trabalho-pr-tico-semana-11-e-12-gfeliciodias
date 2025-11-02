/* public/js/app.js
   CRUD completo para a entidade "roupas" usando JSON Server em http://localhost:3000/roupas
   Funcionalidades:
   - index.html: listar roupas, excluir localmente com confirmação e link para detalhes/edição
   - detalhes.html: mostrar roupa por id, editar e excluir
   - cadastro_roupa.html: criar nova roupa (POST) ou editar (PUT) quando ?id=...
   - validação mínima de formulário, estados de loading, mensagens (toast)
*/

/* CONFIG */    
const API_BASE = 'http://localhost:3000'; // apenas a base do servidor
const RESOURCE = 'roupas';               // nome da coleção no db.json
const API_URL = `${API_BASE}/${RESOURCE}`; // http://localhost:3000/roupas

/* UTILITÁRIOS */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from((root || document).querySelectorAll(sel)); }

function formatCurrencyBR(value) {
  if (isNaN(Number(value))) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function showToast(message, type = 'info', timeout = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.right = '20px';
  toast.style.bottom = '20px';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
  toast.style.zIndex = 9999;
  toast.style.fontWeight = '600';
  toast.style.background = (type === 'error') ? '#c92a2a' : (type === 'success') ? '#3aa35a' : '#6a0dad';
  toast.style.color = '#fff';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, timeout);
}

/* FETCH WRAPPER */
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${res.statusText} ${text ? `: ${text}` : ''}`);
    }
    // Some responses (204) have no content
    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    console.error('apiFetch erro:', err);
    throw err;
  }
}

/* ========== INDEX (lista) ========== */
async function carregarListaRoupas() {
  const ul = qs('#lista-roupas');
  if (!ul) return;
  ul.innerHTML = '<li>Carregando...</li>';
  try {
    const roupas = await apiFetch(`${API_URL}`);
    if (!Array.isArray(roupas) || roupas.length === 0) {
      ul.innerHTML = '<li>Nenhuma roupa cadastrada.</li>';
      return;
    }
    ul.innerHTML = roupas.map(r => itemLiTemplate(r)).join('');
    // adiciona listeners nos botões de excluir (delegation não é usado para simplicidade)
    qsa('.btn-excluir').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        if (!confirm('Tem certeza que deseja excluir esta roupa?')) return;
        try {
          btn.disabled = true;
          btn.textContent = 'Excluindo...';
          await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
          // remover item do DOM
          const li = btn.closest('li');
          if (li) li.remove();
          showToast('Roupa excluída com sucesso.', 'success');
        } catch (err) {
          showToast('Erro ao excluir. Veja o console.', 'error');
          btn.disabled = false;
          btn.textContent = 'Excluir';
        }
      });
    });
    // adiciona listener nos botões de editar (opcional)
    qsa('.btn-editar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        window.location.href = `cadastro_roupa.html?id=${id}`;
      });
    });
  } catch (err) {
    ul.innerHTML = '<li>Erro ao carregar lista. Abra o console.</li>';
    showToast('Erro ao carregar lista. Ver console.', 'error');
  }
}

function itemLiTemplate(r) {
  const nome = escapeHtml(r.nome || '—');
  const preco = (r.preco !== undefined) ? formatCurrencyBR(r.preco) : '—';
  const tamanho = escapeHtml(r.tamanho || '-');
  const imagem = r.imagem ? `<img src="${escapeAttr(r.imagem)}" alt="${nome}" class="thumb">` : '';
  return `
    <li class="roupa-item" data-id="${r.id}">
      <div style="display:flex;align-items:center;gap:12px;">
        ${imagem}
        <div>
          <a href="detalhes.html?id=${r.id}" class="link-nome">${nome}</a>
          <div class="sub">${tamanho} • ${preco}</div>
        </div>
      </div>
      <div>
        <button class="btn btn-editar" data-id="${r.id}" title="Editar">Editar</button>
        <button class="btn btn-excluir" data-id="${r.id}" title="Excluir">Excluir</button>
      </div>
    </li>
  `;
}

/* ========== DETALHES ========== */
async function carregarDetalhes() {
  const container = qs('#detalhes-roupa');
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    container.innerHTML = '<p>ID não fornecido na query string.</p>';
    return;
  }
  container.innerHTML = '<p>Carregando...</p>';
  try {
    const roupa = await apiFetch(`${API_URL}/${id}`);
    if (!roupa) {
      container.innerHTML = '<p>Roupa não encontrada.</p>';
      return;
    }
    container.innerHTML = detalheTemplate(roupa);
    // configurar botões
    const btnEditar = qs('#btn-editar');
    const btnExcluir = qs('#btn-excluir');
    if (btnEditar) btnEditar.addEventListener('click', () => {
      window.location.href = `cadastro_roupa.html?id=${id}`;
    });
    if (btnExcluir) btnExcluir.addEventListener('click', async () => {
      if (!confirm('Deseja realmente excluir esta roupa?')) return;
      try {
        btnExcluir.disabled = true;
        btnExcluir.textContent = 'Excluindo...';
        await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
        showToast('Roupa excluída com sucesso.', 'success');
        setTimeout(() => window.location.href = 'index.html', 800);
      } catch (err) {
        showToast('Erro ao excluir. Veja o console.', 'error');
        btnExcluir.disabled = false;
        btnExcluir.textContent = 'Excluir';
      }
    });
  } catch (err) {
    container.innerHTML = '<p>Erro ao obter detalhes. Ver console.</p>';
    showToast('Erro ao carregar detalhes. Ver console.', 'error');
  }
}

function detalheTemplate(r) {
  const imgHtml = r.imagem ? `<img src="${escapeAttr(r.imagem)}" alt="${escapeHtml(r.nome)}" class="detalhe-img">` : '';
  const preco = (r.preco !== undefined) ? formatCurrencyBR(r.preco) : '—';
  return `
    <div class="card-detalhe-top" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
      ${imgHtml}
      <div>
        <h3>${escapeHtml(r.nome)}</h3>
        <p class="sub">${escapeHtml(r.tamanho || '')} • ${preco}</p>
        <p style="margin-top:8px;">${escapeHtml(r.descricao || '—')}</p>
        <p style="margin-top:10px;color:#bfbfbf;font-size:.95rem;"><strong>ID:</strong> ${r.id}</p>
      </div>
    </div>
  `;
}

/* ========== CADASTRO (CREATE / UPDATE) ========== */
async function setupFormCadastro() {
  const form = qs('#form-roupa');
  if (!form) return;

  const btnSubmit = form.querySelector('button[type="submit"]');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  let isEdit = false;
  let originalData = null;

  if (id) {
    isEdit = true;
    // carregar dados e preencher form
    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Carregando...';
      const roupa = await apiFetch(`${API_URL}/${id}`);
      if (!roupa) {
        showToast('Roupa não encontrada para edição.', 'error');
        return;
      }
      originalData = roupa;
      form.nome.value = roupa.nome || '';
      form.descricao.value = roupa.descricao || '';
      form.tamanho.value = roupa.tamanho || '';
      form.preco.value = roupa.preco !== undefined ? roupa.preco : '';
      form.imagem.value = roupa.imagem || '';
      btnSubmit.disabled = false;
      btnSubmit.textContent = isEdit ? 'Salvar alterações' : 'Salvar';
    } catch (err) {
      showToast('Erro ao carregar dados para edição.', 'error');
      btnSubmit.disabled = false;
      btnSubmit.textContent = isEdit ? 'Salvar alterações' : 'Salvar';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // coleta e valida
    const data = {
      nome: form.nome.value.trim(),
      descricao: form.descricao.value.trim(),
      tamanho: form.tamanho.value,
      preco: form.preco.value !== '' ? Number(form.preco.value) : null,
      imagem: form.imagem.value.trim() || null
    };
    // validações
    const validationError = validarRoupa(data);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = isEdit ? 'Salvando...' : 'Criando...';

      if (isEdit) {
        // Mantém o id no payload (JSON Server prefere PUT com o id)
        const payload = Object.assign({}, data, { id: Number(id) });
        await apiFetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Roupa atualizada com sucesso.', 'success');
        // redireciona para detalhes
        setTimeout(() => window.location.href = `detalhes.html?id=${id}`, 700);
      } else {
        // POST cria novo recurso
        const payload = Object.assign({}, data);
        const criado = await apiFetch(`${API_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Roupa criada com sucesso.', 'success');
        setTimeout(() => window.location.href = `detalhes.html?id=${criado.id}`, 700);
      }
    } catch (err) {
      console.error('Erro salvar roupa:', err);
      showToast('Erro ao salvar. Veja o console.', 'error');
      btnSubmit.disabled = false;
      btnSubmit.textContent = isEdit ? 'Salvar alterações' : 'Salvar';
    }
  });
}

function validarRoupa(data) {
  if (!data.nome || data.nome.length < 2) return 'Nome deve ter ao menos 2 caracteres.';
  if (!data.descricao || data.descricao.length < 5) return 'Descrição muito curta.';
  if (!data.tamanho) return 'Selecione um tamanho.';
  if (data.preco === null || isNaN(data.preco) || Number(data.preco) < 0) return 'Informe um preço válido.';
  // imagem é opcional, se informado deve ser URL
  if (data.imagem && !isValidUrl(data.imagem)) return 'URL da imagem inválida.';
  return null;
}

function isValidUrl(val) {
  try {
    if (!val) return false;
    const u = new URL(val);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

/* ========== ESCAPES SIMPLES PARA SEGURANÇA (DOM) ========== */
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function escapeAttr(str = '') {
  return escapeHtml(str).replaceAll('"', '&quot;');
}

/* ========== INICIALIZAÇÃO CONDICIONAL POR PÁGINA ========== */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();
  if (path === '' || path === 'index.html') {
    carregarListaRoupas();
  } else if (path === 'detalhes.html') {
    carregarDetalhes();
  } else if (path === 'cadastro_roupa.html') {
    setupFormCadastro();
  }

  // adiciona estilos mínimos para thumbs (se existirem)
  const style = document.createElement('style');
  style.textContent = `
    .thumb { width:56px; height:56px; object-fit:cover; border-radius:6px; border:1px solid rgba(255,255,255,0.06); }
    .detalhe-img { max-width:220px; width:100%; border-radius:8px; object-fit:cover; }
    .sub { color:#bfbfbf; font-size:0.95rem; margin-top:4px; }
    .link-nome { font-weight:700; color:inherit; text-decoration:none; font-size:1.02rem; }
    .roupa-item { display:flex; justify-content:space-between; align-items:center; gap:12px; }
  `;
  document.head.appendChild(style);
});
