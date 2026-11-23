// Ember Duel — bootstrap, game state and the rules: mana, drawing, playing cards,
// attacking (guards first), and the Ash Baron's turns. Also stages the four
// screenshot scenes from ?shot=title|play|win|loss, so each shot is a real render.
import {
  STARTING_LIFE, MAX_MANA, MAX_BOARD, MAX_HAND,
  TYPE_CREATURE, TYPE_GUARD, TYPE_SPELL, buildDeck, makeCard, fixedHand,
} from './cards.js';
import { chooseCardToPlay, chooseAttackTarget } from './ai.js';
import { renderTable, showScreen, showEnd } from './render.js';
import { bindInput } from './input.js';

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function freshSide(deck) {
  return { life: STARTING_LIFE, mana: 0, maxMana: 0, deck, hand: [], board: [] };
}

function newState() {
  return {
    screen: 'title', phase: 'player', turn: 1, turnLabel: '',
    player: freshSide(buildDeck()),
    ai: freshSide(buildDeck()),
    log: ['Welcome to Ember Duel.'],
  };
}

const state = newState();
/** Transient UI flags, cleared after each render: selection, targets, animations. */
const ui = {
  selectedUid: null, targeting: false, targetingHero: false,
  validTargets: new Set(), dealtUids: new Set(), justPlayedUids: new Set(), damagedUids: new Set(),
};

function log(message) {
  state.log.push(message);
  if (state.log.length > 4) state.log.shift();
}

function drawCard(side, count = 1) {
  for (let i = 0; i < count; i += 1) {
    if (side.deck.length === 0 || side.hand.length >= MAX_HAND) return;
    const card = side.deck.pop();
    side.hand.push(card);
    if (side === state.player) ui.dealtUids.add(card.uid);
  }
}

function startTurn(side, isPlayer) {
  side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
  side.mana = side.maxMana;
  side.board.forEach((c) => { c.canAttack = true; });
  drawCard(side, 1);
}

function checkEnd() {
  if (state.ai.life <= 0) { state.screen = 'win'; return true; }
  if (state.player.life <= 0) { state.screen = 'loss'; return true; }
  return false;
}

function render() {
  renderTable(state, ui);
  ui.dealtUids.clear();
  ui.justPlayedUids.clear();
  ui.damagedUids.clear();
}

/** Deal damage to a creature; remove it when its health hits 0. Returns true if it died. */
function damageCreature(side, card, amount) {
  card.hp -= amount;
  ui.damagedUids.add(card.uid);
  if (card.hp <= 0) {
    side.board = side.board.filter((c) => c.uid !== card.uid);
    return true;
  }
  return false;
}

function guardOnBoard(side) {
  return side.board.some((c) => c.type === TYPE_GUARD);
}

function applySpell(card, side, target) {
  if (card.id === 'heal') {
    side.life = Math.min(STARTING_LIFE, side.life + 5);
    log(`${side === state.player ? 'You' : 'Ash Baron'} heal 5 life.`);
  } else if (card.id === 'draw') {
    drawCard(side, 2);
    log(`${side === state.player ? 'You' : 'Ash Baron'} draw 2 cards.`);
  } else if (target.kind === 'hero') {
    const foe = side === state.player ? state.ai : state.player;
    foe.life -= card.atk;
    log(`${card.name} hits the ${foe === state.ai ? 'Ash Baron' : 'hero'} for ${card.atk}.`);
  } else {
    const foe = side === state.player ? state.ai : state.player;
    const victim = foe.board[target.index];
    if (!victim) return;
    const died = damageCreature(foe, victim, card.atk);
    log(`${card.name} hits ${victim.name} for ${card.atk}${died ? ' — destroyed!' : '.'}`);
  }
}

