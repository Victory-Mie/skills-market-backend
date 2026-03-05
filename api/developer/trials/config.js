// Configure trial settings for a skill (developer only)
const { prisma } = require('../../../utils/db');
const { verifyToken } = require('../../../utils/auth');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication and developer role
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = verifyToken(token);
    if (!user || !user.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is a developer
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    });

    if (!userData || userData.role !== 'DEVELOPER') {
      return res.status(403).json({ error: 'Developer access required' });
    }

    const { skillId, enabled, duration, maxCpuPercent, maxMemoryMB, maxDiskMB, maxDailyTrials } = req.body;

    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    // Verify that the skill belongs to this developer
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { authorId: true },
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (skill.authorId !== user.userId) {
      return res.status(403).json({ error: 'You can only configure trials for your own skills' });
    }

    // Validate input
    if (duration !== undefined && (duration < 5 || duration > 60)) {
      return res.status(400).json({ error: 'Duration must be between 5 and 60 minutes' });
    }

    if (maxCpuPercent !== undefined && (maxCpuPercent < 10 || maxCpuPercent > 100)) {
      return res.status(400).json({ error: 'CPU percentage must be between 10 and 100' });
    }

    if (maxMemoryMB !== undefined && (maxMemoryMB < 128 || maxMemoryMB > 2048)) {
      return res.status(400).json({ error: 'Memory must be between 128 and 2048 MB' });
    }

    if (maxDiskMB !== undefined && (maxDiskMB < 256 || maxDiskMB > 4096)) {
      return res.status(400).json({ error: 'Disk must be between 256 and 4096 MB' });
    }

    if (maxDailyTrials !== undefined && (maxDailyTrials < 1 || maxDailyTrials > 10)) {
      return res.status(400).json({ error: 'Daily trials limit must be between 1 and 10' });
    }

    // Upsert trial configuration
    const trialConfig = await prisma.trialConfig.upsert({
      where: { skillId },
      create: {
        skillId,
        enabled: enabled !== undefined ? enabled : true,
        duration: duration || 15,
        maxCpuPercent: maxCpuPercent || 50,
        maxMemoryMB: maxMemoryMB || 512,
        maxDiskMB: maxDiskMB || 1024,
        maxDailyTrials: maxDailyTrials || 3,
      },
      update: {
        ...(enabled !== undefined && { enabled }),
        ...(duration !== undefined && { duration }),
        ...(maxCpuPercent !== undefined && { maxCpuPercent }),
        ...(maxMemoryMB !== undefined && { maxMemoryMB }),
        ...(maxDiskMB !== undefined && { maxDiskMB }),
        ...(maxDailyTrials !== undefined && { maxDailyTrials }),
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json({
      success: true,
      trialConfig,
      message: 'Trial configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating trial config:', error);
    res.status(500).json({ error: 'Failed to update trial configuration' });
  }
};
