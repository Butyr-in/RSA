// core/parser/statsCalculator.js
// ============================================================
// Калькулятор статистики
// ============================================================

function StatsCalculator() {
  this.reset();
}

StatsCalculator.prototype.reset = function() {
  this.stats = {
    totalHands: 0,
    totalWon: 0,
    totalLost: 0,
    netResult: 0,
    
    limits: {},
    
    vpipHands: 0,
    pfrHands: 0,
    
    threeBetCount: 0,
    threeBetOpportunities: 0,
    
    foldToThreeBetCount: 0,
    foldToThreeBetOpportunities: 0,
    
    rfiCount: 0,
    rfiOpportunities: 0,
    
    callVsRfiCount: 0,
    callVsRfiOpportunities: 0,
    
    positions: {
      EP: { hands: 0, vpip: 0, pfr: 0, threeBet: 0, foldToThreeBetCount: 0, foldToThreeBetOpportunities: 0, rfi: 0, callVsRfi: 0, netResult: 0, threeBetOpportunities: 0 },
      MP: { hands: 0, vpip: 0, pfr: 0, threeBet: 0, foldToThreeBetCount: 0, foldToThreeBetOpportunities: 0, rfi: 0, callVsRfi: 0, netResult: 0, threeBetOpportunities: 0 },
      CO: { hands: 0, vpip: 0, pfr: 0, threeBet: 0, foldToThreeBetCount: 0, foldToThreeBetOpportunities: 0, rfi: 0, callVsRfi: 0, netResult: 0, threeBetOpportunities: 0 },
      BTN: { hands: 0, vpip: 0, pfr: 0, threeBet: 0, foldToThreeBetCount: 0, foldToThreeBetOpportunities: 0, rfi: 0, callVsRfi: 0, netResult: 0, threeBetOpportunities: 0 },
      BLINDS: { hands: 0, vpip: 0, pfr: 0, threeBet: 0, foldToThreeBetCount: 0, foldToThreeBetOpportunities: 0, rfi: 0, callVsRfi: 0, netResult: 0, threeBetOpportunities: 0 }
    },
    
    days: {},
    handsByCards: {}
  };
};