function playCard(side, handIndex, target) {
  const card = side.hand[handIndex];
  if (!card || card.cost > side.mana) return false;
  if (card.type === TYPE_SPELL && (card.id === 'fireball' || card.id === 'bolt') && !target) return false;
  if ((card.type === TYPE_CREATURE || card.type === TYPE_GUARD) && side.board.length >= MAX_BOARD) return false;
  side.mana -= card.cost;
  side.hand.splice(handIndex, 1);
  if (card.type === TYPE_SPELL) {
    applySpell(card, side, target || { kind: 'hero' });
  } else {
    card.canAttack = false;
    side.board.push(card);
    ui.justPlayedUids.add(card.uid);
    log(`${side === state.player ? 'You play' : 'Ash Baron plays'} ${card.name}.`);
  }
  if (checkEnd()) { finishGame(); return true; }
  render();
  return true;
}

function attack(attackerSide, attacker, target) {
  if (!attacker.canAttack) return false;
  const foe = attackerSide === state.player ? state.ai : state.player;
  if (target.kind === 'creature') {
    const victim = foe.board[target.index];
    if (!victim) return false;
    if (guardOnBoard(foe) && victim.type !== TYPE_GUARD) return false;
    attacker.canAttack = false;
    const died = damageCreature(foe, victim, attacker.atk);
    const diedBack = damageCreature(attackerSide, attacker, victim.atk);
    log(`${attacker.name} attacks ${victim.name} (${attacker.atk} vs ${victim.atk})${died ? ' — destroyed!' : ''}${diedBack ? ' Attacker falls too!' : ''}`);
  } else {
    if (guardOnBoard(foe)) return false;
    attacker.canAttack = false;
    foe.life -= attacker.atk;
    log(`${attacker.name} hits the ${foe === state.ai ? 'Ash Baron' : 'hero'} for ${attacker.atk}.`);
  }
  if (checkEnd()) { finishGame(); return true; }
  render();
  return true;
}

function finishGame() {
  render();
  showEnd(state);
}

async function runAiTurn() {
  state.phase = 'ai';
  render();
  await sleep(650);
  startTurn(state.ai, false);
  log("Ash Baron's turn.");
  render();
  await sleep(500);
  // Play cards until it passes.
  for (let guard = 0; guard < 12; guard += 1) {
    const card = chooseCardToPlay(state.ai, state.player);
    if (!card) break;
    const handIndex = state.ai.hand.indexOf(card);
    let target = null;
    if (card.type === TYPE_SPELL && (card.id === 'fireball' || card.id === 'bolt')) {
      const guards = state.player.board.some((c) => c.type === TYPE_GUARD);
      target = guards
        ? { kind: 'creature', index: state.player.board.findIndex((c) => c.type === TYPE_GUARD) }
        : { kind: 'hero' };
    }
    playCard(state.ai, handIndex, target);
    await sleep(550);
    if (state.screen !== 'play') return;
  }
  // Attack with every ready creature.
  for (const attacker of [...state.ai.board]) {
    if (state.screen !== 'play') return;
    if (!attacker.canAttack) continue;
    const target = chooseAttackTarget(attacker, state.ai, state.player);
    attack(state.ai, attacker, target);
    await sleep(550);
    if (state.screen !== 'play') return;
  }
  await sleep(400);
  if (state.screen !== 'play') return;
  state.turn += 1;
  state.phase = 'player';
  startTurn(state.player, true);
  log(`Turn ${state.turn} — your move.`);
  render();
}

