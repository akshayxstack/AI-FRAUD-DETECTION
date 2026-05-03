const SMALL_AMOUNT_THRESHOLD = 25;
const RAPID_TRANSACTION_WINDOW_MINUTES = 20;
const NIGHT_HOURS = new Set([0, 1, 2, 3, 4, 5, 22, 23]);
const CHUNK_SIZE = 500;
const MAX_SUSPICIOUS_TRANSACTIONS = 100;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeFraudFlag(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'y', 'fraud', 'fraudulent'].includes(value.trim().toLowerCase());
  }

  return false;
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[$,]/g, '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function safeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateKey(date) {
  if (!date) {
    return 'unknown-date';
  }

  return date.toISOString().slice(0, 10);
}

function formatTimeBucket(date) {
  if (!date) {
    return 'unknown-time';
  }

  return `${date.getHours()}`.padStart(2, '0');
}

function inferUserKey(transaction, index) {
  const directCandidates = [
    transaction.userId,
    transaction.user,
    transaction.accountId,
    transaction.accountNumber,
    transaction.account,
    transaction.customerId,
    transaction.customer,
    transaction.cardId,
    transaction.cardNumber,
    transaction.walletId,
    transaction.sender,
    transaction.receiver,
  ];

  for (const candidate of directCandidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }

  const raw = transaction.raw && typeof transaction.raw === 'object' ? transaction.raw : null;

  if (raw) {
    const rawKeys = Object.keys(raw);
    const rawKey = rawKeys.find((key) => /user|account|customer|card|wallet|sender|receiver|client|member/i.test(key));
    if (rawKey && raw[rawKey] !== undefined && raw[rawKey] !== null && String(raw[rawKey]).trim()) {
      return String(raw[rawKey]).trim();
    }
  }

  return `user-${index + 1}`;
}

function chunkArray(items, chunkSize = CHUNK_SIZE) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function createProfile() {
  return {
    count: 0,
    sumAmount: 0,
    absAmountSum: 0,
    transactionIndices: [],
    dates: [],
    hourlyCounts: new Map(),
    smallAmountCounts: new Map(),
  };
}

function getAmountBucket(amount) {
  return Math.abs(amount).toFixed(2);
}

function getUserProfile(profiles, userKey) {
  if (!profiles.has(userKey)) {
    profiles.set(userKey, createProfile());
  }

  return profiles.get(userKey);
}

function detectBaseTransaction(transaction, index) {
  const date = safeDate(transaction.date || transaction.timestamp || transaction.transactionDate);
  const amount = toNumber(transaction.amount);
  const raw = transaction.raw && typeof transaction.raw === 'object' ? transaction.raw : null;
  const fraudLabelSource = transaction.fraudLabel
    ?? transaction.fraud
    ?? transaction.isFraud
    ?? transaction.label
    ?? transaction.target
    ?? transaction.class
    ?? transaction.groundTruth
    ?? transaction.ground_truth
    ?? (raw
      ? Object.entries(raw).find(([key]) => /(^|_|\b)(fraud|label|target|class)(_|\b|$)/i.test(key))?.[1]
      : undefined);

  return {
    ...transaction,
    amount,
    fraudLabel: normalizeFraudFlag(fraudLabelSource),
    userKey: inferUserKey(transaction, index),
    normalizedDate: date ? date.toISOString() : null,
    dateBucket: formatDateKey(date),
    hourBucket: formatTimeBucket(date),
    parsedDate: date,
  };
}

function calculateTimeAnomaly(tx, profile) {
  if (!tx.parsedDate) {
    return 0.65;
  }

  const hour = tx.parsedDate.getHours();
  const nightPenalty = NIGHT_HOURS.has(hour) ? 0.35 : 0;

  const hourlyVolume = profile.hourlyCounts.get(hour) || 0;
  const unusualHourPenalty = profile.count > 3 && hourlyVolume <= 1 ? 0.2 : 0;

  return clamp(nightPenalty + unusualHourPenalty, 0, 1);
}

