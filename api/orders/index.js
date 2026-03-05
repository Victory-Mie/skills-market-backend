// API: Get User Orders
// Method: GET
// Path: /api/orders

import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../utils/auth.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Parse query parameters
    const {
      page = '1',
      limit = '20',
      status
    } = req.query;

    // Build where clause
    const where = { buyerId: decoded.userId };

    // Filter by payment status
    if (status) {
      where.paymentStatus = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          skill: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.order.count({ where })
    ]);

    // Return paginated response
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