/** Player input handlers, wired up by input.js. */
const handlers = {
  startGame() {
    const fresh = newState();
    Object.assign(state, fresh);
    state.screen = 'play';
    showScreen('play');
    startTurn(state.player, true);
    state.player.hand = [];
    drawCard(state.player, 3);
    state.ai.hand = [];
    drawCard(state.ai, 3);
    log('Turn 1 — your move. Play a card or attack!');
    render();
  },
  playHandCard(handIndex) {
    if (state.screen !== 'play' || state.phase !== 'player') return;
    const card = state.player.hand[handIndex];
    if (!card) return;
    if (card.type === TYPE_SPELL && (card.id === 'fireball' || card.id === 'bolt')) {
      // Aim it: select the spell, then click a target.
      ui.selectedUid = card.uid;
      ui.targeting = true;
      ui.targetingHero = true;
      ui.validTargets = new Set(state.ai.board.map((c) => c.uid));
      render();
      return;
    }
    playCard(state.player, handIndex, null);
  },
  selectAttacker(uid) {
    if (state.screen !== 'play' || state.phase !== 'player') return;
    const attacker = state.player.board.find((c) => c.uid === uid);
    if (!attacker || !attacker.canAttack) return;
    ui.selectedUid = uid;
    ui.targeting = true;
    ui.targetingHero = !guardOnBoard(state.ai);
    ui.validTargets = new Set(
      state.ai.board
        .filter((c) => !guardOnBoard(state.ai) || c.type === TYPE_GUARD)
        .map((c) => c.uid),
    );
    render();
  },
  attackTarget(uid) {
    if (!ui.targeting) return;
    // A selected spell in hand.
    const spellIndex = state.player.hand.findIndex((c) => c.uid === ui.selectedUid);
    if (spellIndex >= 0) {
      const index = state.ai.board.findIndex((c) => c.uid === uid);
      if (index < 0) return;
      ui.selectedUid = null; ui.targeting = false; ui.targetingHero = false; ui.validTargets.clear();
      playCard(state.player, spellIndex, { kind: 'creature', index });
      return;
    }
    const attacker = state.player.board.find((c) => c.uid === ui.selectedUid);
    if (!attacker) return;
    const index = state.ai.board.findIndex((c) => c.uid === uid);
    if (index < 0) return;
    ui.selectedUid = null; ui.targeting = false; ui.targetingHero = false; ui.validTargets.clear();
    attack(state.player, attacker, { kind: 'creature', index });
  },
  attackHero() {
    if (!ui.targeting || !ui.targetingHero) return;
    const spellIndex = state.player.hand.findIndex((c) => c.uid === ui.selectedUid);
    if (spellIndex >= 0) {
      ui.selectedUid = null; ui.targeting = false; ui.targetingHero = false; ui.validTargets.clear();
      playCard(state.player, spellIndex, { kind: 'hero' });
      return;
    }
    const attacker = state.player.board.find((c) => c.uid === ui.selectedUid);
    if (!attacker) return;
    ui.selectedUid = null; ui.targeting = false; ui.targetingHero = false; ui.validTargets.clear();
    attack(state.player, attacker, { kind: 'hero' });
  },
  endTurn() {
    if (state.screen !== 'play' || state.phase !== 'player') return;
    ui.selectedUid = null; ui.targeting = false; ui.targetingHero = false; ui.validTargets.clear();
    render();
    runAiTurn();
  },
  cancelSelection() {
    ui.selectedUid = null; ui.targeting = false; ui.targetingHero = false; ui.validTargets.clear();
    render();
  },
};

/** Stage a screenshot scene: a real render of the game in a set-up position. */
function stageShot(name) {
  const fresh = newState();
  Object.assign(state, fresh);
  if (name === 'play') {
    state.screen = 'play';
    state.turn = 4;
    state.player.life = 24; state.ai.life = 21;
    state.player.maxMana = 6; state.player.mana = 4;
    state.ai.maxMana = 5; state.ai.mana = 2;
    state.player.hand = fixedHand(['knight', 'fireball', 'warden', 'draw', 'crow']);
    state.ai.hand = fixedHand(['imp', 'wolf', 'golem']);
    state.player.board = fixedHand(['wolf', 'knight']);
    state.player.board.forEach((c) => { c.canAttack = true; });
    state.ai.board = fixedHand(['golem', 'warden']);
    state.ai.board.forEach((c) => { c.canAttack = true; });
    state.player.deck = buildDeck(() => 0.5).slice(0, 14);
    state.ai.deck = buildDeck(() => 0.5).slice(0, 15);
    log('Turn 4 — your move. Play a card or attack!');
    showScreen('play');
  } else if (name === 'win') {
    state.screen = 'win';
    state.ai.life = 0; state.player.life = 12;
    showScreen('play');
    showEnd(state);
  } else if (name === 'loss') {
    state.screen = 'loss';
    state.player.life = 0; state.ai.life = 18;
    showScreen('play');
    showEnd(state);
  } else {
    state.screen = 'title';
    showScreen('title');
  }
  render();
}

bindInput(handlers);
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) stageShot(shot);
else showScreen('title');
