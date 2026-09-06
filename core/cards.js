// core/cards.js
// ============================================================
// Работа с картами
// ============================================================

const RANK_ORDER = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14
};

const RANK_TO_SYMBOL = {
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': 'T',
    'J': 'J',
    'Q': 'Q',
    'K': 'K',
    'A': 'A'
};

const SUIT_MAP = {
    'C': 'c',
    'D': 'd',
    'H': 'h',
    'S': 's'
};

function normalizeCards(cardsString) {
    if (!cardsString || cardsString === 'X X') return null;

    const parts = cardsString.split(' ');
    if (parts.length !== 2) return null;

    const card1 = parseCard(parts[0]);
    const card2 = parseCard(parts[1]);

    if (!card1 || !card2) return null;

    const cards = [card1, card2].sort((a, b) => {
        if (a.rank !== b.rank) return b.rank - a.rank;
        return a.suit.localeCompare(b.suit);
    });

    return cards.map(c => c.rankSymbol + c.suit).join('');
}

function parseCard(cardStr) {
    const suit = cardStr.charAt(0);
    const rank = cardStr.substring(1);

    if (!SUIT_MAP[suit]) return null;

    return {
        suit: SUIT_MAP[suit],
        rank: RANK_ORDER[rank],
        rankSymbol: RANK_TO_SYMBOL[rank]
    };
}

function getHandType(cards) {
    if (!cards) return 'UNKNOWN';
    
    const normalized = normalizeCards(cards);
    if (!normalized) return 'UNKNOWN';
    
    const parts = cards.split(' ');
    const c1 = parseCard(parts[0]);
    const c2 = parseCard(parts[1]);
    if (!c1 || !c2) return 'UNKNOWN';
    
    if (c1.rank === c2.rank) return 'PAIR';
    if (c1.suit === c2.suit) return 'SUITED';
    if (c1.rank >= 12 && c2.rank >= 12) return 'BROADWAY';
    if (c1.rank === 14 || c2.rank === 14) return 'ACE_HIGH';
    
    return 'OFFSUIT';
}