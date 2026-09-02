/* ═══════════════════════════════════════════════════
   BENZA BURGUER — DADOS DO CARDÁPIO
   Cada item pertence a uma coleção (Burgers, Combos,
   Bebidas, Sobremesas) e tem um "type" usado nos filtros.
   ═══════════════════════════════════════════════════ */

const SUPA_URL  = 'https://maljtjznorewdntctaub.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGp0anpub3Jld2RudGN0YXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzYxNTYsImV4cCI6MjA5NDYxMjE1Nn0.Jt_Nup-bR62gp5ZrOrVPIujanQbRIKZB6CC0CmiB8WY';
const BENZA_DATA = {
  "Burgers": [
    {
      name: "Cheddar Bacon Smash",
      type: "smash",
      price: 32.90,
      rating: 4.9,
      ratingCount: 214,
      desc: "Dois smash burgers suculentos, cheddar cremoso derretido e bacon crocante no pão brioche amanteigado.",
      opcaoLabel: "Ponto da carne",
      opcoes: ["Ao ponto", "Bem passado"],
      colors: [{ name: "Clássico", img: "" }]
    },
    {
      name: "Barbecue Onion",
      type: "smash",
      price: 29.90,
      rating: 4.8,
      ratingCount: 168,
      desc: "Smash burger, molho barbecue artesanal, cebola caramelizada e queijo prato no ponto.",
      opcaoLabel: "Ponto da carne",
      opcoes: ["Ao ponto", "Bem passado"],
      colors: [{ name: "Clássico", img: "" }]
    },
    {
      name: "Duplo na Brasa",
      type: "duplo",
      price: 34.90,
      rating: 5.0,
      ratingCount: 302,
      desc: "Duas carnes de 150g grelhadas na brasa, queijo, alface, tomate e molho especial da casa.",
      opcaoLabel: "Ponto da carne",
      opcoes: ["Mal passado", "Ao ponto", "Bem passado"],
      colors: [{ name: "Clássico", img: "" }]
    },
    {
      name: "Frango Crocante",
      type: "frango",
      price: 27.90,
      rating: 4.7,
      ratingCount: 96,
      desc: "Filé de frango empanado crocante, maionese temperada, alface americana e picles.",
      opcaoLabel: null,
      opcoes: [],
      colors: [{ name: "Clássico", img: "" }]
    },
    {
      name: "Veggie Grelhado",
      type: "veggie",
      price: 26.90,
      rating: 4.6,
      ratingCount: 41,
      desc: "Hambúrguer de grão-de-bico grelhado, rúcula, tomate seco e maionese de ervas.",
      opcaoLabel: null,
      opcoes: [],
      colors: [{ name: "Clássico", img: "" }]
    },
    {
      name: "Duplo Bacon Extra",
      type: "duplo",
      price: 38.90,
      rating: 4.9,
      ratingCount: 187,
      desc: "Duas carnes na brasa, dobro de bacon, cheddar e cebola crispy.",
      opcaoLabel: "Ponto da carne",
      opcoes: ["Ao ponto", "Bem passado"],
      colors: [{ name: "Clássico", img: "" }],
      esgotado: true
    }
  ],
  "Combos": [
    {
      name: "Combo Clássico",
      type: "individual",
      price: 44.90,
      rating: 4.8,
      ratingCount: 128,
      desc: "1 Cheddar Bacon Smash + batata frita média + bebida à sua escolha.",
      opcaoLabel: "Bebida",
      opcoes: ["Coca-Cola lata", "Guaraná lata", "Suco de laranja"],
      colors: [{ name: "Clássico", img: "" }]
    },
    {
      name: "Combo Duplo",
      type: "individual",
      price: 49.90,
      rating: 4.9,
      ratingCount: 154,
      desc: "1 Duplo na Brasa + batata frita grande + bebida à sua escolha.",
      opcaoLabel: "Bebida",
      opcoes: ["Coca-Cola lata", "Guaraná lata", "Suco de laranja"],
      colors: [{ name: "Clássico", img: "" }]
    },
    {
      name: "Combo Família",
      type: "familia",
      price: 84.90,
      rating: 5.0,
      ratingCount: 73,
      desc: "2 hambúrgueres à sua escolha + 2 batatas fritas + 2 bebidas. Serve bem duas pessoas.",
      opcaoLabel: "Bebida",
      opcoes: ["2x Coca-Cola lata", "2x Guaraná lata", "1x de cada"],
      colors: [{ name: "Clássico", img: "" }]
    }
  ],
  "Bebidas": [
    {
      name: "Coca-Cola Lata",
      type: "refri",
      price: 7.00,
      rating: 4.7,
      ratingCount: 210,
      desc: "Lata 350ml, gelada na hora do pedido.",
      opcaoLabel: null,
      opcoes: [],
      colors: [{ name: "Único", img: "" }]
    },
    {
      name: "Guaraná Antarctica Lata",
      type: "refri",
      price: 7.00,
      rating: 4.6,
      ratingCount: 132,
      desc: "Lata 350ml, gelada na hora do pedido.",
      opcaoLabel: null,
      opcoes: [],
      colors: [{ name: "Único", img: "" }]
    },
    {
      name: "Suco Natural de Laranja",
      type: "suco",
      price: 9.90,
      rating: 4.8,
      ratingCount: 58,
      desc: "Suco natural, feito na hora, 400ml.",
      opcaoLabel: "Tamanho",
      opcoes: ["400ml", "600ml"],
      colors: [{ name: "Único", img: "" }]
    },
    {
      name: "Água com Gás",
      type: "agua",
      price: 5.00,
      rating: 4.5,
      ratingCount: 34,
      desc: "Garrafa 500ml gelada.",
      opcaoLabel: null,
      opcoes: [],
      colors: [{ name: "Único", img: "" }]
    }
  ],
  "Sobremesas": [
    {
      name: "Brownie com Sorvete",
      type: "doce",
      price: 18.90,
      rating: 4.9,
      ratingCount: 87,
      desc: "Brownie quentinho de chocolate meio amargo com bola de sorvete de creme.",
      opcaoLabel: null,
      opcoes: [],
      colors: [{ name: "Único", img: "" }]
    },
    {
      name: "Milk-shake de Ovomaltine",
      type: "shake",
      price: 19.90,
      rating: 4.8,
      ratingCount: 112,
      desc: "Milk-shake cremoso batido com Ovomaltine e calda de chocolate, 400ml.",
      opcaoLabel: "Tamanho",
      opcoes: ["400ml", "600ml"],
      colors: [{ name: "Único", img: "" }]
    },
    {
      name: "Petit Gateau",
      type: "doce",
      price: 21.90,
      rating: 5.0,
      ratingCount: 64,
      desc: "Bolinho de chocolate com recheio cremoso, servido quente com sorvete de creme.",
      opcaoLabel: null,
      opcoes: [],
      colors: [{ name: "Único", img: "" }]
    }
  ]
};

