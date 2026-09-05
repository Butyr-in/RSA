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
    // Удаляем символы валют, пробелы и запятые
    var cleaned = String(sumStr).replace(/[€$₽\s,]/g, '');
    var result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
}

function parseXMLFile(xmlString, heroNick) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    var parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        console.error('XML parsing error:', parseError.textContent);
        return null;
    }

    var gameNodes = xmlDoc.querySelectorAll('game');
    var hands = [];

    for (var i = 0; i < gameNodes.length; i++) {
        var hand = parseGame(gameNodes[i], heroNick);
        if (hand) {
            hands.push(hand);
        }
    }

    return hands;
}

function parseGame(gameNode, heroNick) {
    var gamecode = gameNode.getAttribute('gamecode');
    if (!gamecode) return null;

    var generalNode = gameNode.querySelector('general');
    if (!generalNode) return null;

    var startDate = generalNode.querySelector('startdate')?.textContent;
    if (!startDate) return null;

    var playersNode = generalNode.querySelector('players');
    if (!playersNode) return null;

    var playerNodes = playersNode.querySelectorAll('player');
    var players = [];
    var heroPlayer = null;
    var heroIndex = -1;
    var win = 0;

    // Собираем информацию об игроках
    for (var i = 0; i < playerNodes.length; i++) {
        var node = playerNodes[i];
        var name = node.getAttribute('name');
        // ИСПРАВЛЕНО: используем cleanSum для всех сумм
        var chips = cleanSum(node.getAttribute('chips'));
        var playerWin = cleanSum(node.getAttribute('win'));
        var bet = cleanSum(node.getAttribute('bet'));

        var player = {
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

    // Если Hero не найден, пропускаем руку
    if (!heroPlayer) return null;

    // Поиск большого блайнда
    var bigBlind = 0;
    var round0 = gameNode.querySelector('round[no="0"]');
    if (round0) {
        var actions0 = round0.querySelectorAll('action');
        for (var a = 0; a < actions0.length; a++) {
            var action = actions0[a];
            var type = parseInt(action.getAttribute('type'));
            // ИСПРАВЛЕНО: используем cleanSum
            if (type === 2) { // BB
                bigBlind = cleanSum(action.getAttribute('sum'));
                break;
            }
        }
    }

    // Парсим карты Hero
    var pocketCardsNode = gameNode.querySelector('cards[type="Pocket"][player="' + heroNick + '"]');
    var heroCards = null;
    if (pocketCardsNode) {
        var cardsText = pocketCardsNode.textContent.trim();
        if (cardsText !== 'X X') {
            heroCards = cardsText;
        }
    }

    // Парсим действия Hero и считаем инвестиции
    var actions = parseActions(gameNode, heroNick);
    var totalInvested = calculateInvestment(actions);

    var totalPlayers = players.length;
    var heroPosition = getPosition(heroIndex, totalPlayers);

    var wentToShowdown = false;
    var riverNode = gameNode.querySelector('round[no="4"]');
    if (riverNode) {
        var heroActionsAfterRiver = riverNode.querySelectorAll('action[player="' + heroNick + '"]');
        wentToShowdown = heroActionsAfterRiver.length > 0;
    }

    // Результат
    var result = win - totalInvested;

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
        players: players.map(function(p) {
            return {
                name: p.name,
                isHero: p.isHero,
                seat: p.seat,
                bet: p.bet,
                win: p.win
            };
        })
    };
}

function parseActions(gameNode, heroNick) {
    var allActions = [];
    var roundNodes = gameNode.querySelectorAll('round');

    for (var r = 0; r < roundNodes.length; r++) {
        var roundNode = roundNodes[r];
        var roundNo = parseInt(roundNode.getAttribute('no') || 0);
        var actions = roundNode.querySelectorAll('action');

        for (var a = 0; a < actions.length; a++) {
            var action = actions[a];
            var player = action.getAttribute('player');
            var type = parseInt(action.getAttribute('type') || 0);
            // ИСПРАВЛЕНО: используем cleanSum
            var sum = cleanSum(action.getAttribute('sum'));

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
    var totalInvested = 0;
    var heroActions = actions.filter(function(a) { return a.isHero; });

    for (var i = 0; i < heroActions.length; i++) {
        var action = heroActions[i];
        var type = action.type;
        // ИСПРАВЛЕНО: используем cleanSum
        var sum = cleanSum(action.sum);

        // Блайнды всегда инвестиция
        if (type === ACTION_TYPES.SB || type === ACTION_TYPES.BB) {
            totalInvested += sum;
            continue;
        }

        // Коллы и олл-ин всегда инвестиция
        if (type === ACTION_TYPES.CALL || type === ACTION_TYPES.ALLIN) {
            totalInvested += sum;
            continue;
        }

        // Ставка или рейз - проверяем, были ли они уравнены
        if (type === ACTION_TYPES.BET || type === ACTION_TYPES.RAISE) {
            var currentRound = action.round;
            var nextActions = actions.filter(function(a) {
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