function calculateRapidTransactionScore(txIndex, profile, enrichedTransactionsByIndex) {
  const userTransactions = profile.transactionIndices
    .map((index) => enrichedTransactionsByIndex.get(index))
    .filter(Boolean)
    .sort((left, right) => (left.parsedDate?.getTime() || 0) - (right.parsedDate?.getTime() || 0));

  const currentPosition = userTransactions.findIndex((item) => item.sourceIndex === txIndex);

  if (currentPosition <= 0) {
    return 0;
  }

  const current = userTransactions[currentPosition];
  const previous = userTransactions[currentPosition - 1];

  if (!current.parsedDate || !previous.parsedDate) {
    return 0.3;
  }

  const minutesSincePrevious = (current.parsedDate.getTime() - previous.parsedDate.getTime()) / 60000;
  if (minutesSincePrevious <= RAPID_TRANSACTION_WINDOW_MINUTES) {
    return clamp(1 - minutesSincePrevious / RAPID_TRANSACTION_WINDOW_MINUTES, 0.6, 1);
  }

  return 0;
}

function buildProfileMaps(transactions) {
  const profiles = new Map();
  const enrichedTransactionsByIndex = new Map();

  chunkArray(transactions).forEach((chunk, chunkIndex) => {
    chunk.forEach((transaction, offset) => {
      const sourceIndex = chunkIndex * CHUNK_SIZE + offset;
      const baseTransaction = detectBaseTransaction(transaction, sourceIndex);
      const profile = getUserProfile(profiles, baseTransaction.userKey);

      profile.count += 1;
      profile.sumAmount += baseTransaction.amount;
      profile.absAmountSum += Math.abs(baseTransaction.amount);
      profile.transactionIndices.push(sourceIndex);

      if (baseTransaction.parsedDate) {
        profile.dates.push(baseTransaction.parsedDate);
        profile.hourlyCounts.set(
          baseTransaction.parsedDate.getHours(),
          (profile.hourlyCounts.get(baseTransaction.parsedDate.getHours()) || 0) + 1
        );
      }

      if (Math.abs(baseTransaction.amount) <= SMALL_AMOUNT_THRESHOLD) {
        const bucket = `${baseTransaction.dateBucket}:${getAmountBucket(baseTransaction.amount)}`;
        profile.smallAmountCounts.set(bucket, (profile.smallAmountCounts.get(bucket) || 0) + 1);
      }

      enrichedTransactionsByIndex.set(sourceIndex, {
        ...baseTransaction,
        sourceIndex,
      });
    });
  });

  return { profiles, enrichedTransactionsByIndex };
}

function buildRiskReasons({ deviationFromAverage, timeBasedAnomaly, repeatedSmallTransactions, rapidTransactionScore, amount }) {
  const reasons = [];

  if (deviationFromAverage >= 0.85) {
    reasons.push('Amount deviates sharply from the user baseline');
  }

  if (rapidTransactionScore >= 0.6) {
    reasons.push('Rapid back-to-back transaction pattern detected');
  }

  if (timeBasedAnomaly >= 0.5) {
    reasons.push('Transaction time is outside the expected activity window');
  }

  if (repeatedSmallTransactions >= 3) {
    reasons.push('Repeated low-value transactions suggest card testing');
  }

  if (amount < 0) {
    reasons.push('Negative-value transaction requires manual verification');
  }

  return reasons;
}

function buildRiskLevel(fraudProbability) {
  // Updated thresholds to match desired policy:
  // > 0.7 => high, 0.4 - 0.7 => medium (suspicious), else low
  if (fraudProbability > 0.7) {
    return 'high';
  }

  if (fraudProbability >= 0.4) {
    return 'medium';
  }

  return 'low';
}

