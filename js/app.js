/* =========================================================
   js/app.js -- Renderizacao do cardapio, modal de produto,
   busca, menu mobile, galeria "direto da brasa" e conta.

   ESTE ARQUIVO NAO EXISTIA NO PROJETO ENVIADO. index.html
   carrega <script src="js/app.js"></script> mas o arquivo
   nunca foi incluido no zip -- por isso nada no site
   funcionava: nenhum onclick (menu, busca, carrinho, conta,
   filtros) tinha uma funcao correspondente, e o cardapio
   nunca era desenhado na tela. Este arquivo foi reconstruido
   a partir dos ids/classes ja usados no HTML e no CSS.
   ========================================================= */

let itemAtualModal = null;   // produto aberto no pm-overlay
let opcaoSelecionadaPm = null;
let itemAtualSheet = null;   // produto aberto no sz-ov (selecao rapida)
let opcaoSelecionadaSheet = null;

/* ---------------------------------------------------------
   Barra de progresso de leitura
   --------------------------------------------------------- */
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight || 1) * 100;
  const bar = document.getElementById('prog');
  if (bar) bar.style.width = pct + '%';
});

/* ---------------------------------------------------------
   Menu mobile
   --------------------------------------------------------- */
function toggleMobileMenu() {
  document.getElementById('mobileMenu')?.classList.toggle('open');
  document.getElementById('mobileMenuOv')?.classList.toggle('open');
}

/* ---------------------------------------------------------
   Hero slider
   --------------------------------------------------------- */
function goSlide(i) {
  const slides = document.querySelectorAll('.hero-slide');
  slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
  document.querySelectorAll('.hero-dots').forEach(dotsRow => {
    dotsRow.querySelectorAll('.hero-dot').forEach((d, idx) => d.classList.toggle('active', idx === i));
  });
}

/* ---------------------------------------------------------
   Renderizacao do cardapio (secao #collections)
   --------------------------------------------------------- */
function renderCollections(filtroCategoria) {
  filtroCategoria = filtroCategoria || 'todos';
  const data = getData();
  const panels = document.getElementById('colPanels');
  if (!panels) return;

  panels.innerHTML = Object.keys(data).map(categoria => {
    const visivel = filtroCategoria === 'todos' || filtroCategoria === categoria;
    const subFiltros = TYPE_FILTERS[categoria] || [['todos', 'TODOS']];
    const temSubFiltro = subFiltros.length > 1;

    const cardsHtml = data[categoria].map(item => cardHtml(item, categoria)).join('');

    return `
      <div class="col-panel" data-categoria="${categoria}" style="display:${visivel ? 'block' : 'none'}">
        <h3 class="sec-tag" style="text-align:left;margin:0 4rem 1rem;">${categoria}</h3>
        ${temSubFiltro ? `
          <div class="type-filters" data-subfiltro-de="${categoria}">
            ${subFiltros.map(([tipo, label], idx) => `<button class="tf-btn ${idx === 0 ? 'on' : ''}" data-subtipo="${tipo}" onclick="filtrarSubtipo('${categoria}','${tipo}',this)">${label}</button>`).join('')}
          </div>` : ''}
        <div class="products-grid">${cardsHtml}</div>
      </div>`;
  }).join('');
}

function cardHtml(item, categoria) {
  const nomeAttr = item.name.replace(/'/g, "\\'");
  return `
    <div class="card ${item.esgotado ? 'esgotado' : ''}" data-nome="${esc(item.name)}" data-subtipo="${item.type}" onclick="openProductModal('${nomeAttr}')">
      <div class="card-img">
        <span class="plate-emoji" aria-hidden="true">${monogramaGrande(item.name)}</span>
        <span class="card-esgotado-badge">Esgotado</span>
      </div>
      <div class="card-info">
        <div class="card-name">${esc(item.name)}</div>
        <div class="card-desc">${esc(item.desc || '')}</div>
        <div class="card-row">
          <span class="card-price">${fmtBR(item.price)}</span>
          <button class="add-btn" onclick="event.stopPropagation(); quickAdd('${nomeAttr}')">${item.opcoes && item.opcoes.length ? 'escolher' : 'adicionar'}</button>
        </div>
      </div>
    </div>`;
}

function monogramaGrande(nome) {
  return esc(String(nome || '?').trim().charAt(0).toUpperCase());
}

function filtrarSubtipo(categoria, tipo, btn) {
  const painel = document.querySelector(`.col-panel[data-categoria="${categoria}"]`);
  if (!painel) return;
  painel.querySelectorAll('.type-filters .tf-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  painel.querySelectorAll('.card').forEach(card => {
    const mostra = tipo === 'todos' || card.dataset.subtipo === tipo;
    card.style.display = mostra ? '' : 'none';
  });
}

