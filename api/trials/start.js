// Start a trial session
const { prisma } = require('../../utils/db');
const { verifyToken } = require('../../utils/auth');

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
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = verifyToken(token);
    if (!user || !user.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { skillId } = req.body;

    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    // Check if trial is enabled for this skill
    const trialConfig = await prisma.trialConfig.findUnique({
      where: { skillId },
    });

    if (!trialConfig || !trialConfig.enabled) {
      return res.status(400).json({ error: 'Trial is not available for this skill' });
    }

    // Check user's daily trial limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTrialsCount = await prisma.trial.count({
      where: {
        userId: user.userId,
        skillId,
        startedAt: {
          gte: today,
        },
      },
    });

    if (todayTrialsCount >= trialConfig.maxDailyTrials) {
      return res.status(429).json({
        error: 'Daily trial limit reached',
        limit: trialConfig.maxDailyTrials,
      });
    }

    // Get skill details
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Generate container ID and port
    const containerId = `skill-trial-${user.userId}-${skillId}-${Date.now()}`;
    const containerPort = 8000 + Math.floor(Math.random() * 1000);

    // Calculate end time
    const endsAt = new Date(Date.now() + trialConfig.duration * 60 * 1000);

    // Create trial record
    const trial = await prisma.trial.create({
      data: {
        skillId,
        userId: user.userId,
        containerId,
        containerPort,
        endsAt,
        status: 'RUNNING',
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            icon: true,
          },
        },
      },
    });

    // TODO: Start Docker container here
    // This is a placeholder for the container management logic
    console.log(`[Trial] Starting container ${containerId} for skill ${skillId}`);
    console.log(`[Trial] Port: ${containerPort}, Duration: ${trialConfig.duration} minutes`);
    console.log(`[Trial] Resource limits: CPU=${trialConfig.maxCpuPercent}%, Memory=${trialConfig.maxMemoryMB}MB`);

    // For MVP, we'll simulate container start
    // In production, integrate with Docker API

    res.json({
      success: true,
      trial: {
        id: trial.id,
        containerId: trial.containerId,
        containerPort: trial.containerPort,
        startedAt: trial.startedAt,
        endsAt: trial.endsAt,
        duration: trialConfig.duration,
        skill: trial.skill,
      },
      message: 'Trial session started successfully',
    });
  } catch (error) {
    console.error('Error starting trial:', error);
    res.status(500).json({ error: 'Failed to start trial session' });
  }
};
