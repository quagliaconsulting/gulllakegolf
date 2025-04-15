import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/utils/auth';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface FormidableFile extends File {
  filepath: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    if (req.method === 'POST') {
      // Parse form data
      const form = formidable({
        multiples: true,
        uploadDir: path.join(process.cwd(), 'public/uploads/gallery'),
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });
      
      return new Promise((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error('Form parsing error:', err);
            res.status(500).json({ error: 'Error processing uploaded files' });
            return resolve(null);
          }
          
          try {
            // Extract fields
            const tournamentId = Array.isArray(fields.tournamentId) 
              ? fields.tournamentId[0] 
              : fields.tournamentId || '';
            
            const description = Array.isArray(fields.description) 
              ? fields.description[0] 
              : fields.description || '';
            
            const tags = Array.isArray(fields.tags) 
              ? fields.tags[0] 
              : fields.tags || '';
            
            const yearValue = Array.isArray(fields.year) 
              ? fields.year[0] 
              : fields.year || '';
            
            const year = yearValue ? parseInt(yearValue.toString()) : new Date().getFullYear();
            
            // Validate required fields
            if (!tournamentId) {
              res.status(400).json({ error: 'Tournament ID is required' });
              return resolve(null);
            }
            
            // Check if tournament exists
            const tournament = await prisma.tournament.findUnique({
              where: { id: tournamentId },
            });
            
            if (!tournament) {
              res.status(404).json({ error: 'Tournament not found' });
              return resolve(null);
            }
            
            // Process uploaded files
            const uploadedPhotos = [];
            
            // Handle single file
            if (files.photos && !Array.isArray(files.photos)) {
              const file = files.photos as FormidableFile;
              const fileName = path.basename(file.filepath);
              const filePath = `/uploads/gallery/${fileName}`;
              // Use relative URLs that work with both localhost and Tailscale
              const fileUrl = filePath;
              
              // Save to database
              const photo = await prisma.galleryPhoto.create({
                data: {
                  tournamentId,
                  fileName,
                  filePath,
                  fileUrl,
                  description: description || null,
                  tags: tags || null,
                  year: year || new Date().getFullYear(),
                },
              });
              
              uploadedPhotos.push(photo);
            }
            
            // Handle multiple files
            if (files.photos && Array.isArray(files.photos)) {
              for (const file of files.photos as FormidableFile[]) {
                const fileName = path.basename(file.filepath);
                const filePath = `/uploads/gallery/${fileName}`;
                // Use relative URLs that work with both localhost and Tailscale
                const fileUrl = filePath;
                
                // Save to database
                const photo = await prisma.galleryPhoto.create({
                  data: {
                    tournamentId,
                    fileName,
                    filePath,
                    fileUrl,
                    description: description || null,
                    tags: tags || null,
                    year: year || new Date().getFullYear(),
                  },
                });
                
                uploadedPhotos.push(photo);
              }
            }
            
            res.status(201).json({
              message: 'Photos uploaded successfully',
              photos: uploadedPhotos,
            });
            return resolve(null);
          } catch (error) {
            console.error('Error processing uploads:', error);
            res.status(500).json({ error: 'Failed to process uploads' });
            return resolve(null);
          }
        });
      });
    }
    
    // Method not allowed
    res.status(405).json({ error: 'Method not allowed' });
    return;
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
}