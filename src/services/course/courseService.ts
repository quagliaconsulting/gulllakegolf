import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Service for course-related operations
 */
export class CourseService {
  /**
   * Get all courses, with optional filter by tournament ID
   */
  async getAllCourses(tournamentId?: string) {
    console.log("CourseService.getAllCourses called", tournamentId ? `for tournament: ${tournamentId}` : "for all tournaments");
    
    // Build where clause conditionally
    const where: Prisma.CourseWhereInput = {};
    if (tournamentId) {
      where.tournamentId = tournamentId;
    }
    
    return await prisma.course.findMany({
      where,
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        holes: {
          orderBy: {
            number: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get course by ID
   */
  async getCourseById(id: string) {
    console.log('CourseService.getCourseById called with id:', id);
    
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        holes: {
          orderBy: {
            number: 'asc',
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
      },
    });
    
    if (!course) {
      console.log('Course not found');
      return null;
    }
    
    console.log(`Found course: ${course.name} with ${course.holes?.length || 0} holes`);
    return course;
  }

  /**
   * Create a new course
   */
  async createCourse(
    data: {
      name: string;
      tournamentId?: string;
      tournament?: Prisma.TournamentCreateNestedOneWithoutCoursesInput;
      holes?: { 
        number: number;
        par: number;
        handicap: number;
        distance: number;
        isPar3?: boolean;
      }[] 
    }
  ) {
    try {
      console.log('CourseService.createCourse called with data:', JSON.stringify(data, null, 2));
      
      const { holes, tournamentId, ...otherData } = data;
      
      // Prepare create data in Prisma format
      const courseData = {
        ...otherData,
        // Connect to tournament if ID is provided
        ...(tournamentId ? {
          tournament: {
            connect: { id: tournamentId }
          }
        } : {})
      } as Prisma.CourseCreateInput;
      
      console.log('Final Prisma create data:', JSON.stringify(courseData, null, 2));
      
      // Create course
      const course = await prisma.course.create({
        data: courseData,
      });
      console.log('Course created:', course.id);
      
      // Add holes if provided
      if (holes && holes.length > 0) {
        console.log(`Adding ${holes.length} holes to course...`);
        
        const holeCreateData = holes.map(hole => ({
          courseId: course.id,
          number: Number(hole.number) || 0,
          par: Number(hole.par) || 4,
          handicap: Number(hole.handicap) || 0,
          distance: Number(hole.distance) || 0,
          isPar3: hole.par === 3 || Boolean(hole.isPar3)
        }));
        
        await prisma.hole.createMany({
          data: holeCreateData
        });
        console.log('Holes created successfully');
      }
      
      // Return course with holes
      console.log('Fetching created course with holes...');
      return await this.getCourseById(course.id);
    } catch (error) {
      console.error('Error in CourseService.createCourse:', error);
      throw error;
    }
  }

  /**
   * Update an existing course
   */
  async updateCourse(
    id: string, 
    data: {
      name?: string;
      tournamentId?: string;
      holes?: { 
        number: number;
        par: number;
        handicap: number;
        distance: number;
        isPar3?: boolean;
      }[]
    }
  ) {
    try {
      console.log('CourseService.updateCourse called with id:', id);
      console.log('Update data:', JSON.stringify(data, null, 2));
      
      const { holes, tournamentId, ...otherData } = data;
      
      // Prepare course update data in Prisma format
      const courseData: Prisma.CourseUpdateInput = {
        ...otherData
      };
      
      // Add tournament connection if tournamentId is provided
      if (tournamentId) {
        console.log('Adding tournament connection with ID:', tournamentId);
        courseData.tournament = {
          connect: { id: tournamentId }
        };
      }
      
      console.log('Final Prisma update data:', JSON.stringify(courseData, null, 2));
      
      // Update course
      console.log('Updating course in database...');
      const course = await prisma.course.update({
        where: { id },
        data: courseData,
      });
      console.log('Course updated:', course.id);
      
      // Update holes if provided
      if (holes && holes.length > 0) {
        console.log(`Updating ${holes.length} holes for course...`);
        
        try {
          // First, get existing hole IDs to handle dependencies
          const existingHoles = await prisma.hole.findMany({
            where: { courseId: id },
            select: { id: true }
          });
          
          const existingHoleIds = existingHoles.map(h => h.id);
          console.log(`Found ${existingHoleIds.length} existing holes to update`);
          
          // First delete any hole results that reference these holes
          if (existingHoleIds.length > 0) {
            console.log('Deleting hole results for existing holes...');
            await prisma.holeResult.deleteMany({
              where: {
                holeId: { in: existingHoleIds }
              }
            });
            
            // Also check for and delete any CTP results
            console.log('Deleting CTP results for existing holes...');
            await prisma.cTPResult.deleteMany({
              where: {
                holeId: { in: existingHoleIds }
              }
            });
          }
          
          // Now it's safe to delete the holes
          console.log('Deleting existing holes...');
          await prisma.hole.deleteMany({
            where: { courseId: id }
          });
          
          // Create new holes with number parsing
          console.log('Creating new holes...');
          const holeCreateData = holes.map(hole => ({
            courseId: id,
            number: Number(hole.number) || 0,
            par: Number(hole.par) || 4,
            handicap: Number(hole.handicap) || 0,
            distance: Number(hole.distance) || 0,
            isPar3: hole.par === 3 || Boolean(hole.isPar3)
          }));
          
          console.log('Hole data:', JSON.stringify(holeCreateData, null, 2));
          
          await prisma.hole.createMany({
            data: holeCreateData
          });
          console.log('Holes created successfully');
        } catch (holeError) {
          console.error('Error updating holes:', holeError);
          // If we can't update holes, just update the course info without changing holes
          console.log('Skipping hole updates due to error');
        }
      }
      
      // Return updated course with holes
      console.log('Fetching updated course with holes...');
      return await this.getCourseById(id);
    } catch (error) {
      console.error('Error in CourseService.updateCourse:', error);
      throw error;
    }
  }

  /**
   * Delete a course
   */
  async deleteCourse(id: string) {
    // Delete all holes first
    await prisma.hole.deleteMany({
      where: { courseId: id }
    });
    
    // Delete the course
    return await prisma.course.delete({
      where: { id }
    });
  }
}