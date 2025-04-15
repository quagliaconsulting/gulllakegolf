import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/utils/auth';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    if (req.method === 'POST') {
      const { tournamentId, reportType, exportFormat, includeCharts, includeScorecards } = req.body;
      
      // Validate required fields
      if (!tournamentId || !reportType || !exportFormat) {
        return res.status(400).json({ error: 'Tournament ID, report type, and export format are required' });
      }
      
      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          teams: {
            include: {
              players: true,
            },
          },
          matches: {
            include: {
              homeTeam: true,
              awayTeam: true,
              points: true,
              holeResults: true,
            },
          },
        },
      });
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const fileName = `${reportType}_${tournament.name.replace(/\s+/g, '_')}_${timestamp}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      const filePath = path.join(process.cwd(), 'public/uploads/reports', fileName);
      
      // In a real implementation, you would generate the actual report file here
      // For now, we'll create a simple placeholder file
      let fileContent = '';
      
      if (exportFormat === 'csv') {
        // Generate CSV content
        fileContent = 'Tournament,Year,Location\n';
        fileContent += `${tournament.name},${tournament.year},${tournament.location}\n`;
        
        if (reportType === 'team-standings') {
          fileContent += '\nTeam,Players,Points\n';
          tournament.teams.forEach(team => {
            const teamPoints = tournament.matches.reduce((total, match) => {
              if (match.points) {
                if (match.homeTeamId === team.id) {
                  return total + match.points.homeTeamPoints;
                } else if (match.awayTeamId === team.id) {
                  return total + match.points.awayTeamPoints;
                }
              }
              return total;
            }, 0);
            
            fileContent += `${team.name},${team.players.length},${teamPoints}\n`;
          });
        }
      } else {
        // For PDF or Excel, we'd generate appropriate files in a real implementation
        // For this demo, we'll just create a text file
        fileContent = `Report Type: ${reportType}\n`;
        fileContent += `Tournament: ${tournament.name} (${tournament.year})\n`;
        fileContent += `Location: ${tournament.location}\n`;
        fileContent += `Date: ${tournament.startDate.toLocaleDateString()} to ${tournament.endDate.toLocaleDateString()}\n\n`;
        
        fileContent += 'This is a placeholder report file. In a real implementation, a proper ';
        fileContent += exportFormat === 'pdf' ? 'PDF document' : 'Excel spreadsheet';
        fileContent += ' would be generated here with actual tournament data.';
      }
      
      // Write placeholder file
      fs.writeFileSync(filePath, fileContent);
      
      // Save report to database
      const relativePath = `/uploads/reports/${fileName}`;
      // Use relative path for fileUrl to work across different hosts
      const fileUrl = relativePath;
      
      const report = await prisma.report.create({
        data: {
          name: `${tournament.name} - ${reportType}`,
          type: reportType,
          format: exportFormat,
          filePath: relativePath,
          fileUrl,
          tournamentId,
        },
      });
      
      // In a real implementation, you might want to send the file directly
      // For this demo, we'll just return the URL
      return res.status(201).json({
        message: 'Report generated successfully',
        report,
        fileUrl,
      });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}