// Ember Duel — keyboard and mouse input: click to play and attack, keys 1-7 for the
// hand, Space/Enter to end the turn, Escape to cancel a selection.
export function bindInput(handlers) {
  const playerHand = document.getElementById('player-hand');
  const playerBoard = document.getElementById('player-board');
  const aiBoard = document.getElementById('ai-board');

  playerHand.addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    handlers.playHandCard(Number(card.dataset.handIndex));
  });
  playerBoard.addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    handlers.selectAttacker(Number(card.dataset.uid));
  });
  aiBoard.addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    handlers.attackTarget(Number(card.dataset.uid));
  });
  document.querySelector('.hero-box.enemy').addEventListener('click', () => {
    handlers.attackHero();
  });
  document.getElementById('end-turn-btn').addEventListener('click', () => handlers.endTurn());
  document.getElementById('start-btn').addEventListener('click', () => handlers.startGame());
  document.getElementById('again-btn').addEventListener('click', () => handlers.startGame());

  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '7') {
      handlers.playHandCard(Number(event.key) - 1);
    } else if (event.key === ' ' || event.key === 'Enter') {
      if (document.getElementById('game-screen').classList.contains('hidden')) return;
      event.preventDefault();
      handlers.endTurn();
    } else if (event.key === 'Escape') {
      handlers.cancelSelection();
    }
  });
}
