/* =========================================================
   js/cart.js -- Carrinho, checkout, entrega por bairro,
   cupom, Pix estatico e Mercado Pago da Benza Burguer.

   CORRIGIDO: a versao anterior deste arquivo tinha sido
   copiada de outro projeto (ids como cartCount/cartList/
   ckOverlay/ckComplemento, e a global window.MENU_MOREIRAS)
   e nunca foi adaptada para o HTML real da Benza Burguer.
   Por isso nenhum pedido conseguia ser lancado: as funcoes
   liam e escreviam em elementos que nao existem na pagina.
   ========================================================= */

const PIX_KEY          = 'COLOQUE_AQUI_A_CHAVE_PIX';
const PIX_MERCHANT     = 'BENZA BURGUER';
const PIX_CITY         = 'POCOS DE CALDAS';
const MP_BACKEND_URL   = '/api/criar-pagamento';

let cart = [];
let cupomAtivo = null;
let taxaEntregaAtual = 0;

function el(id) { return document.getElementById(id); }
function fmtBR(n) { return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ','); }
function parseBR(s) { return Number(String(s || '0').replace(/[^\d,-]/g, '').replace(',', '.')) || 0; }

/* ---------------------------------------------------------
   Toast (usado por este arquivo e por app.js)
   --------------------------------------------------------- */
