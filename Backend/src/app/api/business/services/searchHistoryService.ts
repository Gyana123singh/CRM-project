import { BusinessRepository } from "../repositories/businessRepository";

export class SearchHistoryService {
  constructor(private businessRepo: BusinessRepository) {}

  /**
   * Log a business search event
   */
  async log(
    userId: string | null,
    niche: string,
    region: string,
    platform: string | null,
    limit: number,
    resultsCount: number
  ): Promise<void> {
    try {
      await this.businessRepo.logSearchHistory(
        userId,
        niche,
        region,
        platform || "Any Platform",
        limit,
        resultsCount
      );
    } catch (err) {
      console.error("Failed to log search history:", err);
    }
  }

  /**
   * Fetch search history logs for a user
   */
  async getHistory(userId: string) {
    try {
      return await this.businessRepo.getSearchHistory(userId);
    } catch (err) {
      console.error(`Failed to fetch history for user ${userId}:`, err);
      return [];
    }
  }
}
