// Ember Duel — card definitions and deck building.
// Types are told apart by colour AND icon: creature ⚔ red, guard 🛡 blue, spell 🔥 purple.
export const TYPE_CREATURE = 'creature';
export const TYPE_GUARD = 'guard';
export const TYPE_SPELL = 'spell';

export const TYPE_ICON = {
  [TYPE_CREATURE]: '⚔️',
  [TYPE_GUARD]: '🛡️',
  [TYPE_SPELL]: '🔥',
};

/** Every card in the game. id, name, type, mana cost, attack, health, effect text. */
export const CARD_DEFS = [
  { id: 'imp', name: 'Ember Imp', type: TYPE_CREATURE, cost: 1, atk: 1, hp: 1, text: 'A tiny spark with big ambitions.' },
  { id: 'wolf', name: 'Cinder Wolf', type: TYPE_CREATURE, cost: 2, atk: 2, hp: 2, text: 'Runs on burning paws.' },
  { id: 'warden', name: 'Stone Warden', type: TYPE_GUARD, cost: 2, atk: 1, hp: 4, text: 'Guard: enemies must attack it first.' },
  { id: 'crow', name: 'Storm Crow', type: TYPE_CREATURE, cost: 2, atk: 3, hp: 1, text: 'Fast wings, hollow bones.' },
  { id: 'knight', name: 'Flame Knight', type: TYPE_CREATURE, cost: 3, atk: 3, hp: 3, text: 'Sworn to the Ember Throne.' },
  { id: 'shield', name: 'Ember Shield', type: TYPE_GUARD, cost: 3, atk: 2, hp: 5, text: 'Guard: enemies must attack it first.' },
  { id: 'fireball', name: 'Fireball', type: TYPE_SPELL, cost: 2, atk: 3, hp: 0, text: 'Deal 3 damage to any target.' },
  { id: 'heal', name: 'Healing Flame', type: TYPE_SPELL, cost: 2, atk: 0, hp: 0, text: 'Restore 5 life to yourself.' },
  { id: 'draw', name: 'Quick Draw', type: TYPE_SPELL, cost: 1, atk: 0, hp: 0, text: 'Draw 2 cards.' },
  { id: 'golem', name: 'Ash Golem', type: TYPE_CREATURE, cost: 4, atk: 4, hp: 5, text: 'Built from the ashes of old duels.' },
  { id: 'drake', name: 'Ember Drake', type: TYPE_CREATURE, cost: 5, atk: 5, hp: 5, text: 'Its breath lights the whole table.' },
  { id: 'bolt', name: 'Lightning', type: TYPE_SPELL, cost: 4, atk: 5, hp: 0, text: 'Deal 5 damage to any target.' },
  { id: 'titan', name: 'Inferno Titan', type: TYPE_CREATURE, cost: 6, atk: 7, hp: 7, text: 'The mountain itself stands up.' },
];

export const STARTING_LIFE = 30;
export const MAX_MANA = 10;
export const MAX_BOARD = 5;
export const MAX_HAND = 7;

let nextUid = 1;

/** A live copy of a card definition, with its own health and summoning sickness. */
export function makeCard(defId) {
  const def = CARD_DEFS.find((d) => d.id === defId);
  return { ...def, uid: nextUid++, hp: def.hp, canAttack: false, justPlayed: false };
}

/** A 24-card deck: two copies of each definition, shuffled. */
export function buildDeck(random = Math.random) {
  const ids = [];
  for (const def of CARD_DEFS) ids.push(def.id, def.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.map((id) => makeCard(id));
}

/** A fixed, readable hand for the screenshot scenes — no randomness. */
export function fixedHand(defIds) {
  return defIds.map((id) => makeCard(id));
}