function filterAndScroll(categoria) {
  document.querySelectorAll('#typeFilters .tf-btn').forEach(b => b.classList.toggle('on', b.dataset.type === categoria));
  renderCollections(categoria);
  document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
}

/* liga os botoes da barra de filtro principal (#typeFilters) */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#typeFilters .tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#typeFilters .tf-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      renderCollections(btn.dataset.type);
    });
  });
});

/* ---------------------------------------------------------
   Vitrine "Direto da brasa" -- itens em destaque (rating alto)
   --------------------------------------------------------- */
function renderLookbook() {
  const grid = document.getElementById('lbGrid');
  if (!grid) return;
  const data = getData();
  const todos = Object.values(data).flat();
  const destaques = todos.filter(i => !i.esgotado).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
  grid.innerHTML = destaques.map(item => `
    <div class="lb-item" onclick="openProductModal('${item.name.replace(/'/g, "\\'")}')">
      <span class="lb-emoji">${monogramaGrande(item.name)}</span>
      <div class="lb-label">${esc(item.name)}</div>
      <div class="lb-sublabel">${fmtBR(item.price)}</div>
    </div>`).join('');
}

/* ---------------------------------------------------------
   Modal de selecao rapida (sz-ov) -- usado pelo botao
   "escolher" do card quando o item tem opcoes (ponto/tamanho)
   --------------------------------------------------------- */
function quickAdd(nome) {
  const item = window.MENU_BENZA[nome];
  if (!item) return;
  if (!item.opcoes || !item.opcoes.length) {
    addToCart(nome, '');
    return;
  }
  itemAtualSheet = nome;
  opcaoSelecionadaSheet = null;
  document.getElementById('szName').textContent = item.name;
  document.getElementById('szSub').textContent = item.opcaoLabel || 'Escolha uma opcao';
  document.getElementById('szGrid').innerHTML = item.opcoes.map(op => `<button class="sz" data-op="${esc(op)}" onclick="selecionarOpcaoSheet('${op.replace(/'/g, "\\'")}', this)">${esc(op)}</button>`).join('');
  const confBtn = document.getElementById('confBtn');
  confBtn.disabled = true;
  confBtn.textContent = 'selecione uma opcao';
  document.getElementById('szOv')?.classList.add('on');
}

function selecionarOpcaoSheet(op, btn) {
  opcaoSelecionadaSheet = op;
  document.querySelectorAll('#szGrid .sz').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const confBtn = document.getElementById('confBtn');
  confBtn.disabled = false;
  confBtn.textContent = 'adicionar a sacola';
}

function confirmAdd() {
  if (!itemAtualSheet || !opcaoSelecionadaSheet) return;
  addToCart(itemAtualSheet, opcaoSelecionadaSheet);
  document.getElementById('szOv')?.classList.remove('on');
  itemAtualSheet = null;
  opcaoSelecionadaSheet = null;
}

/* ---------------------------------------------------------
   Modal completo de produto (pm-overlay)
   --------------------------------------------------------- */
function openProductModal(nome) {
  const item = window.MENU_BENZA[nome];
  if (!item) return;
  itemAtualModal = nome;
  opcaoSelecionadaPm = null;

  document.getElementById('pmMainEmoji').textContent = monogramaGrande(nome);
  document.getElementById('pmName').textContent = item.name;
  document.getElementById('pmRating').textContent = item.rating ? `${'\u2605'.repeat(Math.round(item.rating))} (${item.ratingCount || 0})` : '';
  document.getElementById('pmPrice').textContent = fmtBR(item.price);
  document.getElementById('pmDesc').textContent = item.desc || '';

  const wrap = document.getElementById('pmOpcaoWrap');
  const addBtn = document.getElementById('pmAddBtn');
  if (item.opcoes && item.opcoes.length) {
    wrap.style.display = '';
    document.getElementById('pmOpcaoLabel').textContent = (item.opcaoLabel || 'Opcao') + ':';
    document.getElementById('pmSzGrid').innerHTML = item.opcoes.map(op => `<button class="pm-sz" data-op="${esc(op)}" onclick="selecionarOpcaoPm('${op.replace(/'/g, "\\'")}', this)">${esc(op)}</button>`).join('');
    addBtn.disabled = true;
    addBtn.textContent = 'selecione uma opcao';
  } else {
    wrap.style.display = 'none';
    addBtn.disabled = item.esgotado === true;
    addBtn.textContent = item.esgotado ? 'esgotado' : 'adicionar a sacola';
  }

  document.getElementById('productModalOv').classList.add('on');
}

