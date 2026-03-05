// API: Get User Profile
// Method: GET
// Path: /api/user/profile

import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../utils/auth.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Handle GET and PATCH
  if (req.method !== 'GET' && req.method !== 'PATCH') {
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

    if (req.method === 'GET') {
      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user });

    } else if (req.method === 'PATCH') {
      // Update user profile
      const { name, avatar } = req.body;

      // Validate input
      if (name && typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid name' });
      }

      if (avatar && typeof avatar !== 'string') {
        return res.status(400).json({ error: 'Invalid avatar URL' });
      }

      // Build update data
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (avatar !== undefined) updateData.avatar = avatar;

      // Update user
      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          updatedAt: true
        }
      });

      return res.status(200).json({
        message: 'Profile updated successfully',
        user
      });
    }

  } catch (error) {
    console.error('Error handling user profile:', error);
    return res.status(500).json({
      error: 'Failed to handle profile request',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
