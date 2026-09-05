// core/storage/dataManager.js
// ============================================================
// Управление данными
// ============================================================

function DataManager() {
  this.hands = [];
  this.stats = null;
  this.settings = this.loadSettings();
  this.heroNick = '';
  this.aliases = [];
  this.calculator = new StatsCalculator();
}

DataManager.prototype.loadSettings = function() {
  try {
    var saved = localStorage.getItem('pokerSettings');
    if (saved) {
      var settings = JSON.parse(saved);
      return Object.assign({}, DEFAULT_SETTINGS, settings);
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return Object.assign({}, DEFAULT_SETTINGS);
};

DataManager.prototype.saveSettings = function() {
  try {
    localStorage.setItem('pokerSettings', JSON.stringify(this.settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
};

DataManager.prototype.loadHands = function() {
  try {
    var saved = localStorage.getItem('pokerHands');
    if (saved) {
      this.hands = JSON.parse(saved).map(function(h) {
        return Object.assign({}, h, {
          startDate: new Date(h.startDate)
        });
      });
      
      if (this.heroNick) {
        this.recalculateStats();
      }
      return true;
    }
  } catch (e) {
    console.error('Error loading hands:', e);
  }
  return false;
};

DataManager.prototype.saveHands = function() {
  try {
    localStorage.setItem('pokerHands', JSON.stringify(this.hands));
  } catch (e) {
    console.error('Error saving hands:', e);
  }
};

DataManager.prototype.initAfterHeroSelection = function() {
  if (this.heroNick && this.hands.length > 0) {
    this.recalculateStats();
  }
};

DataManager.prototype.addHands = function(newHands) {
  var existingCodes = new Set(this.hands.map(function(h) { return h.gamecode; }));
  var uniqueNewHands = newHands.filter(function(h) {
    return !existingCodes.has(h.gamecode);
  });
  
  if (uniqueNewHands.length === 0) {
    return { added: 0, duplicates: newHands.length };
  }
  
  this.hands = this.hands.concat(uniqueNewHands);
  this.saveHands();
  
  if (this.heroNick) {
    this.recalculateStats();
  }
  
  return {
    added: uniqueNewHands.length,
    duplicates: newHands.length - uniqueNewHands.length
  };
};

DataManager.prototype.recalculateStats = function() {
  var self = this;
  this.calculator.reset();
  
  var heroHands = this.hands.filter(function(hand) {
    var isHero = hand.heroName === self.heroNick;
    var isAlias = self.aliases.some(function(alias) {
      return hand.heroName === alias;
    });
    return isHero || isAlias;
  });
  
  heroHands.sort(function(a, b) {
    return a.startDate - b.startDate;
  });
  
  for (var i = 0; i < heroHands.length; i++) {
    this.calculator.addHand(heroHands[i]);
  }
  
  this.stats = this.calculator.getStats(this.settings?.sessionBreakMinutes || 5);
};

DataManager.prototype.getStats = function(filters) {
  filters = filters || {};
  if (!this.stats) {
    this.recalculateStats();
  }
  
  var breakMinutes = this.settings?.sessionBreakMinutes || 5;
  var stats = Object.assign({}, this.stats);
  
  if (filters.limits && filters.limits.length > 0) {
    var filteredHands = this.hands.filter(function(hand) {
      var limit = 'NL' + hand.limit;
      return filters.limits.indexOf(limit) !== -1;
    });
    
    var tempCalculator = new StatsCalculator();
    for (var i = 0; i < filteredHands.length; i++) {
      tempCalculator.addHand(filteredHands[i]);
    }
    stats = tempCalculator.getStats(breakMinutes);
  }
  
  if (filters.startDate && filters.endDate) {
    var start = new Date(filters.startDate);
    var end = new Date(filters.endDate);
    var filteredHands = this.hands.filter(function(hand) {
      var date = new Date(hand.startDate);
      return date >= start && date <= end;
    });
    
    var tempCalculator = new StatsCalculator();
    for (var i = 0; i < filteredHands.length; i++) {
      tempCalculator.addHand(filteredHands[i]);
    }
    stats = tempCalculator.getStats(breakMinutes);
  }
  
  return stats;
};

DataManager.prototype.getDays = function(settings) {
  settings = settings || {};
  var dayStartHour = settings.dayStartHour || this.settings.dayStartHour;
  var sessionBreak = settings.sessionBreakMinutes || this.settings.sessionBreakMinutes;
  
  var self = this;
  var heroHands = this.hands.filter(function(hand) {
    var isHero = hand.heroName === self.heroNick;
    var isAlias = self.aliases.some(function(alias) {
      return hand.heroName === alias;
    });
    return isHero || isAlias;
  });
  
  var daysMap = {};
  
  for (var i = 0; i < heroHands.length; i++) {
    var hand = heroHands[i];
    var date = new Date(hand.startDate);
    var dayKey = this.getDayKey(date, dayStartHour);
    
    if (!daysMap[dayKey]) {
      daysMap[dayKey] = {
        date: dayKey,
        hands: [],
        netResult: 0
      };
    }
    
    daysMap[dayKey].hands.push(hand);
    daysMap[dayKey].netResult += hand.result;
  }
  
  var result = [];
  for (var dayKey in daysMap) {
    var dayData = daysMap[dayKey];
    var sortedHands = dayData.hands.slice().sort(function(a, b) {
      return a.startDate - b.startDate;
    });
    var sessions = this.groupIntoSessions(sortedHands, sessionBreak);
    
    result.push({
      day: dayKey,
      hands: sortedHands,
      sessions: sessions,
      netResult: dayData.netResult,
      totalHands: sortedHands.length,
      totalTime: sessions.reduce(function(sum, s) { return sum + s.duration; }, 0)
    });
  }
  
  result.sort(function(a, b) {
    return a.day.localeCompare(b.day);
  });
  
  return result;
};

DataManager.prototype.getDayKey = function(date, dayStartHour) {
  var d = new Date(date);
  var hours = d.getHours();
  if (hours < dayStartHour) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

DataManager.prototype.groupIntoSessions = function(hands, breakMinutes) {
  if (hands.length === 0) return [];
  
  var sessions = [];
  var currentSession = [hands[0]];
  var breakMs = breakMinutes * 60 * 1000;
  
  for (var i = 1; i < hands.length; i++) {
    var prevHand = hands[i - 1];
    var currentHand = hands[i];
    var diff = currentHand.startDate - prevHand.startDate;
    
    if (diff > breakMs) {
      sessions.push({
        hands: currentSession,
        startTime: currentSession[0].startDate,
        endTime: currentSession[currentSession.length - 1].startDate,
        duration: (currentSession[currentSession.length - 1].startDate - currentSession[0].startDate) / 1000,
        netResult: currentSession.reduce(function(sum, h) { return sum + h.result; }, 0),
        handsCount: currentSession.length
      });
      currentSession = [currentHand];
    } else {
      currentSession.push(currentHand);
    }
  }
  
  if (currentSession.length > 0) {
    sessions.push({
      hands: currentSession,
      startTime: currentSession[0].startDate,
      endTime: currentSession[currentSession.length - 1].startDate,
      duration: (currentSession[currentSession.length - 1].startDate - currentSession[0].startDate) / 1000,
      netResult: currentSession.reduce(function(sum, h) { return sum + h.result; }, 0),
      handsCount: currentSession.length
    });
  }
  
  return sessions;
};

DataManager.prototype.clearAll = function() {
  this.hands = [];
  this.stats = null;
  this.calculator.reset();
  localStorage.removeItem('pokerHands');
};

DataManager.prototype.getAllNicks = function() {
  var nicks = new Set();
  for (var i = 0; i < this.hands.length; i++) {
    var hand = this.hands[i];
    for (var j = 0; j < hand.players.length; j++) {
      nicks.add(hand.players[j].name);
    }
  }
  return Array.from(nicks).sort();
};

DataManager.prototype.setHero = function(nick, aliases) {
  aliases = aliases || [];
  this.heroNick = nick;
  this.aliases = aliases;
  if (this.hands.length > 0) {
    this.recalculateStats();
  }
};

DataManager.prototype.updateSettings = function(settings) {
  this.settings = Object.assign({}, this.settings, settings);
  this.saveSettings();
  if (this.heroNick && this.hands.length > 0) {
    this.recalculateStats();
  }
};