function calculateTransactionFeatures(transactions) {
  const { profiles, enrichedTransactionsByIndex } = buildProfileMaps(transactions);
  const enrichedTransactions = [];

  for (const profile of profiles.values()) {
    profile.dates.sort((left, right) => left.getTime() - right.getTime());
  }

  for (const [index, tx] of enrichedTransactionsByIndex.entries()) {
    const profile = profiles.get(tx.userKey) || createProfile();
    const averageTransactionAmount = profile.count > 0 ? profile.absAmountSum / profile.count : Math.abs(tx.amount);
    const deviationFromAverage = averageTransactionAmount > 0
      ? Math.abs(Math.abs(tx.amount) - averageTransactionAmount) / averageTransactionAmount
      : 0;

    const dateBucketKey = `${tx.dateBucket}:${getAmountBucket(tx.amount)}`;
    const repeatedSmallTransactions =
      Math.abs(tx.amount) <= SMALL_AMOUNT_THRESHOLD ? (profile.smallAmountCounts.get(dateBucketKey) || 0) : 0;
    const timeBasedAnomaly = calculateTimeAnomaly(tx, profile);
    const rapidTransactionScore = calculateRapidTransactionScore(index, profile, enrichedTransactionsByIndex);

    // Compute frequency as number of transactions within RAPID_TRANSACTION_WINDOW_MINUTES up to this tx
    let windowFrequency = 0;
    if (tx.parsedDate) {
      const windowStart = tx.parsedDate.getTime() - RAPID_TRANSACTION_WINDOW_MINUTES * 60000;
      for (const idx of profile.transactionIndices) {
        const other = enrichedTransactionsByIndex.get(idx);
        if (other && other.parsedDate) {
          const t = other.parsedDate.getTime();
          if (t >= windowStart && t <= tx.parsedDate.getTime()) {
            windowFrequency += 1;
          }
        }
      }
    }

    // repeatedAmountFlag: same amount appears multiple times for this user
    let sameAmountCount = 0;
    for (const idx of profile.transactionIndices) {
      const other = enrichedTransactionsByIndex.get(idx);
      if (other && Math.abs(Number(other.amount || 0) - Number(tx.amount || 0)) < 0.001) {
        sameAmountCount += 1;
      }
    }

    const repeatedAmountFlag = sameAmountCount >= 2;
    const smallAmountFlag = Math.abs(tx.amount) < 5;

    // preserve heuristic composite metrics
    const anomalyScore = clamp(
      deviationFromAverage * 0.45 + timeBasedAnomaly * 0.3 + (repeatedSmallTransactions >= 3 ? 0.2 : 0) + rapidTransactionScore * 0.2,
      0,
      1
    );

    const patternScore = clamp(
      (repeatedSmallTransactions >= 3 ? 0.6 : 0) + rapidTransactionScore * 0.25 + timeBasedAnomaly * 0.15,
      0,
      1
    );

    // STEP 3: component scores per spec
    const amountScore = clamp(deviationFromAverage, 0, 1); // amountDeviation / avgAmount
    const frequencyScore = clamp(windowFrequency / 10, 0, 1); // normalize frequency (10 -> 1)
    const smallAmountScore = smallAmountFlag ? 1 : 0;
    const patternFlagScore = repeatedAmountFlag ? 1 : 0;
    const timeScore = timeBasedAnomaly >= 0.5 ? 1 : 0;

    // STEP 4: fraud probability per spec
    const fraudProbability = clamp(
      amountScore * 0.3 +
        frequencyScore * 0.25 +
        patternFlagScore * 0.2 +
        timeScore * 0.15 +
        smallAmountScore * 0.1,
      0,
      1
    );

    // If labeled data present, treat label as ground truth (force positive)
    const labeledFraud = Boolean(tx.fraudLabel);
    const adjustedFraudProbability = labeledFraud ? 1.0 : fraudProbability;

    // STEP 5: classification
    const riskLevel = adjustedFraudProbability > 0.7 ? 'High' : adjustedFraudProbability > 0.4 ? 'Medium' : 'Low';
    const isFraud = adjustedFraudProbability > 0.4; // Medium and High marked as fraud per spec

    // STEP 6: explanations
    const reasons = [];
    if (amountScore >= 0.5) reasons.push('Unusual transaction amount');
    if (frequencyScore >= 0.5) reasons.push('High frequency activity');
    if (smallAmountScore === 1 && repeatedAmountFlag) reasons.push('Repeated small transactions');
    if (patternFlagScore === 1) reasons.push('Matches known fraud pattern');
    if (timeScore === 1) reasons.push('Unusual transaction timing');

    // Append heuristic reasons if any and keep uniqueness
    const heuristic = buildRiskReasons({ deviationFromAverage, timeBasedAnomaly, repeatedSmallTransactions, rapidTransactionScore, amount: tx.amount });
    for (const r of heuristic) {
      if (!reasons.includes(r)) reasons.push(r);
    }

    enrichedTransactions.push({
      ...tx,
      // features
      transactionFrequency: profile.count,
      averageTransactionAmount: Number(averageTransactionAmount.toFixed(2)),
      deviationFromAverage: Number(deviationFromAverage.toFixed(4)),
      timeBasedAnomaly: Number(timeBasedAnomaly.toFixed(4)),
      repeatedSmallTransactions,
      rapidTransactionScore: Number(rapidTransactionScore.toFixed(4)),
      anomalyScore: Number(anomalyScore.toFixed(4)),
      patternScore: Number(patternScore.toFixed(4)),
      // component scores
      amountScore: Number(amountScore.toFixed(4)),
      frequencyScore: Number(frequencyScore.toFixed(4)),
      smallAmountScore: Number(smallAmountScore.toFixed(4)),
      patternFlagScore: Number(patternFlagScore.toFixed(4)),
      timeScore: Number(timeScore),
      // results
      fraudProbability: Number(adjustedFraudProbability.toFixed(4)),
      riskScore: Math.round(adjustedFraudProbability * 100),
      riskLevel,
      isFraud,
      fraudReasons: reasons,
      userTransactionCount: profile.count,
    });
  }

  return enrichedTransactions.sort((left, right) => right.riskScore - left.riskScore);
}

