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

function parseXMLFile(xmlString, heroNick) {
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
        const hand = parseGame(gameNodes[i], heroNick);
        if (hand) {
            hands.push(hand);
        }
    }

    return hands;
}

function parseGame(gameNode, heroNick) {
    const gamecode = gameNode.getAttribute('gamecode');
    if (!gamecode) return null;

    const generalNode = gameNode.querySelector('general');
    if (!generalNode) return null;

    const startDate = generalNode.querySelector('startdate')?.textContent;
    if (!startDate) return null;

    const playersNode = generalNode.querySelector('players');
    if (!playersNode) return null;

    const playerNodes = playersNode.querySelectorAll('player');
    const players = [];
    let heroPlayer = null;
    let heroIndex = -1;
    let win = 0;

    for (let i = 0; i < playerNodes.length; i++) {
        const node = playerNodes[i];
        const name = node.getAttribute('name');
        const chips = cleanSum(node.getAttribute('chips'));
        const playerWin = cleanSum(node.getAttribute('win'));
        const bet = cleanSum(node.getAttribute('bet'));

        const player = {
            name: name,
            chips: chips,
            win: playerWin,
            bet: bet,
            seat: parseInt(node.getAttribute('seat') || 0),
            isHero: name === heroNick
        };

        players.push(player);

        if (player.isHero) {
            heroPlayer = player;
            heroIndex = i;
            win = playerWin;
        }
    }

    if (!heroPlayer) return null;

    // Поиск большого блайнда
    let bigBlind = 0;
    
    // Попытка найти BB в атрибуте general
    const generalBB = generalNode.getAttribute('bb');
    if (generalBB) {
        bigBlind = cleanSum(generalBB);
    } else {
        // Если нет, ищем в round 0
        const round0 = gameNode.querySelector('round[no="0"]');
        if (round0) {
            const actions0 = round0.querySelectorAll('action');
            for (let a = 0; a < actions0.length; a++) {
                const action = actions0[a];
                const type = parseInt(action.getAttribute('type'));
                const sum = cleanSum(action.getAttribute('sum'));
                
                // BB обычно ставится первым и его тип = 2 (BB)
                if (type === ACTION_TYPES.BB) {
                    bigBlind = sum;
                    break;
                }
            }
        }
    }

    const pocketCardsNode = gameNode.querySelector('cards[type="Pocket"][player="' + heroNick + '"]');
    let heroCards = null;
    if (pocketCardsNode) {
        const cardsText = pocketCardsNode.textContent.trim();
        if (cardsText !== 'X X') {
            heroCards = cardsText;
        }
    }

    const actions = parseActions(gameNode, heroNick);
    const totalInvested = calculateInvestment(actions);

    const totalPlayers = players.length;
    const heroPosition = getPosition(heroIndex, totalPlayers);

    let wentToShowdown = false;
    const riverNode = gameNode.querySelector('round[no="4"]');
    if (riverNode) {
        const heroActionsAfterRiver = riverNode.querySelectorAll('action[player="' + heroNick + '"]');
        wentToShowdown = heroActionsAfterRiver.length > 0;
    }

    const result = win - totalInvested;

    return {
        gamecode: gamecode,
        startDate: parseDateTime(startDate),
        heroName: heroNick,
        heroCards: heroCards,
        heroPosition: heroPosition,
        totalPlayers: totalPlayers,
        bigBlind: bigBlind,
        limit: Math.round(bigBlind * 100),
        totalInvested: totalInvested,
        win: win,
        result: result,
        wentToShowdown: wentToShowdown,
        actions: actions,
        players: players.map(p => ({
            name: p.name,
            isHero: p.isHero,
            seat: p.seat,
            bet: p.bet,
            win: p.win
        }))
    };
}

function parseActions(gameNode, heroNick) {
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
                round: roundNo,
                isHero: player === heroNick
            });
        }
    }

    return allActions;
}

function calculateInvestment(actions) {
    let totalInvested = 0;
    const heroActions = actions.filter(a => a.isHero);

    for (let i = 0; i < heroActions.length; i++) {
        const action = heroActions[i];
        const type = action.type;
        const sum = action.sum;

        if (type === ACTION_TYPES.SB || type === ACTION_TYPES.BB) {
            totalInvested += sum;
            continue;
        }

        if (type === ACTION_TYPES.CALL || type === ACTION_TYPES.ALLIN) {
            totalInvested += sum;
            continue;
        }

        if (type === ACTION_TYPES.BET || type === ACTION_TYPES.RAISE) {
            const currentRound = action.round;
            const nextActions = actions.filter(a => {
                return a.round === currentRound &&
                    a.player !== action.player &&
                    a.type !== ACTION_TYPES.FOLD;
            });

            if (nextActions.length > 0) {
                totalInvested += sum;
            }
        }
    }

    return totalInvested;
}