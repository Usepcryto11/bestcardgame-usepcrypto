// Ember Duel — DOM rendering and animations: cards slide, flip and snap into place,
// damage shakes, and a win lands with a confetti flourish.
import { TYPE_ICON, TYPE_SPELL } from './cards.js';

const CONFETTI_COLORS = ['#ffb347', '#ff5b4d', '#7dff9b', '#6ec6ff', '#c58cff', '#ffd28a'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One card face: cost, icon, name, effect, attack/health — or the spell tag. */
export function cardElement(card, opts = {}) {
  const node = el('div', `card type-${card.type}`);
  node.dataset.uid = String(card.uid);
  node.append(el('div', 'cost', String(card.cost)));
  node.append(el('div', 'type-icon', TYPE_ICON[card.type]));
  node.append(el('div', 'name', card.name));
  node.append(el('div', 'text', card.text));
  const stats = el('div', 'stats');
  if (card.type === TYPE_SPELL) {
    stats.append(el('span', 'spell-tag', 'SPELL'));
  } else {
    stats.append(el('span', 'atk', String(card.atk)));
    stats.append(el('span', 'hp', String(card.hp)));
  }
  node.append(stats);
  if (opts.playable) node.classList.add('playable');
  if (opts.unaffordable) node.classList.add('unaffordable');
  if (opts.selected) node.classList.add('selected');
  if (opts.canTarget) node.classList.add('can-target');
  if (opts.canAttack) node.classList.add('can-attack');
  if (opts.attackable) node.classList.add('attackable');
  if (opts.justPlayed) node.classList.add('just-played');
  if (opts.dealt) node.classList.add('dealt');
  if (opts.damaged) node.classList.add('damaged');
  return node;
}

/** Draw the whole table from state. `ui` carries the transient selection and flags. */
export function renderTable(state, ui) {
  const $ = (id) => document.getElementById(id);
  $('player-life').textContent = String(state.player.life);
  $('ai-life').textContent = String(state.ai.life);
  $('mana').textContent = String(state.player.mana);
  $('max-mana').textContent = String(state.player.maxMana);
  $('turn-num').textContent = `Turn ${state.turn}`;
  $('turn-label').textContent =
    state.screen === 'play'
      ? state.phase === 'player' ? 'Your turn' : "Ash Baron's turn…"
      : state.turnLabel || '';
  $('log').textContent = state.log[state.log.length - 1] || '';
  $('player-deck-count').textContent = `· deck ${state.player.deck.length} · hand ${state.player.hand.length}`;
  $('ai-deck-count').textContent = `· deck ${state.ai.deck.length} · hand ${state.ai.hand.length}`;
  $('end-turn-btn').disabled = state.phase !== 'player' || state.screen !== 'play';

  const aiBoard = $('ai-board');
  aiBoard.replaceChildren();
  state.ai.board.forEach((card) => {
    aiBoard.append(cardElement(card, {
      canTarget: ui.targeting && ui.validTargets.has(card.uid),
      attackable: ui.targeting,
      damaged: ui.damagedUids.has(card.uid),
    }));
  });

  const aiHand = $('ai-hand');
  aiHand.replaceChildren();
  state.ai.hand.forEach(() => aiHand.append(el('span', 'card-back')));

  const playerBoard = $('player-board');
  playerBoard.replaceChildren();
  state.player.board.forEach((card) => {
    playerBoard.append(cardElement(card, {
      selected: ui.selectedUid === card.uid,
      canAttack: state.phase === 'player' && card.canAttack,
      damaged: ui.damagedUids.has(card.uid),
    }));
  });

  const playerHand = $('player-hand');
  playerHand.replaceChildren();
  state.player.hand.forEach((card, index) => {
    playerHand.append(cardElement(card, {
      playable: state.phase === 'player' && card.cost <= state.player.mana,
      unaffordable: state.phase === 'player' && card.cost > state.player.mana,
      dealt: ui.dealtUids.has(card.uid),
      justPlayed: ui.justPlayedUids.has(card.uid),
    }));
    playerHand.lastChild.dataset.handIndex = String(index);
  });

  // The enemy hero is a target too: highlight it while aiming a spell or attack.
  document.querySelector('.hero-box.enemy').classList.toggle('can-target', Boolean(ui.targetingHero));
}

/** Switch between title / game / end screens. */
export function showScreen(name) {
  document.getElementById('title-screen').classList.toggle('hidden', name !== 'title');
  document.getElementById('game-screen').classList.toggle('hidden', name !== 'play');
  document.getElementById('end-screen').classList.toggle('hidden', name !== 'end');
}

/** Fill and show the win/loss screen. */
export function showEnd(state) {
  const win = state.screen === 'win';
  document.getElementById('end-emoji').textContent = win ? '🏆' : '💀';
  const title = document.getElementById('end-title');
  title.textContent = win ? 'Victory!' : 'Defeat';
  title.className = win ? 'win' : 'loss';
  document.getElementById('end-text').textContent = win
    ? `The Ash Baron falls at ${state.ai.life <= 0 ? 0 : state.ai.life} life — your ember burns brightest.`
    : `The Ash Baron stands at ${state.ai.life} life. Your ember fades… this time.`;
  showScreen('end');
  if (win) launchConfetti();
}

/** A win lands with a flourish: coloured paper raining over the screen. */
export function launchConfetti() {
  const box = document.getElementById('confetti');
  box.replaceChildren();
  for (let i = 0; i < 70; i += 1) {
    const piece = el('div', 'confetti-piece');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(piece);
  }
  window.setTimeout(() => box.replaceChildren(), 5000);
}
