// API: Get Order Details
// Method: GET
// Path: /api/orders/[id]

import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../utils/auth.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Query order with verification that it belongs to the user
    const order = await prisma.order.findFirst({
      where: {
        id,
        buyerId: decoded.userId
      },
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
            },
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json({ order });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      error: 'Failed to fetch order details',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