function selecionarOpcaoPm(op, btn) {
  opcaoSelecionadaPm = op;
  document.querySelectorAll('#pmSzGrid .pm-sz').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const addBtn = document.getElementById('pmAddBtn');
  addBtn.disabled = false;
  addBtn.textContent = 'adicionar a sacola';
}

function closeProductModal() {
  document.getElementById('productModalOv')?.classList.remove('on');
  itemAtualModal = null;
  opcaoSelecionadaPm = null;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pmAddBtn')?.addEventListener('click', () => {
    if (!itemAtualModal) return;
    const item = window.MENU_BENZA[itemAtualModal];
    if (item.opcoes && item.opcoes.length && !opcaoSelecionadaPm) return;
    addToCart(itemAtualModal, opcaoSelecionadaPm || '');
    closeProductModal();
  });
});

/* ---------------------------------------------------------
   Busca
   --------------------------------------------------------- */
function toggleSearch() {
  document.getElementById('searchOverlay')?.classList.toggle('open');
  document.getElementById('searchBar')?.classList.toggle('open');
  document.getElementById('searchInput')?.focus();
}
function closeSearch(ev) {
  if (ev && ev.target !== ev.currentTarget) return;
  document.getElementById('searchOverlay')?.classList.remove('open');
  document.getElementById('searchBar')?.classList.remove('open');
}
function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  filterSearch('');
}
function quickSearch(termo) {
  const input = document.getElementById('searchInput');
  if (input) input.value = termo;
  filterSearch(termo);
}
function filterSearch(termo) {
  const clearBtn = document.getElementById('searchClear');
  const results = document.getElementById('searchResults');
  const empty = document.getElementById('searchEmpty');
  termo = (termo || '').trim().toLowerCase();

  if (clearBtn) clearBtn.style.display = termo ? 'inline-flex' : 'none';
  if (!termo) {
    if (results) results.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (!results) return;

  const todos = Object.values(getData()).flat();
  const achados = todos.filter(i => i.name.toLowerCase().includes(termo) || (i.type || '').toLowerCase().includes(termo));

  results.style.display = 'block';
  results.innerHTML = (achados.length ? `<p class="search-results-title">${achados.length} resultado(s)</p>` : '') +
    (achados.length
      ? achados.map(i => `
        <div class="search-result-item" onclick="toggleSearch(); openProductModal('${i.name.replace(/'/g, "\\'")}')">
          <div class="search-result-img">${monogramaGrande(i.name)}</div>
          <div class="search-result-info">
            <div class="search-result-name">${esc(i.name)}</div>
            <div class="search-result-col">${esc(i.type)}</div>
          </div>
          <div class="search-result-price">${fmtBR(i.price)}</div>
        </div>`).join('')
      : `<p class="search-no-result">Nenhum item encontrado para "${esc(termo)}".</p>`);
}

/* ---------------------------------------------------------
   Conta (login/cadastro) -- versao simples, guardada no
   navegador (localStorage). Nao ha tabela de usuarios no
   Supabase deste projeto; isso e apenas para o fluxo de
   UI nao quebrar. Pedidos NAO dependem de estar logado.
   --------------------------------------------------------- */
function toggleAuth() {
  document.getElementById('authOverlay')?.classList.toggle('open');
  document.getElementById('authModal')?.classList.toggle('open');
}
function closeAuth() {
  document.getElementById('authOverlay')?.classList.remove('open');
  document.getElementById('authModal')?.classList.remove('open');
}
function switchTab(tab) {
  document.getElementById('tabLogin')?.classList.toggle('active', tab === 'login');
  document.getElementById('tabCadastro')?.classList.toggle('active', tab === 'cadastro');
  document.getElementById('panelLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('panelCadastro').style.display = tab === 'cadastro' ? 'block' : 'none';
}
function maskCpf(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  input.value = v;
}
async function authFillCep(cepValor, prefixo) {
  const cep = String(cepValor || '').replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await r.json();
    if (data.erro) return;
    const map = { Rua: 'rua', Bairro: 'bairro', Cidade: 'cidade', UF: 'uf' };
    if (document.getElementById(prefixo + 'Rua')) document.getElementById(prefixo + 'Rua').value = data.logradouro || '';
    if (document.getElementById(prefixo + 'Bairro')) document.getElementById(prefixo + 'Bairro').value = data.bairro || '';
    if (document.getElementById(prefixo + 'Cidade')) document.getElementById(prefixo + 'Cidade').value = data.localidade || '';
    if (document.getElementById(prefixo + 'UF')) document.getElementById(prefixo + 'UF').value = data.uf || '';
  } catch (e) { console.warn('Erro ao consultar CEP', e); }
}

function getContaLogada() {
  try { return JSON.parse(localStorage.getItem('benza_conta') || 'null'); } catch (e) { return null; }
}

function fazerLogin() {
  const email = (document.getElementById('loginEmail')?.value || '').trim();
  const senha = document.getElementById('loginSenha')?.value || '';
  if (!email || !senha) { showToast('Preencha e-mail e senha'); return; }
  const conta = getContaLogada();
  if (!conta || conta.email !== email) { showToast('Conta nao encontrada. Cadastre-se.'); return; }
  mostrarLogado(conta);
  showToast('Login realizado');
}

function fazerCadastro() {
  const nome = (document.getElementById('cadNome')?.value || '').trim();
  const email = (document.getElementById('cadEmail')?.value || '').trim();
  if (!nome || !email) { showToast('Preencha nome e e-mail'); return; }
  const conta = {
    nome, email,
    cpf: document.getElementById('cadCpf')?.value || '',
    telefone: document.getElementById('cadPhone')?.value || '',
    endereco: {
      cep: document.getElementById('cadCep')?.value || '',
      rua: document.getElementById('cadRua')?.value || '',
      numero: document.getElementById('cadNum')?.value || '',
      complemento: document.getElementById('cadComp')?.value || '',
      bairro: document.getElementById('cadBairro')?.value || '',
      cidade: document.getElementById('cadCidade')?.value || '',
      uf: document.getElementById('cadUF')?.value || ''
    }
  };
  localStorage.setItem('benza_conta', JSON.stringify(conta));
  mostrarLogado(conta);
  showToast('Conta criada');
}

function mostrarLogado(conta) {
  document.getElementById('panelLogin').style.display = 'none';
  document.getElementById('panelCadastro').style.display = 'none';
  document.getElementById('panelLogado').style.display = 'block';
  document.getElementById('authTabs').style.display = 'none';
  document.getElementById('authAvatarInitial').textContent = conta.nome.charAt(0).toUpperCase();
  document.getElementById('authAvatarName').textContent = conta.nome;
  document.getElementById('authAvatarEmail').textContent = conta.email;
  document.getElementById('btnConta')?.classList.add('logado');
}

function fazerLogout() {
  document.getElementById('panelLogado').style.display = 'none';
  document.getElementById('authTabs').style.display = 'flex';
  switchTab('login');
  document.getElementById('btnConta')?.classList.remove('logado');
  showToast('Voce saiu da conta');
}

function showProfilePanel(nome) {
  ['pedidos', 'dados', 'endereco'].forEach(p => {
    document.getElementById('profile' + p.charAt(0).toUpperCase() + p.slice(1)).style.display = p === nome ? 'block' : 'none';
  });
  document.querySelectorAll('.profile-tab').forEach((b, idx) => b.classList.toggle('active', ['pedidos', 'dados', 'endereco'][idx] === nome));
}

function salvarDados() {
  const conta = getContaLogada();
  if (!conta) return;
  conta.nome = document.getElementById('editNome')?.value || conta.nome;
  conta.telefone = document.getElementById('editPhone')?.value || conta.telefone;
  localStorage.setItem('benza_conta', JSON.stringify(conta));
  showToast('Dados salvos');
}

function salvarEndereco() {
  const conta = getContaLogada();
  if (!conta) return;
  conta.endereco = {
    cep: document.getElementById('editCep')?.value || '',
    rua: document.getElementById('editRua')?.value || '',
    numero: document.getElementById('editNum')?.value || '',
    complemento: document.getElementById('editComp')?.value || '',
    bairro: document.getElementById('editBairro')?.value || '',
    cidade: document.getElementById('editCidade')?.value || '',
    uf: document.getElementById('editUF')?.value || ''
  };
  localStorage.setItem('benza_conta', JSON.stringify(conta));
  showToast('Endereco salvo');
}

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderCollections('todos');
  renderLookbook();
  const contaSalva = getContaLogada();
  if (contaSalva) mostrarLogado(contaSalva);
});