StatsCalculator.prototype.addHand = function(hand) {
  var stats = this.stats;
  
  stats.totalHands++;
  if (hand.result > 0) stats.totalWon++;
  if (hand.result < 0) stats.totalLost++;
  stats.netResult += hand.result;
  
  var limitKey = 'NL' + hand.limit;
  if (!stats.limits[limitKey]) {
    stats.limits[limitKey] = { hands: 0, netResult: 0 };
  }
  stats.limits[limitKey].hands++;
  stats.limits[limitKey].netResult += hand.result;
  
  var preflopActions = hand.actions.filter(function(a) {
    return a.round === 0 && a.isHero;
  });
  
  var hasVoluntaryAction = preflopActions.some(function(a) {
    return a.type === ACTION_TYPES.CALL || 
           a.type === ACTION_TYPES.RAISE || 
           a.type === ACTION_TYPES.BET;
  });
  
  if (hasVoluntaryAction) {
    stats.vpipHands++;
  }
  
  var hasRaise = preflopActions.some(function(a) {
    return a.type === ACTION_TYPES.RAISE;
  });
  
  if (hasRaise) {
    stats.pfrHands++;
  }
  
  var preflopActionsBeforeHero = hand.actions.filter(function(a) {
    return a.round === 0 && 
           !a.isHero && 
           (a.type === ACTION_TYPES.RAISE || a.type === ACTION_TYPES.BET);
  });
  
  if (hasRaise && preflopActionsBeforeHero.length === 0) {
    stats.rfiCount++;
  }
  if (preflopActionsBeforeHero.length === 0) {
    stats.rfiOpportunities++;
  }
  
  var enemyRaise = hand.actions.some(function(a) {
    return a.round === 0 && 
           !a.isHero && 
           (a.type === ACTION_TYPES.RAISE || a.type === ACTION_TYPES.BET);
  });
  
  if (enemyRaise) {
    stats.threeBetOpportunities++;
    if (hasRaise) {
      stats.threeBetCount++;
    }
  }
  
  var hasFold = hand.actions.some(function(a) {
    return a.round === 0 && 
           a.isHero && 
           a.type === ACTION_TYPES.FOLD;
  });
  
  if (hasFold && enemyRaise) {
    stats.foldToThreeBetCount++;
  }
  if (enemyRaise) {
    stats.foldToThreeBetOpportunities++;
  }
  
  var enemyRfi = hand.actions.some(function(a) {
    return a.round === 0 && 
           !a.isHero && 
           (a.type === ACTION_TYPES.RAISE || a.type === ACTION_TYPES.BET) &&
           hand.actions.filter(function(b) {
             return b.round === 0 && 
                    !b.isHero && 
                    (b.type === ACTION_TYPES.RAISE || b.type === ACTION_TYPES.BET) &&
                    b.sum < a.sum;
           }).length === 0;
  });
  
  if (enemyRfi) {
    stats.callVsRfiOpportunities++;
    var hasCall = hand.actions.some(function(a) {
      return a.round === 0 && 
             a.isHero && 
             a.type === ACTION_TYPES.CALL;
    });
    if (hasCall) {
      stats.callVsRfiCount++;
    }
  }
  
  var positionGroup = getPositionGroup(hand.heroPosition);
  if (stats.positions[positionGroup]) {
    var posStats = stats.positions[positionGroup];
    posStats.hands++;
    posStats.netResult += hand.result;
    
    if (hasVoluntaryAction) posStats.vpip++;
    if (hasRaise) posStats.pfr++;
    
    if (enemyRaise) {
      posStats.threeBetOpportunities = (posStats.threeBetOpportunities || 0) + 1;
      if (hasRaise) posStats.threeBet++;
    }
    
    if (hasFold && enemyRaise) {
      posStats.foldToThreeBetCount = (posStats.foldToThreeBetCount || 0) + 1;
    }
    if (enemyRaise) {
      posStats.foldToThreeBetOpportunities = (posStats.foldToThreeBetOpportunities || 0) + 1;
    }
    
    if (hasRaise && preflopActionsBeforeHero.length === 0) {
      posStats.rfi = (posStats.rfi || 0) + 1;
    }
    
    if (enemyRfi && hasCall) {
      posStats.callVsRfi = (posStats.callVsRfi || 0) + 1;
    }
  }
  
  if (hand.heroCards) {
    var cardsKey = hand.heroCards;
    if (!stats.handsByCards[cardsKey]) {
      stats.handsByCards[cardsKey] = {
        hands: 0,
        netResult: 0,
        vpip: 0,
        pfr: 0,
        threeBet: 0,
        foldToThreeBet: 0,
        rfi: 0,
        callVsRfi: 0
      };
    }
    
    var cardStats = stats.handsByCards[cardsKey];
    cardStats.hands++;
    cardStats.netResult += hand.result;
    if (hasVoluntaryAction) cardStats.vpip++;
    if (hasRaise) cardStats.pfr++;
    if (enemyRaise && hasRaise) cardStats.threeBet++;
    if (hasFold && enemyRaise) cardStats.foldToThreeBet++;
    if (hasRaise && preflopActionsBeforeHero.length === 0) cardStats.rfi++;
    if (enemyRfi && hasCall) cardStats.callVsRfi++;
  }
  
  var dayKey = hand.startDate.toISOString().split('T')[0];
  if (!stats.days[dayKey]) {
    stats.days[dayKey] = {
      hands: [],
      netResult: 0,
      sessions: []
    };
  }
  stats.days[dayKey].hands.push(hand);
  stats.days[dayKey].netResult += hand.result;
};

StatsCalculator.prototype.getStats = function(breakMinutes) {
  breakMinutes = breakMinutes || 5;
  var stats = this.stats;
  
  if (!stats) {
    return {
      totalHands: 0,
      totalWon: 0,
      totalLost: 0,
      netResult: 0,
      limits: {},
      vpipHands: 0,
      pfrHands: 0,
      threeBetCount: 0,
      threeBetOpportunities: 0,
      foldToThreeBetCount: 0,
      foldToThreeBetOpportunities: 0,
      rfiCount: 0,
      rfiOpportunities: 0,
      callVsRfiCount: 0,
      callVsRfiOpportunities: 0,
      vpipPercent: 0,
      pfrPercent: 0,
      threeBetPercent: 0,
      foldToThreeBetPercent: 0,
      rfiPercent: 0,
      callVsRfiPercent: 0,
      averageLimit: 0,
      favoriteLimit: 'NL0',
      positions: {},
      totalTime: 0,
      topHands: [],
      days: {}
    };
  }
  
  var result = {
    totalHands: stats.totalHands,
    totalWon: stats.totalWon,
    totalLost: stats.totalLost,
    netResult: stats.netResult,
    limits: stats.limits,
    vpipHands: stats.vpipHands,
    pfrHands: stats.pfrHands,
    threeBetCount: stats.threeBetCount,
    threeBetOpportunities: stats.threeBetOpportunities,
    foldToThreeBetCount: stats.foldToThreeBetCount,
    foldToThreeBetOpportunities: stats.foldToThreeBetOpportunities,
    rfiCount: stats.rfiCount,
    rfiOpportunities: stats.rfiOpportunities,
    callVsRfiCount: stats.callVsRfiCount,
    callVsRfiOpportunities: stats.callVsRfiOpportunities,
    vpipPercent: stats.totalHands > 0 ? (stats.vpipHands / stats.totalHands * 100) : 0,
    pfrPercent: stats.totalHands > 0 ? (stats.pfrHands / stats.totalHands * 100) : 0,
    threeBetPercent: stats.threeBetOpportunities > 0 ? (stats.threeBetCount / stats.threeBetOpportunities * 100) : 0,
    foldToThreeBetPercent: stats.foldToThreeBetOpportunities > 0 ? (stats.foldToThreeBetCount / stats.foldToThreeBetOpportunities * 100) : 0,
    rfiPercent: stats.rfiOpportunities > 0 ? (stats.rfiCount / stats.rfiOpportunities * 100) : 0,
    callVsRfiPercent: stats.callVsRfiOpportunities > 0 ? (stats.callVsRfiCount / stats.callVsRfiOpportunities * 100) : 0,
    averageLimit: this.calculateAverageLimit(stats.limits),
    favoriteLimit: this.calculateFavoriteLimit(stats.limits),
    positions: this.calculatePositionStats(stats.positions),
    totalTime: this.calculateTotalTime(stats.days, breakMinutes),
    topHands: this.getTopHands(stats.handsByCards, 10),
    days: stats.days
  };
  
  return result;
};

