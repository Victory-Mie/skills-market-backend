// Cleanup expired or stopped trial containers
const { prisma } = require('../../utils/db');
const dockerManager = require('../../utils/docker-manager');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Cleanup] Starting trial container cleanup');

    // Get all running trials
    const runningTrials = await prisma.trial.findMany({
      where: {
        status: 'RUNNING',
      },
    });

    console.log(`[Cleanup] Found ${runningTrials.length} running trials`);

    // Check each trial for expiration
    const now = new Date();
    const trialsToStop = [];

    for (const trial of runningTrials) {
      // Check if trial has expired
      if (trial.endsAt < now) {
        trialsToStop.push(trial);
        console.log(`[Cleanup] Trial expired: ${trial.id} (ended at ${trial.endsAt})`);
      }
    }

    // Stop expired containers
    const cleanupResults = await dockerManager.cleanupContainers(trialsToStop);

    // Update trial statuses in database
    for (const trial of trialsToStop) {
      await prisma.trial.update({
        where: { id: trial.id },
        data: {
          status: 'COMPLETED',
        },
      });
    }

    console.log(`[Cleanup] Cleanup complete: ${cleanupResults.cleaned} containers cleaned`);

    res.json({
      success: true,
      message: 'Trial cleanup completed',
      results: {
        totalRunningTrials: runningTrials.length,
        expiredTrials: trialsToStop.length,
        cleaned: cleanupResults.cleaned,
        failed: cleanupResults.failed,
        errors: cleanupResults.errors,
      },
    });
  } catch (error) {
    console.error('[Cleanup] Error during trial cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup trials' });
  }
};
