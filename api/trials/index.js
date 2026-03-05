// Get user's trial records
const { prisma } = require('../../utils/db');
const { verifyToken } = require('../../utils/auth');

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
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = verifyToken(token);
    if (!user || !user.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get query parameters
    const { status, page = 1, limit = 10 } = req.query;

    // Build where clause
    const where = {
      userId: user.userId,
    };

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.trial.count({ where });

    // Get trials
    const trials = await prisma.trial.findMany({
      where,
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            price: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    res.json({
      trials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching trials:', error);
    res.status(500).json({ error: 'Failed to fetch trial records' });
  }
};