StatsCalculator.prototype.calculateAverageLimit = function(limits) {
  var totalHands = 0;
  var weightedSum = 0;
  
  for (var limit in limits) {
    var limitValue = parseInt(limit.replace('NL', ''));
    totalHands += limits[limit].hands;
    weightedSum += limitValue * limits[limit].hands;
  }
  
  return totalHands > 0 ? Math.round(weightedSum / totalHands) : 0;
};

StatsCalculator.prototype.calculateFavoriteLimit = function(limits) {
  var favorite = null;
  var maxHands = 0;
  
  for (var limit in limits) {
    if (limits[limit].hands > maxHands) {
      maxHands = limits[limit].hands;
      favorite = limit;
    }
  }
  
  return favorite || 'NL0';
};

StatsCalculator.prototype.calculatePositionStats = function(positions) {
  var result = {};
  
  for (var pos in positions) {
    var data = positions[pos];
    if (data.hands === 0) {
      result[pos] = {
        hands: 0,
        netResult: 0,
        vpip: 0,
        pfr: 0,
        threeBet: 0,
        foldToThreeBet: 0,
        rfi: 0,
        callVsRfi: 0
      };
      continue;
    }
    
    result[pos] = {
      hands: data.hands,
      netResult: data.netResult,
      vpip: (data.vpip / data.hands) * 100,
      pfr: (data.pfr / data.hands) * 100,
      threeBet: data.threeBetOpportunities > 0 ? (data.threeBet / data.threeBetOpportunities) * 100 : 0,
      foldToThreeBet: data.foldToThreeBetOpportunities > 0 ? (data.foldToThreeBetCount / data.foldToThreeBetOpportunities) * 100 : 0,
      rfi: data.hands > 0 ? ((data.rfi || 0) / data.hands) * 100 : 0,
      callVsRfi: data.hands > 0 ? ((data.callVsRfi || 0) / data.hands) * 100 : 0
    };
  }
  
  return result;
};

StatsCalculator.prototype.calculateTotalTime = function(days, breakMinutes) {
  var totalSeconds = 0;
  
  for (var dayKey in days) {
    var dayData = days[dayKey];
    var hands = dayData.hands;
    if (hands.length === 0) continue;
    
    var sortedHands = hands.slice().sort(function(a, b) {
      return a.startDate - b.startDate;
    });
    var sessions = this.groupIntoSessions(sortedHands, breakMinutes);
    dayData.sessions = sessions;
    
    for (var s = 0; s < sessions.length; s++) {
      totalSeconds += sessions[s].duration;
    }
  }
  
  return totalSeconds;
};

StatsCalculator.prototype.groupIntoSessions = function(hands, breakMinutes) {
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

StatsCalculator.prototype.getTopHands = function(handsByCards, limit) {
  limit = limit || 10;
  var entries = Object.entries(handsByCards);
  entries.sort(function(a, b) {
    return b[1].hands - a[1].hands;
  });
  entries = entries.slice(0, limit);
  
  return entries.map(function(entry) {
    var cards = entry[0];
    var data = entry[1];
    return {
      cards: cards,
      hands: data.hands,
      netResult: data.netResult,
      vpipPercent: (data.vpip / data.hands) * 100,
      pfrPercent: (data.pfr / data.hands) * 100
    };
  });
};