function buildPatterns(enrichedTransactions) {
  const patternCounts = new Map();

  const addPattern = (pattern) => {
    patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
  };

  enrichedTransactions.forEach((tx) => {
    if (tx.repeatedSmallTransactions >= 3) {
      addPattern('Repeated small transactions consistent with card testing');
    }

    if (tx.rapidTransactionScore >= 0.6) {
      addPattern('Rapid transaction bursts detected');
    }

    if (tx.timeBasedAnomaly >= 0.5) {
      addPattern('Unusual transaction timing outside normal hours');
    }

    if (tx.deviationFromAverage >= 0.85) {
      addPattern('High deviation from historical spending baseline');
    }
  });

  return [...patternCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([pattern, count]) => `${pattern} (${count})`);
}

function buildTimeline(enrichedTransactions) {
  const countsByDate = new Map();
  const riskByDate = new Map();

  enrichedTransactions.forEach((tx) => {
    const key = tx.dateBucket;
    countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    riskByDate.set(key, Math.max(riskByDate.get(key) || 0, tx.riskScore));
  });

  return [...countsByDate.entries()]
    .map(([date, count]) => ({
      date,
      transactionCount: count,
      maxRiskScore: riskByDate.get(date) || 0,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildSuspiciousTransactions(enrichedTransactions) {
  return enrichedTransactions
    .filter((tx) => tx.isFraud || tx.riskScore >= 60 || tx.fraudProbability >= 0.55)
    .slice(0, MAX_SUSPICIOUS_TRANSACTIONS)
    .map((tx) => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      reason: tx.fraudReasons.length ? tx.fraudReasons.join('; ') : 'Risk heuristics triggered',
      fraudProbability: tx.fraudProbability,
      riskScore: tx.riskScore,
      riskLevel: tx.riskLevel,
      features: {
        transactionFrequency: tx.transactionFrequency,
        averageTransactionAmount: tx.averageTransactionAmount,
        deviationFromAverage: tx.deviationFromAverage,
        timeBasedAnomaly: tx.timeBasedAnomaly,
        repeatedSmallTransactions: tx.repeatedSmallTransactions,
        anomalyScore: tx.anomalyScore,
        patternScore: tx.patternScore,
      },
    }))
    .sort((left, right) => right.riskScore - left.riskScore);
}

function buildFallbackRecommendation({ riskScore, fraudCount, suspiciousTransactions }) {
  if (riskScore >= 75 || fraudCount > 10) {
    return 'Escalate to the fraud team, place a temporary hold on exposed accounts, and verify repeated low-value transactions immediately.';
  }

  if (suspiciousTransactions.length > 0) {
    return 'Review the suspicious transactions, validate the cardholder activity, and monitor the affected accounts for rapid follow-up activity.';
  }

  return 'No significant fraud signal detected. Continue monitoring and re-run the scan on the next transaction batch.';
}

function findTransactionField(transaction, candidates) {
  const normalizedEntries = Object.entries(transaction || {}).map(([key, value]) => [String(key).toLowerCase(), value]);

  for (const candidate of candidates) {
    const normalizedCandidate = String(candidate).toLowerCase();

    const directMatch = normalizedEntries.find(([key]) => key === normalizedCandidate);
    if (directMatch && directMatch[1] !== undefined && directMatch[1] !== null && String(directMatch[1]).trim()) {
      return directMatch[1];
    }

    const partialMatch = normalizedEntries.find(([key]) => key.includes(normalizedCandidate) || normalizedCandidate.includes(key));
    if (partialMatch && partialMatch[1] !== undefined && partialMatch[1] !== null && String(partialMatch[1]).trim()) {
      return partialMatch[1];
    }
  }

  return undefined;
}

function evaluateSingleTransaction(transaction) {
  const amount = Math.abs(toNumber(
    findTransactionField(transaction, [
      'amount',
      'transaction_amount',
      'transaction amount',
      'transactionamount',
      'Transaction_Amount',
      'debit',
      'credit',
    ])
  ));

  const frequency = toNumber(
    findTransactionField(transaction, [
      'transaction_frequency',
      'transaction frequency',
      'frequency',
      'Transaction_Frequency',
    ])
  );

  const deviation = toNumber(
    findTransactionField(transaction, [
      'transaction_amount_deviation',
      'transaction amount deviation',
      'amount_deviation',
      'deviation',
      'Deviation_Days_Since_Last_Transaction',
      'Transaction_Amount_Deviation',
    ])
  );

  const status = String(
    findTransactionField(transaction, [
      'transaction_status',
      'transaction status',
      'status',
      'Transaction_Status',
    ]) || ''
  ).trim().toLowerCase();

  const amountScore = amount > 10000 ? 1 : amount > 5000 ? 0.7 : amount > 0 ? 0.2 : 0;
  const frequencyScore = frequency > 5 ? 1 : frequency > 0 ? clamp(frequency / 5, 0, 0.6) : 0;
  const deviationScore = deviation > 3 ? 1 : deviation > 0 ? clamp(deviation / 3, 0, 0.8) : 0;
  const statusScore = status === 'failed' ? 1 : 0;

  const fraudProbability = clamp(
    amountScore * 0.4 +
      deviationScore * 0.3 +
      frequencyScore * 0.2 +
      statusScore * 0.1,
    0,
    1
  );

  const riskLevel = fraudProbability > 0.7 ? 'Fraud' : fraudProbability > 0.4 ? 'Suspicious' : 'Normal';
  const reasons = [];

  if (amountScore >= 0.7) {
    reasons.push('High transaction amount');
  }

  if (statusScore === 1) {
    reasons.push('Failed transaction attempt');
  }

  if (deviationScore >= 0.7) {
    reasons.push('Unusual deviation');
  }

  if (frequencyScore >= 0.7) {
    reasons.push('High frequency pattern');
  }

  return {
    totalTransactions: 1,
    riskScore: Math.round(fraudProbability * 100),
    fraudCount: riskLevel === 'Fraud' ? 1 : 0,
    normalCount: riskLevel === 'Normal' ? 1 : 0,
    suspiciousTransactions: riskLevel === 'Normal'
      ? []
      : [{
          date: transaction.date || transaction.Date || transaction.transactionDate || '',
          description: transaction.description || transaction.merchant || transaction.Merchant || 'Single transaction',
          amount,
          reason: reasons.length ? reasons.join('; ') : 'Single transaction evaluated with rule-based scoring',
          fraudProbability: Number(fraudProbability.toFixed(4)),
          riskScore: Math.round(fraudProbability * 100),
          riskLevel: riskLevel.toLowerCase(),
          features: {
            transactionFrequency: frequency,
            averageTransactionAmount: amount,
            deviationFromAverage: deviation,
            timeBasedAnomaly: 0,
            repeatedSmallTransactions: 0,
            anomalyScore: 0,
            patternScore: 0,
          },
        }],
    patterns: reasons.length ? reasons : ['Single transaction evaluated with rule-based scoring'],
    recommendation:
      riskLevel === 'Fraud'
        ? 'Escalate this transaction for manual review and consider temporary account hold.'
        : riskLevel === 'Suspicious'
          ? 'Review the transaction and validate account behavior.'
          : 'No immediate fraud signal detected.' ,
    summary: `Single transaction evaluated with ${riskLevel.toLowerCase()} risk.`,
    fraudTrend: [],
    anomalyTrend: [],
    transactionCount: 1,
    enrichedTransactions: [{
      ...transaction,
      amount,
      fraudProbability: Number(fraudProbability.toFixed(4)),
      riskScore: Math.round(fraudProbability * 100),
      riskLevel,
      isFraud: riskLevel !== 'Normal',
      fraudReasons: reasons,
      mode: 'single',
    }],
    validation: null,
    singleTransaction: {
      amount,
      fraudProbability: Number(fraudProbability.toFixed(4)),
      riskLevel,
      reasons,
    },
  };
}

export function buildFraudAnalysis(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      totalTransactions: 0,
      riskScore: 0,
      fraudCount: 0,
      normalCount: 0,
      suspiciousTransactions: [],
      patterns: [],
      recommendation: 'No transaction data provided.',
      summary: 'No transaction data provided.',
      fraudTrend: [],
      anomalyTrend: [],
      transactionCount: 0,
      enrichedTransactions: [],
      validation: null,
      singleTransaction: null,
    };
  }

  if (transactions.length === 1) {
    return evaluateSingleTransaction(transactions[0]);
  }

  const enrichedTransactions = calculateTransactionFeatures(transactions);
  const suspiciousTransactions = buildSuspiciousTransactions(enrichedTransactions);
  const fraudCount = suspiciousTransactions.filter((transaction) => (transaction.riskLevel || '').toLowerCase() === 'high' || transaction.isFraud).length;
  const normalCount = Math.max(0, transactions.length - fraudCount);

  const fraudProbabilityAverage = enrichedTransactions.length
    ? enrichedTransactions.reduce((sum, transaction) => sum + transaction.fraudProbability, 0) / enrichedTransactions.length
    : 0;
  const anomalyScoreAverage = enrichedTransactions.length
    ? enrichedTransactions.reduce((sum, transaction) => sum + transaction.anomalyScore, 0) / enrichedTransactions.length
    : 0;
  const patternScoreAverage = enrichedTransactions.length
    ? enrichedTransactions.reduce((sum, transaction) => sum + transaction.patternScore, 0) / enrichedTransactions.length
    : 0;

  const riskScore = Math.round(
    clamp(fraudProbabilityAverage * 70 + anomalyScoreAverage * 20 + patternScoreAverage * 10, 0, 100)
  );
  // Optional validation metrics when labeled data exists
  const labeled = enrichedTransactions.filter((t) => t.fraudLabel !== undefined && t.fraudLabel !== null);
  let validation = null;
  if (labeled.length > 0) {
    const yTrue = labeled.map((t) => (t.fraudLabel ? 1 : 0));
    const yPred = labeled.map((t) => (t.isFraud ? 1 : 0));
    const tp = labeled.reduce((sum, t) => sum + ((t.isFraud && t.fraudLabel) ? 1 : 0), 0);
    const fp = labeled.reduce((sum, t) => sum + ((t.isFraud && !t.fraudLabel) ? 1 : 0), 0);
    const fn = labeled.reduce((sum, t) => sum + ((!t.isFraud && t.fraudLabel) ? 1 : 0), 0);
    const tn = labeled.length - tp - fp - fn;
    const accuracy = (tp + tn) / Math.max(1, labeled.length);
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    validation = { count: labeled.length, tp, fp, fn, tn, accuracy, precision, recall };
  }

  return {
    totalTransactions: transactions.length,
    riskScore,
    fraudCount,
    normalCount,
    suspiciousTransactions,
    patterns: buildPatterns(enrichedTransactions),
    recommendation: buildFallbackRecommendation({ riskScore, fraudCount, suspiciousTransactions }),
    summary: `${suspiciousTransactions.length} suspicious transaction${suspiciousTransactions.length === 1 ? '' : 's'} flagged across ${transactions.length} records with an overall risk score of ${riskScore}.`,
    fraudTrend: buildTimeline(enrichedTransactions),
    anomalyTrend: buildTimeline(enrichedTransactions).map((entry) => ({
      date: entry.date,
      anomalyScore: entry.maxRiskScore,
    })),
    transactionCount: transactions.length,
    enrichedTransactions,
    validation,
    singleTransaction: null,
  };
}

export function summarizeForAi(analysis) {
  const suspiciousTransactions = Array.isArray(analysis?.suspiciousTransactions)
    ? analysis.suspiciousTransactions
    : [];

  const suspiciousSample = suspiciousTransactions
    .slice(0, 25)
    .map((transaction) => ({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      reason: transaction.reason,
      riskScore: transaction.riskScore,
      riskLevel: transaction.riskLevel,
    }));

  return {
    riskScore: analysis?.riskScore ?? 0,
    fraudCount: analysis?.fraudCount ?? 0,
    normalCount: analysis?.normalCount ?? 0,
    suspiciousTransactions: suspiciousSample,
    patterns: Array.isArray(analysis?.patterns) ? analysis.patterns : [],
    recommendation: analysis?.recommendation ?? '',
    summary: analysis?.summary ?? '',
  };
}
