import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Service for player-related operations
 */
export class PlayerService {
  /**
   * Get all players with optional filtering
   */
  async getAllPlayers(includeTeam: boolean = true, includeAccommodation: boolean = true) {
    console.log("PlayerService: Getting all players with enhanced query");
    
    // First try to get players with rich team context
    const players = await prisma.player.findMany({
      include: {
        team: includeTeam ? {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                year: true,
              }
            }
          }
        } : false,
        accommodation: includeAccommodation,
        // Include relevant payment data
        payments: {
          orderBy: {
            updatedAt: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`PlayerService: Found ${players.length} players with enhanced query`);
    
    // If we somehow don't have players with team data, try a different approach
    if (players.length === 0 || (includeTeam && players.some(p => !p.team))) {
      console.log("PlayerService: Using fallback query to get players via teams");
      
      // Get all teams with their players
      const teams = await prisma.team.findMany({
        include: {
          players: true,
          tournament: {
            select: {
              id: true,
              name: true,
              year: true
            }
          }
        }
      });
      
      // Map players from teams, ensuring team context is preserved
      const playersFromTeams = teams.flatMap(team => 
        team.players.map(player => ({
          ...player,
          team: {
            id: team.id,
            name: team.name,
            tournamentId: team.tournamentId,
            tournament: team.tournament
          }
        }))
      );
      
      console.log(`PlayerService: Found ${playersFromTeams.length} players via teams fallback`);
      
      if (playersFromTeams.length > 0) {
        return playersFromTeams;
      }
    }
    
    return players;
  }
  
  /**
   * Get player by ID
   */
  async getPlayerById(id: string, includeTeam: boolean = true, includeAccommodation: boolean = true) {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: includeTeam,
        accommodation: includeAccommodation
      }
    });
    
    if (!player) {
      return null;
    }
    
    return player;
  }
  
  /**
   * Create a new player
   */
  async createPlayer(data: {
    name: string;
    handicapIndex: number;
    teamId?: string;
    accommodationId?: string;
  }) {
    const { handicapIndex, ...otherData } = data;
    
    return await prisma.player.create({
      data: {
        ...otherData,
        handicapIndex: parseFloat(handicapIndex.toString())
      }
    });
  }
  
  /**
   * Update an existing player
   */
  async updatePlayer(id: string, data: {
    name?: string;
    handicapIndex?: number;
    teamId?: string | null;
    accommodationId?: string | null;
  }) {
    const updateData: Prisma.PlayerUpdateInput = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    
    if (data.handicapIndex !== undefined) {
      updateData.handicapIndex = parseFloat(data.handicapIndex.toString());
    }
    
    if (data.teamId !== undefined) {
      if (data.teamId === null) {
        updateData.team = { disconnect: true };
      } else {
        updateData.team = { connect: { id: data.teamId } };
      }
    }
    
    if (data.accommodationId !== undefined) {
      if (data.accommodationId === null) {
        updateData.accommodation = { disconnect: true };
      } else {
        updateData.accommodation = { connect: { id: data.accommodationId } };
      }
    }
    
    return await prisma.player.update({
      where: { id },
      data: updateData
    });
  }
  
  /**
   * Delete a player
   */
  async deletePlayer(id: string) {
    // First check if player has any associations that need to be handled
    const playerPairings = await prisma.playerPairing.findMany({
      where: { playerId: id }
    });
    
    // Delete player pairings if they exist
    if (playerPairings.length > 0) {
      await prisma.playerPairing.deleteMany({
        where: { playerId: id }
      });
    }
    
    // Delete player payments
    await prisma.playerPayment.deleteMany({
      where: { playerId: id }
    });
    
    // Finally delete the player
    return await prisma.player.delete({
      where: { id }
    });
  }
  
  /**
   * Update player payment status
   */
  async updatePaymentStatus(
    playerId: string,
    tournamentId: string,
    paymentData: {
      buyIn?: boolean;
      ctp?: boolean;
      skins?: boolean;
      notes?: string;
    }
  ) {
    const { buyIn, ctp, skins, notes } = paymentData;
    
    // Get player to access their info
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: true
      }
    });
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Process payment types
    const paymentPromises = [];
    
    if (buyIn !== undefined) {
      paymentPromises.push(this.handlePaymentType(playerId, tournamentId, 'BUY_IN', buyIn, notes));
    }
    
    if (ctp !== undefined) {
      paymentPromises.push(this.handlePaymentType(playerId, tournamentId, 'CTP_ENTRY', ctp, notes));
    }
    
    if (skins !== undefined) {
      paymentPromises.push(this.handlePaymentType(playerId, tournamentId, 'SKINS_ENTRY', skins, notes));
    }
    
    // Wait for all payment updates to complete
    await Promise.all(paymentPromises);
    
    // Update team metadata
    if (player.team && player.teamId) {
      try {
        // Get existing metadata or initialize empty object
        const existingMetadata = player.team.metadata ? player.team.metadata : {};
        
        // Update payment data in metadata
        const paymentData = {
          ...(existingMetadata as any).payments || {},
          [playerId]: {
            buyIn: buyIn ?? ((existingMetadata as any).payments?.[playerId]?.buyIn ?? false),
            ctp: ctp ?? ((existingMetadata as any).payments?.[playerId]?.ctp ?? false),
            skins: skins ?? ((existingMetadata as any).payments?.[playerId]?.skins ?? false),
            lastUpdated: new Date().toISOString(),
          }
        };
        
        // Update team with new metadata
        await prisma.team.update({
          where: { id: player.teamId },
          data: {
            metadata: {
              ...(existingMetadata as any),
              payments: paymentData
            }
          }
        });
      } catch (error) {
        console.error('Error updating team metadata:', error);
        // Continue even if metadata update fails
      }
    }
    
    // Get and return updated payment statuses
    const updatedPayments = await prisma.playerPayment.findMany({
      where: {
        playerId,
        tournamentId
      }
    });
    
    return updatedPayments.reduce((acc, payment) => {
      acc[payment.type] = payment.status === 'PAID';
      return acc;
    }, {} as Record<string, boolean>);
  }
  
  /**
   * Get payment status for a player in a tournament
   */
  async getPaymentStatus(playerId: string, tournamentId: string) {
    const payments = await prisma.playerPayment.findMany({
      where: {
        playerId,
        tournamentId
      }
    });
    
    return payments.reduce((acc, payment) => {
      acc[payment.type] = payment.status === 'PAID';
      return acc;
    }, {} as Record<string, boolean>);
  }
  
  /**
   * Helper method to handle a specific payment type
   */
  private async handlePaymentType(
    playerId: string,
    tournamentId: string,
    type: 'BUY_IN' | 'CTP_ENTRY' | 'SKINS_ENTRY',
    isPaid: boolean,
    notes?: string
  ) {
    // Convert null to undefined for Prisma
    const sanitizedNotes = notes === null ? undefined : notes;
    
    // Check if a payment record exists
    const existingPayment = await prisma.playerPayment.findFirst({
      where: {
        playerId,
        tournamentId,
        type,
      },
    });

    if (isPaid) {
      // If paid and record exists, update it
      if (existingPayment) {
        await prisma.playerPayment.update({
          where: { id: existingPayment.id },
          data: { 
            status: 'PAID',
            notes: sanitizedNotes || existingPayment.notes
          },
        });
      } 
      // If paid and no record exists, create it
      else {
        // Get tournament details to know the amount
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
        });

        let amount = 0;
        if (type === 'BUY_IN' && tournament?.buyIn) {
          amount = tournament.buyIn;
        } else if (type === 'CTP_ENTRY' && tournament?.ctpPrizeAmount) {
          amount = tournament.ctpPrizeAmount;
        } else if (type === 'SKINS_ENTRY' && tournament?.skinsPrizeAmount) {
          amount = tournament.skinsPrizeAmount;
        }

        await prisma.playerPayment.create({
          data: {
            playerId,
            tournamentId,
            type,
            amount,
            status: 'PAID',
            notes: sanitizedNotes
          },
        });
      }
    } else {
      // If not paid and record exists, update to pending
      if (existingPayment) {
        await prisma.playerPayment.update({
          where: { id: existingPayment.id },
          data: { 
            status: 'PENDING',
            notes: sanitizedNotes || existingPayment.notes
          },
        });
      } else {
        // If the user wants to explicitly set as unpaid, create a PENDING record
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
        });

        let amount = 0;
        if (type === 'BUY_IN' && tournament?.buyIn) {
          amount = tournament.buyIn;
        } else if (type === 'CTP_ENTRY' && tournament?.ctpPrizeAmount) {
          amount = tournament.ctpPrizeAmount;
        } else if (type === 'SKINS_ENTRY' && tournament?.skinsPrizeAmount) {
          amount = tournament.skinsPrizeAmount;
        }

        await prisma.playerPayment.create({
          data: {
            playerId,
            tournamentId,
            type,
            amount,
            status: 'PENDING',
            notes: sanitizedNotes
          },
        });
      }
    }
  }
}