function getData(){ return BENZA_DATA; }

/* Filtros de tipo por aba — usados nos botões "TODOS / SMASH / DUPLO / ..." */
const TYPE_FILTERS = {
  "Burgers":   [ ["todos","TODOS"], ["smash","SMASH"], ["duplo","DUPLO"], ["frango","FRANGO"], ["veggie","VEGGIE"] ],
  "Combos":    [ ["todos","TODOS"], ["individual","INDIVIDUAL"], ["familia","FAMÍLIA"] ],
  "Bebidas":   [ ["todos","TODOS"], ["refri","REFRIGERANTE"], ["suco","SUCO"], ["agua","ÁGUA"] ],
  "Sobremesas":[ ["todos","TODOS"], ["doce","DOCES"], ["shake","MILK-SHAKE"] ]
};

/* ═══════════════════════════════════════════════════
   window.MENU_BENZA — versão "achatada" do cardápio
   (nome -> dados do item), usada pelo carrinho (cart.js)
   e pelo painel admin para checar preço/disponibilidade.
   Construída aqui para existir assim que data.js carrega,
   antes de cart.js/app.js rodarem.
   ═══════════════════════════════════════════════════ */
window.MENU_BENZA = {};
Object.keys(BENZA_DATA).forEach(categoria => {
  BENZA_DATA[categoria].forEach(item => {
    window.MENU_BENZA[item.name] = { ...item, categoria };
  });
});