function showToast(msg) {
  const t = el('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}

/* ---------------------------------------------------------
   Helper Supabase (mesmo padrao do painel admin)
   --------------------------------------------------------- */
async function supa(path, opts = {}) {
  if (!SUPA_URL || !SUPA_URL.startsWith('http')) return [];
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPA_ANON,
      Authorization: `Bearer ${SUPA_ANON}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {})
    }
  });
  if (!r.ok) {
    console.warn('Supabase erro', path, r.status, await r.text().catch(() => ''));
    return [];
  }
  const text = await r.text();
  return text ? JSON.parse(text) : [];
}

function itemDisponivel(name) {
  const item = window.MENU_BENZA && window.MENU_BENZA[name];
  return !!item && !item.esgotado;
}

/* ---------------------------------------------------------
   Adicionar item ao carrinho
   --------------------------------------------------------- */
function addToCart(name, opcao) {
  const menuItem = window.MENU_BENZA ? window.MENU_BENZA[name] : null;
  if (!menuItem) { console.warn('Item nao encontrado no cardapio:', name); return; }
  if (!itemDisponivel(name)) { showToast(name + ' esta indisponivel no momento'); return; }

  const existing = cart.find(c => c.name === name && (c.opcao || '') === (opcao || ''));
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price: menuItem.price, qty: 1, opcao: opcao || '' });
  }

  renderCart();
  showToast(name + ' adicionado a sacola');
}

function changeQty(i, delta) {
  if (!cart[i]) return;
  cart[i].qty += delta;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  renderCart();
}

function removeItem(i) {
  cart.splice(i, 1);
  renderCart();
}

function getSubtotal() {
  return cart.reduce((s, c) => s + c.price * c.qty, 0);
}

/* ---------------------------------------------------------
   Render do carrinho (drawer) -- ids reais do index.html:
   cartQtyLbl, cartBody, cartFt, cartSubLbl, cartShipLbl,
   cartTotalLbl (NAO cartCount / cartList / cartTotal)
   --------------------------------------------------------- */
function renderCart() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const sub = getSubtotal();

  if (el('cartQtyLbl')) el('cartQtyLbl').textContent = count;
  if (el('badge')) {
    el('badge').textContent = count;
    el('badge').classList.toggle('on', count > 0);
  }

  const body = el('cartBody');
  if (body) {
    if (!cart.length) {
      body.innerHTML = '<div class="cart-empty-msg">sua sacola esta vazia</div>';
    } else {
      body.innerHTML = cart.map((c, i) => `
        <div class="ci">
          <div class="ci-emoji">${monograma(c.name)}</div>
          <div class="ci-info">
            <div class="ci-name">${esc(c.name)}</div>
            ${c.opcao ? `<div class="ci-meta">${esc(c.opcao)}</div>` : ''}
            <div class="ci-bot">
              <div class="qty">
                <button onclick="changeQty(${i},-1)">-</button>
                <span>${c.qty}</span>
                <button onclick="changeQty(${i},1)">+</button>
              </div>
              <span class="ci-price">${fmtBR(c.price * c.qty)}</span>
            </div>
          </div>
          <button class="rm" onclick="removeItem(${i})" title="Remover">remover</button>
        </div>`).join('');
    }
  }

  const ft = el('cartFt');
  if (ft) ft.style.display = cart.length ? 'block' : 'none';

  if (el('cartSubLbl')) el('cartSubLbl').textContent = fmtBR(sub);
  if (el('cartShipLbl')) el('cartShipLbl').textContent = fmtBR(getTaxaEntrega());
  if (el('cartTotalLbl')) el('cartTotalLbl').textContent = fmtBR(Math.max(0, sub - getDesconto(sub) + getTaxaEntrega()));

  recalcTotal();
}

/* iniciais do nome do produto -- usado no lugar do emoji nos
   "cards" de carrinho/checkout (ver diagnostico: emojis removidos) */
function monograma(nome) {
  return esc(String(nome || '?').trim().charAt(0).toUpperCase());
}

function toggleCart() {
  el('cartSb')?.classList.toggle('on');
  el('cartOv')?.classList.toggle('on');
}

function closeCart() {
  el('cartSb')?.classList.remove('on');
  el('cartOv')?.classList.remove('on');
}

/* ---------------------------------------------------------
   Cupom
   --------------------------------------------------------- */
async function aplicarCupom() {
  const codigo = (el('ckCupom')?.value || '').trim().toUpperCase();
  const msg = el('cupomMsg');
  if (!codigo) return;

  const rows = await supa(`cupons?codigo=eq.${encodeURIComponent(codigo)}&select=*`);
  const info = rows[0];

  if (!info || !info.ativo) {
    cupomAtivo = null;
    if (msg) { msg.style.display = 'block'; msg.textContent = 'Cupom invalido ou expirado'; msg.className = 'cupom-msg erro'; }
    recalcTotal();
    return;
  }
  cupomAtivo = info;
  if (msg) {
    msg.style.display = 'block';
    msg.textContent = info.tipo === 'percentual'
      ? `Cupom ${codigo} aplicado: ${info.valor}% de desconto`
      : `Cupom ${codigo} aplicado: ${fmtBR(info.valor)} de desconto`;
    msg.className = 'cupom-msg ok';
  }
  recalcTotal();
}

function getDesconto(sub) {
  if (!cupomAtivo) return 0;
  if (cupomAtivo.tipo === 'percentual') return sub * (cupomAtivo.valor / 100);
  return Math.min(sub, cupomAtivo.valor);
}

/* ---------------------------------------------------------
   Entrega por bairro (tabela bairros_entrega no Supabase,
   a mesma que o painel admin edita em "Bairros de entrega")
   --------------------------------------------------------- */
window.BAIRROS_CACHE = {};

async function carregarBairrosPublico() {
  const rows = await supa('bairros_entrega?select=bairro,taxa,tempo_min&ativo=eq.true&order=bairro.asc');
  window.BAIRROS_CACHE = {};
  rows.forEach(r => {
    window.BAIRROS_CACHE[String(r.bairro).trim().toLowerCase()] = {
      nome: r.bairro, taxa: Number(r.taxa) || 0, tempo: r.tempo_min
    };
  });
  window.dispatchEvent(new CustomEvent('bairros:carregados'));
}

function getTaxaEntrega() {
  const opt = document.querySelector('input[name="shipOpt"]:checked')?.value || 'entrega';
  if (opt === 'retirada') return 0;
  return taxaEntregaAtual;
}

/* calcula a taxa a partir do bairro digitado no campo #ckBairro,
   usando a tabela carregada de bairros_entrega */
function calcFrete() {
  const bairroDigitado = (el('ckBairro')?.value || '').trim();
  const resultBox = el('ckFreteResult');
  if (!bairroDigitado) {
    taxaEntregaAtual = 0;
    if (resultBox) resultBox.style.display = 'none';
    recalcTotal();
    return;
  }
  const info = window.BAIRROS_CACHE[bairroDigitado.toLowerCase()];
  if (info) {
    taxaEntregaAtual = info.taxa;
    if (el('shipEntregaLbl')) el('shipEntregaLbl').textContent = fmtBR(info.taxa) + ' \u00b7 ~' + info.tempo + ' min';
    if (el('shipEtaText')) el('shipEtaText').textContent = 'Entrega estimada em ' + info.tempo + ' minutos para ' + info.nome + '.';
  } else {
    // bairro nao cadastrado -- nao bloqueia o pedido, mas avisa que a
    // taxa sera combinada manualmente (evita perder o pedido de teste)
    taxaEntregaAtual = 0;
    if (el('shipEntregaLbl')) el('shipEntregaLbl').textContent = 'a combinar';
    if (el('shipEtaText')) el('shipEtaText').textContent = 'Bairro fora da lista de entrega automatica -- taxa sera combinada por WhatsApp.';
  }
  if (resultBox) resultBox.style.display = 'block';
  applyShipping();
}

function applyShipping() {
  recalcTotal();
  renderCart();
}

/* consulta ViaCEP e preenche rua/bairro/cidade/UF automaticamente */
async function autoFillEndereco(cepValor) {
  const cep = String(cepValor || '').replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await r.json();
    if (data.erro) { showToast('CEP nao encontrado'); return; }
    if (el('ckAddr')) el('ckAddr').value = data.logradouro || '';
    if (el('ckBairro')) el('ckBairro').value = data.bairro || '';
    if (el('ckCidade')) el('ckCidade').value = data.localidade || '';
    if (el('ckUF')) el('ckUF').value = data.uf || '';
    if (el('ckCep') && !el('ckCep').value) el('ckCep').value = cepValor;
    calcFrete();
  } catch (e) {
    console.warn('Erro ao consultar ViaCEP', e);
  }
}

function selectPayOpt(opt) {
  el('optMPLabel')?.style.setProperty('border-color', opt === 'mp' ? 'var(--vinho)' : 'var(--border)');
  el('optPixLabel')?.style.setProperty('border-color', opt === 'pix' ? 'var(--vinho)' : 'var(--border)');
}

/* ---------------------------------------------------------
   Totais do checkout
   --------------------------------------------------------- */
function recalcTotal() {
  const sub = getSubtotal();
  const desconto = getDesconto(sub);
  const taxa = getTaxaEntrega();
  const total = Math.max(0, sub - desconto + taxa);

  if (el('ckSummary')) {
    if (!cart.length) {
      el('ckSummary').innerHTML = 'Sua sacola esta vazia.';
      el('ckSummary').classList.add('empty');
    } else {
      el('ckSummary').classList.remove('empty');
      el('ckSummary').innerHTML = cart.map(c => `
        <div class="ck-item">
          <div class="ck-item-emoji">${monograma(c.name)}</div>
          <div>
            <div class="ck-name">${esc(c.name)}</div>
            ${c.opcao ? `<div class="ck-meta">${esc(c.opcao)}</div>` : ''}
          </div>
          <div class="ck-qtd">x${c.qty}</div>
          <div class="ck-line">${fmtBR(c.price * c.qty)}</div>
        </div>`).join('');
    }
  }

  if (el('ckSubLbl')) el('ckSubLbl').textContent = fmtBR(sub);
  if (el('ckDescontoRow')) el('ckDescontoRow').style.display = desconto ? 'flex' : 'none';
  if (el('ckDescontoLbl')) el('ckDescontoLbl').textContent = '-' + fmtBR(desconto);
  if (el('ckShipLbl')) el('ckShipLbl').textContent = fmtBR(taxa);
  if (el('ckTotalLbl')) el('ckTotalLbl').textContent = fmtBR(total);
  return total;
}

/* ---------------------------------------------------------
   Abrir / fechar checkout -- id real do overlay e "ckOv"
   --------------------------------------------------------- */
function openCheckout() {
  if (!cart.length) { showToast('Sua sacola esta vazia'); return; }
  closeCart();
  el('ckOv')?.classList.add('on');
  recalcTotal();
}

function closeCheckout() {
  el('ckOv')?.classList.remove('on');
}

/* ---------------------------------------------------------
   Montar resumo de itens para salvar no Supabase / backend
   --------------------------------------------------------- */
function montarResumoItens() {
  return cart.map(c => `${c.name}${c.opcao ? ' (' + c.opcao + ')' : ''} x${c.qty}`).join(' | ');
}

async function enviarPedidoSupabase(dados) {
  try {
    const resp = await supa('pedidos', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify(dados)
    });
    const pedido = resp && resp[0];
    if (!pedido) { console.warn('Supabase nao retornou o pedido criado'); return null; }

    try {
      await supa('itens_pedido', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify(cart.map(c => ({
          pedido_id: pedido.id,
          item: c.name,
          observacao: c.opcao || null,
          adicionais: null,
          quantidade: c.qty,
          preco_unit: c.price
        })))
      });
    } catch (e) {
      console.warn('Pedido criado, mas falhou ao salvar itens_pedido', e);
      // Pedido ja foi criado; nao aborta o fluxo, mas registra o erro para conferencia manual.
    }

    return pedido.id;
  } catch (e) {
    console.warn('Erro ao enviar pedido para o Supabase', e);
    return null;
  }
}

/* ---------------------------------------------------------
   Confirmar pedido -- escolhe Mercado Pago ou Pix
   (id real do botao de finalizar no HTML chama
   confirmOrderComOpcao(), nao confirmOrder())
   --------------------------------------------------------- */
function dadosClienteValidos() {
  const nome = (el('ckName')?.value || '').trim();
  const tel = (el('ckPhone')?.value || '').trim();
  const rua = (el('ckAddr')?.value || '').trim();
  const num = (el('ckNumero')?.value || '').trim();
  const bairro = (el('ckBairro')?.value || '').trim();
  const shipOpt = document.querySelector('input[name="shipOpt"]:checked')?.value || 'entrega';

  if (!nome || !tel) { showToast('Preencha nome e WhatsApp'); return null; }
  if (shipOpt === 'entrega' && (!bairro || !rua || !num)) {
    showToast('Preencha CEP, rua, numero e bairro para entrega');
    return null;
  }

  return {
    nome, tel, bairro, rua, num,
    complemento: (el('ckComp')?.value || '').trim(),
    cidade: (el('ckCidade')?.value || '').trim(),
    uf: (el('ckUF')?.value || '').trim(),
    email: (el('ckEmail')?.value || '').trim(),
    retirada: shipOpt === 'retirada'
  };
}

async function confirmOrderComOpcao() {
  const forma = document.querySelector('input[name="payOpt"]:checked')?.value || 'mp';
  if (forma === 'pix') return confirmOrderPix();
  return confirmOrderMercadoPago();
}
// mantido por compatibilidade, caso algum botao antigo ainda chame confirmOrder()
function confirmOrder() { return confirmOrderComOpcao(); }

function montarEndereco(cliente) {
  if (cliente.retirada) return 'Retirada no balcao';
  return `${cliente.rua}, ${cliente.num}${cliente.complemento ? ' - ' + cliente.complemento : ''} - ${cliente.bairro} - ${cliente.cidade}/${cliente.uf}`;
}

async function confirmOrderMercadoPago() {
  const cliente = dadosClienteValidos();
  if (!cliente) return;

  const sub = getSubtotal();
  const desconto = getDesconto(sub);
  const taxa = getTaxaEntrega();
  const total = Math.max(0, sub - desconto + taxa);
  const endereco = montarEndereco(cliente);
  const produto = montarResumoItens();

  const btn = document.querySelector('.ck-actions .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'processando pedido...'; }

  const pedidoId = await enviarPedidoSupabase({
    cliente_nome: cliente.nome,
    cliente_tel: cliente.tel,
    cliente_email: cliente.email || null,
    bairro: cliente.bairro || null,
    endereco,
    referencia: null,
    subtotal: sub,
    desconto,
    cupom: cupomAtivo?.codigo || null,
    taxa_entrega: taxa,
    total,
    forma_pagamento: 'mercado_pago',
    status: 'novo',
    itens_resumo: produto
  });

  if (!pedidoId) {
    showToast('Nao foi possivel salvar o pedido. Veja o console (F12) para o erro do Supabase.');
    if (btn) { btn.disabled = false; btn.textContent = 'confirmar pedido'; }
    return;
  }

  try {
    if (btn) btn.textContent = 'gerando pagamento...';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(MP_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        produto,
        preco: sub - desconto,
        frete: taxa,
        nome: cliente.nome,
        email: cliente.email || 'cliente@benzaburguer.com.br'
      })
    });
    clearTimeout(timeoutId);
    const data = await resp.json();

    if (data.link) {
      closeCheckout();
      showToast('Redirecionando para o Mercado Pago');
      cart = [];
      renderCart();
      setTimeout(() => { window.location.href = data.link; }, 150);
    } else {
      showToast('Pedido salvo, mas o link de pagamento falhou. Confira MP_ACCESS_TOKEN na Vercel.');
      console.error('Backend erro:', data);
      if (btn) { btn.disabled = false; btn.textContent = 'confirmar pedido'; }
    }
  } catch (err) {
    showToast(err.name === 'AbortError' ? 'Pagamento demorou demais, tente novamente' : 'Pedido salvo, mas houve erro de conexao com o pagamento');
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'confirmar pedido'; }
  }
}

async function confirmOrderPix() {
  const cliente = dadosClienteValidos();
  if (!cliente) return;

  const sub = getSubtotal();
  const desconto = getDesconto(sub);
  const taxa = getTaxaEntrega();
  const total = Math.max(0, sub - desconto + taxa);
  const endereco = montarEndereco(cliente);

  const pedidoId = await enviarPedidoSupabase({
    cliente_nome: cliente.nome,
    cliente_tel: cliente.tel,
    cliente_email: cliente.email || null,
    bairro: cliente.bairro || null,
    endereco,
    referencia: null,
    subtotal: sub,
    desconto,
    cupom: cupomAtivo?.codigo || null,
    taxa_entrega: taxa,
    total,
    forma_pagamento: 'pix',
    status: 'novo',
    itens_resumo: montarResumoItens()
  });

  if (!pedidoId) {
    showToast('Nao foi possivel salvar o pedido. Veja o console (F12) para o erro do Supabase.');
    return;
  }

  closeCheckout();
  cart = [];
  renderCart();
  openPix(total);
}

/* =========================================================
   PIX -- BR Code (EMV) + QR Code, gerado no proprio
   navegador, sem depender de nenhuma API paga.
   ========================================================= */
function _f(id, val) { const v = String(val); return id + String(v.length).padStart(2, '0') + v; }

function _crc(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function _san(str, max) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, max);
}

function buildPixPayload(amount) {
  const key = _f('01', PIX_KEY);
  const merchantAccount = _f('26', _f('00', 'br.gov.bcb.pix') + key);
  const mcc = _f('52', '0000');
  const currency = _f('53', '986');
  const value = _f('54', Number(amount).toFixed(2));
  const country = _f('58', 'BR');
  const name = _f('59', _san(PIX_MERCHANT, 25) || 'BENZA BURGUER');
  const city = _f('60', _san(PIX_CITY, 15) || 'POCOS DE CALDAS');
  const txid = _f('05', 'BB' + Date.now().toString().slice(-10));
  const addData = _f('62', txid);

  let payload = _f('00', '01') + merchantAccount + mcc + currency + value + country + name + city + addData + '6304';
  return payload + _crc(payload);
}

let _pixTimer = null;

function openPix(amount) {
  const payload = buildPixPayload(amount);
  if (el('pixAmountLbl')) el('pixAmountLbl').textContent = fmtBR(amount);
  if (el('pixCode')) el('pixCode').value = payload;
  if (el('pixCodeShort')) el('pixCodeShort').textContent = payload.slice(0, 40) + '...';
  _renderQR(payload);
  el('pixOv')?.classList.add('on');
  el('pixOv')?.setAttribute('aria-hidden', 'false');
  _startTimer();
}

function closePix() {
  el('pixOv')?.classList.remove('on');
  el('pixOv')?.setAttribute('aria-hidden', 'true');
  clearInterval(_pixTimer);
}

function copyPix() {
  const text = el('pixCode')?.value || '';
  navigator.clipboard?.writeText(text).then(_flashCopy).catch(() => _execCopy(text));
}

function _execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); _flashCopy(); } catch (e) { /* silencioso */ }
  document.body.removeChild(ta);
}

function _flashCopy() {
  showToast('Codigo Pix copiado');
}

function _startTimer() {
  let seconds = 15 * 60;
  clearInterval(_pixTimer);
  _pixTimer = setInterval(() => {
    seconds--;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    if (el('pixTimer')) el('pixTimer').textContent = `${m}:${s}`;
    if (seconds <= 0) clearInterval(_pixTimer);
  }, 1000);
}

function _renderQR(text) {
  const wrap = el('pixCanvas');
  if (!wrap || !window.BenzaQR) return;
  const svg = window.BenzaQR.toSVG(text, 260);
  wrap.outerHTML = svg.replace('<svg ', '<svg id="pixCanvas" ');
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
/* escapa texto antes de jogar no innerHTML -- nome, endereco, etc vem do cliente */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
  el('ckBairro')?.addEventListener('change', calcFrete);
  carregarBairrosPublico();
});

window.addEventListener('bairros:carregados', () => {
  const dl = el('bairrosDatalist');
  if (dl) {
    dl.innerHTML = Object.values(window.BAIRROS_CACHE)
      .map(b => `<option value="${esc(b.nome)}"></option>`).join('');
  }
});
