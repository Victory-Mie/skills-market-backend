// Get trial configuration for a skill
const { prisma } = require('../../../../utils/db');
const { verifyToken } = require('../../../../utils/auth');

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
    const { skillId } = req.query;

    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    // Get trial configuration
    const trialConfig = await prisma.trialConfig.findUnique({
      where: { skillId },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            icon: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // If no trial config exists, return default settings
    if (!trialConfig) {
      const skill = await prisma.skill.findUnique({
        where: { id: skillId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          icon: true,
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }

      return res.json({
        enabled: false,
        skill,
        message: 'Trial is not available for this skill',
      });
    }

    res.json({
      ...trialConfig,
      message: trialConfig.enabled ? 'Trial available' : 'Trial is disabled by developer',
    });
  } catch (error) {
    console.error('Error fetching trial config:', error);
    res.status(500).json({ error: 'Failed to fetch trial configuration' });
  }
};
