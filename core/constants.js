// core/constants.js
// ============================================================
// Константы
// ============================================================

const POSITIONS = {
    BTN: 'BTN',
    SB: 'SB',
    BB: 'BB',
    EP: 'EP',
    EP_1: 'EP-1',
    EP_2: 'EP-2',
    EP_3: 'EP-3',
    MP: 'MP',
    CO: 'CO'
};

const POSITION_GROUPS = {
    EP: ['EP', 'EP-1', 'EP-2', 'EP-3'],
    MP: ['MP'],
    CO: ['CO'],
    BTN: ['BTN'],
    BLINDS: ['SB', 'BB']
};

const ACTION_TYPES = {
    FOLD: 0,
    SB: 1,
    BB: 2,
    CALL: 3,
    CHECK: 4,
    BET: 5,
    ALLIN: 7,
    RAISE: 23
};

const STREETS = {
    PREFLOP: 0,
    FLOP: 1,
    TURN: 2,
    RIVER: 3
};

const DEFAULT_SETTINGS = {
    dayStartHour: 6,
    sessionBreakMinutes: 5,
    currency: 'EUR',
    theme: 'light',
    currencyRates: {
        USD: 1.10,
        EUR: 1.00,
        RUB: 90.00
    }
};