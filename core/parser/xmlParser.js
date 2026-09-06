// core/parser/xmlParser.js
// ============================================================
// Парсер XML
// ============================================================

// ===== ФУНКЦИЯ ОЧИСТКИ СУММ ОТ СИМВОЛОВ ВАЛЮТ =====
function cleanSum(sumStr) {
    if (!sumStr) return 0;
    if (typeof sumStr === 'number') {
        if (isNaN(sumStr)) return 0;
        return sumStr;
    }
    const cleaned = String(sumStr).replace(/[€$₽\s,]/g, '');
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
}

// ===== ПАРСИМ ВСЕ РАЗДАЧИ =====
function parseAllHands(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        console.error('XML parsing error:', parseError.textContent);
        return null;
    }

    const gameNodes = xmlDoc.querySelectorAll('game');
    const hands = [];

    for (let i = 0; i < gameNodes.length; i++) {
        const hand = parseGame(gameNodes[i]);
        if (hand) {
            hands.push(hand);
        }
    }

    return hands;
}

// ===== ПАРСИМ ОДНУ РАЗДАЧУ =====
function parseGame(gameNode) {
    const gamecode = gameNode.getAttribute('gamecode');
    if (!gamecode) return null;

    const generalNode = gameNode.querySelector('general');
    if (!generalNode) return null;

    const startDate = generalNode.querySelector('startdate')?.textContent;
    if (!startDate) return null;

    const playersNode = generalNode.querySelector('players');
    if (!playersNode) return null;

    const playerNodes = playersNode.querySelectorAll('player');
    if (playerNodes.length === 0) return null;

    // Находим большого блайнда
    let bigBlind = 0;
    const round0 = gameNode.querySelector('round[no="0"]');
    if (round0) {
        const actions0 = round0.querySelectorAll('action');
        for (let a = 0; a < actions0.length; a++) {
            const action = actions0[a];
            const type = parseInt(action.getAttribute('type'));
            if (type === ACTION_TYPES.BB) {
                bigBlind = cleanSum(action.getAttribute('sum'));
                break;
            }
        }
    }

    // Парсим все действия
    const actions = parseActions(gameNode);
    
    // Парсим игроков
    const players = Array.from(playerNodes).map(node => {
        const name = node.getAttribute('name');
        const win = cleanSum(node.getAttribute('win'));
        const bet = cleanSum(node.getAttribute('bet'));
        const rake = cleanSum(node.getAttribute('rakeamount'));
        
        return {
            name: name,
            win: win,
            bet: bet,
            rake: rake
        };
    });

    return {
        gamecode: gamecode,
        startDate: parseDateTime(startDate),
        limit: Math.round(bigBlind * 100),
        players: players,
        actions: actions
    };
}

// ===== ПАРСИМ ДЕЙСТВИЯ =====
function parseActions(gameNode) {
    const allActions = [];
    const roundNodes = gameNode.querySelectorAll('round');

    for (let r = 0; r < roundNodes.length; r++) {
        const roundNode = roundNodes[r];
        const roundNo = parseInt(roundNode.getAttribute('no') || 0);
        const actions = roundNode.querySelectorAll('action');

        for (let a = 0; a < actions.length; a++) {
            const action = actions[a];
            const player = action.getAttribute('player');
            const type = parseInt(action.getAttribute('type') || 0);
            const sum = cleanSum(action.getAttribute('sum'));

            allActions.push({
                player: player,
                type: type,
                sum: sum,
                round: roundNo
            });
        }
    }

    return allActions;
}

// ===== ВЫЧИСЛЕНИЕ РЕЗУЛЬТАТА ИГРОКА =====
function calculateResult(players, playerName) {
    const player = players.find(p => p.name === playerName);
    if (!player) return 0;
    
    const win = player.win;
    const bet = player.bet;
    
    // Если игрок выиграл
    if (win > 0) {
        // Ищем победителя (игрока с win > 0)
        const winner = players.find(p => p.win > 0);
        
        // Rake победителя
        const rake = winner ? winner.rake : 0;
        
        // Сумма bet всех оппонентов
        const opponentsBet = players
            .filter(p => p.name !== playerName)
            .reduce((sum, p) => sum + p.bet, 0);
        
        // Наше вложение
        const ourInvested = win + rake - opponentsBet;
        
        return win - ourInvested;
    } else {
        // Если игрок проиграл
        return -bet;
    }
}

// ===== ПАРСИМ ДАТЫ =====
function parseDateTime(dateStr) {
    const parts = dateStr.split(' ');
    const datePart = parts[0];
    const timePart = parts[1];

    const dateParts = datePart.split('-').map(Number);
    const timeParts = timePart.split(':').map(Number);

    return new Date(dateParts[2], dateParts[0] - 1, dateParts[1], timeParts[0], timeParts[1], timeParts[2]);
}