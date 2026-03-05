// Get trial statistics for developers
const { prisma } = require('../../../utils/db');
const { verifyToken } = require('../../../utils/auth');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    // Get skill ID from query
    const { skillId, startDate, endDate } = req.query;

    // Build where clause
    const where = {
      skill: {
        authorId: user.userId,
      },
    };

    if (skillId) {
      where.skillId = skillId;
    }

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) {
        where.startedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.startedAt.lte = new Date(endDate);
      }
    }

    // Get statistics
    const totalTrials = await prisma.trial.count({ where });

    const completedTrials = await prisma.trial.count({
      where: { ...where, status: 'COMPLETED' },
    });

    const failedTrials = await prisma.trial.count({
      where: { ...where, status: 'FAILED' },
    });

    const runningTrials = await prisma.trial.count({
      where: { ...where, status: 'RUNNING' },
    });

    // Get unique users who tried
    const uniqueUsers = await prisma.trial.groupBy({
      by: ['userId'],
      where,
    });

    // Get trials by skill
    const trialsBySkill = await prisma.trial.groupBy({
      by: ['skillId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Get skill details for trials by skill
    const skillsWithStats = await Promise.all(
      trialsBySkill.map(async (item) => {
        const skill = await prisma.skill.findUnique({
          where: { id: item.skillId },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });
        return {
          skillId: item.skillId,
          skillName: skill?.name || 'Unknown',
          skillSlug: skill?.slug || '',
          trialCount: item._count.id,
        };
      })
    );

    // Get recent trials
    const recentTrials = await prisma.trial.findMany({
      where,
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 10,
    });

    res.json({
      summary: {
        totalTrials,
        completedTrials,
        failedTrials,
        runningTrials,
        uniqueUsers: uniqueUsers.length,
        completionRate: totalTrials > 0 ? (completedTrials / totalTrials) * 100 : 0,
      },
      bySkill: skillsWithStats,
      recentTrials,
    });
  } catch (error) {
    console.error('Error fetching trial stats:', error);
    res.status(500).json({ error: 'Failed to fetch trial statistics' });
  }
};
