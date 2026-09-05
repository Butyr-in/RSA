// core/utils/positions.js
// ============================================================
// Определение позиций
// ============================================================

function getPosition(index, totalPlayers) {
  if (index === 0) return POSITIONS.BTN;
  if (index === 1) return POSITIONS.SB;
  if (index === 2) return POSITIONS.BB;
  
  const remaining = totalPlayers - 3;
  const positions = [];
  
  if (totalPlayers <= 6) {
    if (remaining === 1) positions.push(POSITIONS.CO);
    else if (remaining === 2) positions.push(POSITIONS.MP, POSITIONS.CO);
    else if (remaining === 3) positions.push(POSITIONS.EP, POSITIONS.MP, POSITIONS.CO);
  } else if (totalPlayers === 7) {
    positions.push(POSITIONS.EP_1, POSITIONS.EP, POSITIONS.MP, POSITIONS.CO);
  } else if (totalPlayers === 8) {
    positions.push(POSITIONS.EP_2, POSITIONS.EP_1, POSITIONS.EP, POSITIONS.MP, POSITIONS.CO);
  } else if (totalPlayers === 9) {
    positions.push(POSITIONS.EP_3, POSITIONS.EP_2, POSITIONS.EP_1, POSITIONS.EP, POSITIONS.MP, POSITIONS.CO);
  }
  
  return positions[index - 3] || 'UNKNOWN';
}

function getPositionGroup(position) {
  for (var group in POSITION_GROUPS) {
    if (POSITION_GROUPS[group].indexOf(position) !== -1) {
      return group;
    }
  }
  return 'UNKNOWN';
}