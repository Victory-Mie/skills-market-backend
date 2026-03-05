// API: Get User's Purchased Skills
// Method: GET
// Path: /api/my-skills

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
      type = 'all' // all, purchased, rented
    } = req.query;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let skills = [];
    let total = 0;

    if (type === 'all' || type === 'purchased') {
      // Get purchased skills from orders
      const [orders, orderCount] = await Promise.all([
        prisma.order.findMany({
          where: {
            buyerId: decoded.userId,
            paymentStatus: 'COMPLETED'
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
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.order.count({
          where: {
            buyerId: decoded.userId,
            paymentStatus: 'COMPLETED'
          }
        })
      ]);

      // Map orders to skills with purchase info
      skills = orders.map(order => ({
        ...order.skill,
        purchaseType: 'PURCHASE',
        purchaseDate: order.createdAt,
        amount: order.amount,
        orderId: order.id,
        orderNumber: order.orderNumber
      }));

      total = orderCount;
    }

    if (type === 'all' || type === 'rented') {
      // Get rented skills
      const rentals = await prisma.rental.findMany({
        where: {
          userId: decoded.userId,
          OR: [
            { endDate: null }, // Single-use rentals
            { endDate: { gte: new Date() } } // Active weekly rentals
          ]
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
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Add rented skills to the list
      const rentedSkills = rentals.map(rental => ({
        ...rental.skill,
        purchaseType: 'RENTAL',
        purchaseDate: rental.startDate,
        endDate: rental.endDate,
        amount: rental.amount,
        rentalId: rental.id,
        usageCount: rental.usageCount
      }));

      skills = [...skills, ...rentedSkills];
      total += rentals.length;
    }

    // Remove duplicates (if a skill is both purchased and rented)
    const uniqueSkills = skills.filter((skill, index, self) =>
      index === self.findIndex((s) => s.id === skill.id)
    );

    // Apply pagination
    const paginatedSkills = uniqueSkills.slice(skip, skip + limitNum);

    return res.status(200).json({
      skills: paginatedSkills,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: uniqueSkills.length,
        pages: Math.ceil(uniqueSkills.length / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching user skills:', error);
    return res.status(500).json({
      error: 'Failed to fetch user skills',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
