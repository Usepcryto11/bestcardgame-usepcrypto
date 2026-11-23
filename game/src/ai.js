// Ember Duel — the Ash Baron's brain. Simple, readable logic a player can counter:
// play the biggest cards it can afford, then attack: take lethal when it sees it,
// break through guards, otherwise hit the weakest enemy creature, or the hero.
import { TYPE_CREATURE, TYPE_GUARD, TYPE_SPELL } from './cards.js';

/** Pick the next card for the AI to play, or null when it passes. */
export function chooseCardToPlay(ai, player) {
  const playable = ai.hand.filter((c) => c.cost <= ai.mana);
  if (playable.length === 0) return null;
  // Spells first when they win or save: lethal fireball, then healing when hurt.
  for (const card of playable) {
    if (card.type === TYPE_SPELL && card.id === 'fireball' && card.atk >= player.life) return card;
    if (card.type === TYPE_SPELL && card.id === 'bolt' && card.atk >= player.life) return card;
  }
  for (const card of playable) {
    if (card.type === TYPE_SPELL && card.id === 'heal' && ai.life <= 18) return card;
  }
  for (const card of playable) {
    if (card.type === TYPE_SPELL && card.id === 'draw' && ai.hand.length <= 3) return card;
  }
  // Otherwise the biggest creature or guard it can afford; guards when its life is low.
  const board = playable.filter((c) => c.type === TYPE_CREATURE || c.type === TYPE_GUARD);
  if (board.length > 0) {
    board.sort((a, b) => {
      const guardBonus = ai.life <= 15 ? 2 : 0;
      const scoreA = a.cost + (a.type === TYPE_GUARD ? guardBonus : 0);
      const scoreB = b.cost + (b.type === TYPE_GUARD ? guardBonus : 0);
      return scoreB - scoreA;
    });
    if (ai.board.length < 5) return board[0];
  }
  // Leftover damage spells go at the hero.
  for (const card of playable) {
    if (card.type === TYPE_SPELL && (card.id === 'fireball' || card.id === 'bolt')) return card;
  }
  return null;
}

/** Pick a target for one attacking creature: 'hero' or a board index. */
export function chooseAttackTarget(attacker, ai, player) {
  const guards = player.board
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.type === TYPE_GUARD);
  if (guards.length > 0) {
    guards.sort((a, b) => a.c.hp - b.c.hp);
    return { kind: 'creature', index: guards[0].i };
  }
  // Lethal on the hero when the board can finish the job.
  const boardDamage = ai.board.reduce((sum, c) => sum + (c.canAttack ? c.atk : 0), 0);
  if (boardDamage >= player.life) return { kind: 'hero' };
  // Otherwise trade into the weakest enemy creature it can kill, else go face.
  const killable = player.board
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.hp <= attacker.atk)
    .sort((a, b) => b.c.atk - a.c.atk);
  if (killable.length > 0) return { kind: 'creature', index: killable[0].i };
  const weakest = player.board
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.atk - b.c.atk);
  if (weakest.length > 0 && weakest[0].c.atk >= 3) return { kind: 'creature', index: weakest[0].i };
  return { kind: 'hero' };
}
