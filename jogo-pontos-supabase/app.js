// Utilitários
function randomId() { return 'user_' + Math.random().toString(36).slice(2,10); }

const KEY_SCORE = 'score';
const KEY_NAME = 'userName';
const KEY_ID = 'userId';

let score = Number(localStorage.getItem(KEY_SCORE) || 0);
let userName = localStorage.getItem(KEY_NAME) || '';
let userId = localStorage.getItem(KEY_ID) || '';

if (!userId) { userId = randomId(); localStorage.setItem(KEY_ID, userId); }

function askName(initial=false){
  const name = window.prompt('Digite seu nome para jogar:', userName || '');
  if (name && name.trim().length > 0) {
    userName = name.trim().slice(0, 40);
    localStorage.setItem(KEY_NAME, userName);
    document.getElementById('whoName').textContent = userName;
  } else if (initial && !userName) {
    // força ter um nome
    return askName(true);
  }
}

function render() {
  document.getElementById('score').textContent = score;
  document.getElementById('whoName').textContent = userName || '—';
}

async function loadRecord(){
  try{
    const res = await fetch('/.netlify/functions/max-score');
    const data = await res.json();
    if (res.ok && data && data.max) {
      const { points, user_name } = data.max;
      document.getElementById('record').textContent = `Recorde: ${points} pts — ${user_name || 'jogador'}`;
    } else {
      document.getElementById('record').textContent = 'Recorde: ainda não há pontuações';
    }
  }catch(e){
    document.getElementById('record').textContent = 'Recorde: erro ao carregar';
  }
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
  if (!userName) askName(true);
  render();
  loadRecord();

  document.getElementById('btnAdd').addEventListener('click', () => {
    score += 1;
    localStorage.setItem(KEY_SCORE, score);
    render();
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    score = 0;
    localStorage.setItem(KEY_SCORE, score);
    render();
  });

  document.getElementById('changeName').addEventListener('click', () => {
    askName(false);
  });

  document.getElementById('btnSend').addEventListener('click', async () => {
    const status = document.getElementById('status');
    if (!userName) { askName(false); if (!userName) return; }
    status.textContent = 'Enviando...';
    try {
      const res = await fetch('/.netlify/functions/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provisionalScore: score, userId, userName })
      });
      const data = await res.json();
      if (res.ok) {
        status.textContent = 'Pontuação salva! Score final: ' + data.finalScore;
        loadRecord(); // atualiza recorde
      } else {
        status.textContent = 'Erro: ' + (data.error || 'Falha ao enviar');
      }
    } catch (e) {
      status.textContent = 'Erro de rede.';
    }
  });
});
