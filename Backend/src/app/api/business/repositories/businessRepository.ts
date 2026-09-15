import prisma from "../../../../config/db";
import { EnrichedBusiness } from "../types";

export class BusinessRepository {
  /**
   * Find a cached search query by its key
   */
  async findCachedSearch(queryKey: string) {
    const cache = await prisma.searchCache.findUnique({
      where: { queryKey },
    });

    if (!cache) return null;

    // Check if cache has expired
    if (new Date() > new Date(cache.expiresAt)) {
      await prisma.searchCache.delete({
        where: { queryKey },
      });
      return null;
    }

    return cache.results as any[];
  }

  /**
   * Write search results to the query cache
   */
  async saveSearchCache(queryKey: string, results: any[], ttlHours: number = 24) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    return prisma.searchCache.upsert({
      where: { queryKey },
      create: {
        queryKey,
        results,
        expiresAt,
      },
      update: {
        results,
        expiresAt,
        createdAt: new Date(),
      },
    });
  }

  /**
   * Clear all cache entries
   */
  async clearAllCache() {
    return prisma.searchCache.deleteMany();
  }

  /**
   * Log a search query to the search history
   */
  async logSearchHistory(
    userId: string | null,
    niche: string,
    region: string,
    platform: string | null,
    limit: number,
    resultsCount: number
  ) {
    return prisma.searchHistory.create({
      data: {
        niche,
        region,
        platform,
        limit,
        userId,
        resultsCount,
      },
    });
  }

  /**
   * Get search history logs
   */
  async getSearchHistory(userId: string) {
    return prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Save or upsert an enriched business lead with its parsed contacts, social handles, and technologies
   */
  async saveEnrichedBusiness(data: EnrichedBusiness) {
    return prisma.$transaction(async (tx) => {
      // 1. Upsert base business record
      let business;
      if (data.placeId) {
        business = await tx.business.upsert({
          where: { placeId: data.placeId },
          create: {
            placeId: data.placeId,
            name: data.name,
            website: data.website,
            phone: data.phone,
            address: data.address,
            rating: data.rating,
            latitude: data.coordinates?.lat,
            longitude: data.coordinates?.lng,
            cms: data.cms,
          },
          update: {
            name: data.name,
            website: data.website,
            phone: data.phone,
            address: data.address,
            rating: data.rating,
            latitude: data.coordinates?.lat,
            longitude: data.coordinates?.lng,
            cms: data.cms,
            updatedAt: new Date(),
          },
        });
      } else {
        // Fallback search by website + name to avoid duplicates if no placeId
        const existing = await tx.business.findFirst({
          where: {
            OR: [
              { website: data.website && data.website.length > 0 ? data.website : undefined },
              { name: data.name },
            ].filter(Boolean) as any,
          },
        });

        if (existing) {
          business = await tx.business.update({
            where: { id: existing.id },
            data: {
              phone: data.phone || existing.phone,
              address: data.address || existing.address,
              rating: data.rating || existing.rating,
              latitude: data.coordinates?.lat || existing.latitude,
              longitude: data.coordinates?.lng || existing.longitude,
              cms: data.cms || existing.cms,
              updatedAt: new Date(),
            },
          });
        } else {
          business = await tx.business.create({
            data: {
              name: data.name,
              website: data.website,
              phone: data.phone,
              address: data.address,
              rating: data.rating,
              latitude: data.coordinates?.lat,
              longitude: data.coordinates?.lng,
              cms: data.cms,
            },
          });
        }
      }

      // 2. Refresh Contacts
      if (data.contacts && data.contacts.length > 0) {
        await tx.businessContact.deleteMany({
          where: { businessId: business.id },
        });

        const uniqueContacts = Array.from(
          new Map(data.contacts.map((c) => [c.value.toLowerCase(), c])).values()
        );

        await tx.businessContact.createMany({
          data: uniqueContacts.map((c) => ({
            businessId: business.id,
            type: c.type,
            value: c.value,
            name: c.name || null,
            role: c.role || null,
            source: c.source || null,
          })),
        });
      }

      // 3. Refresh Social Links
      await tx.businessSocialLink.deleteMany({
        where: { businessId: business.id },
      });

      const socialData = [];
      if (data.socialLinks.facebook) socialData.push({ platform: "facebook", url: data.socialLinks.facebook });
      if (data.socialLinks.instagram) socialData.push({ platform: "instagram", url: data.socialLinks.instagram });
      if (data.socialLinks.linkedin) socialData.push({ platform: "linkedin", url: data.socialLinks.linkedin });
      if (data.socialLinks.twitter) socialData.push({ platform: "twitter", url: data.socialLinks.twitter });
      if (data.socialLinks.youtube) socialData.push({ platform: "youtube", url: data.socialLinks.youtube });

      if (socialData.length > 0) {
        await tx.businessSocialLink.createMany({
          data: socialData.map((s) => ({
            businessId: business.id,
            platform: s.platform,
            url: s.url,
          })),
        });
      }

      // 4. Handle Technologies
      if (data.detectedTechnologies && data.detectedTechnologies.length > 0) {
        // Upsert technologies master list
        for (const techName of data.detectedTechnologies) {
          const tech = await tx.technology.upsert({
            where: { name: techName },
            create: { name: techName },
            update: {},
          });

          await tx.businessTechnology.upsert({
            where: {
              businessId_technologyId: {
                businessId: business.id,
                technologyId: tech.id,
              },
            },
            create: {
              businessId: business.id,
              technologyId: tech.id,
              confidence: 100,
            },
            update: {},
          });
        }
      }

      // Return fully loaded business details
      return tx.business.findUnique({
        where: { id: business.id },
        include: {
          contacts: true,
          socialLinks: true,
          technologies: {
            include: {
              technology: true,
            },
          },
        },
      });
    });
  }

  /**
   * Get a fully enriched business details by ID
   */
  async getBusinessById(id: string) {
    return prisma.business.findUnique({
      where: { id },
      include: {
        contacts: true,
        socialLinks: true,
        technologies: {
          include: {
            technology: true,
          },
        },
      },
    });
  }

  /**
   * Save a business lead for a specific user
   */
  async saveLead(userId: string, businessId: string, notes?: string, leadListId?: string) {
    return prisma.savedLead.upsert({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      create: {
        userId,
        businessId,
        notes,
        leadListId,
      },
      update: {
        notes,
        leadListId,
      },
    });
  }

  /**
   * Remove a saved lead
   */
  async unsaveLead(userId: string, businessId: string) {
    return prisma.savedLead.delete({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
    });
  }

  /**
   * Get list of user saved leads
   */
  async getSavedLeads(userId: string) {
    return prisma.savedLead.findMany({
      where: { userId },
      include: {
        business: {
          include: {
            contacts: true,
            socialLinks: true,
            technologies: {
              include: {
                technology: true,
              },
            },
          },
        },
        leadList: true,
      },
    });
  }

  /**
   * Create an API log record
   */
  async logApi(log: {
    endpoint: string;
    method: string;
    requestBody?: string;
    responseBody?: string;
    statusCode: number;
    duration: number;
    ip?: string;
    userId?: string;
  }) {
    return prisma.apiLog.create({
      data: log,
    });
  }
}
