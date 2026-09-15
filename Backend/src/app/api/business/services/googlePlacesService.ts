import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import env from "../config/env";
import { EnrichedBusiness } from "../types";

export class GooglePlacesService {
  private apiKey = env.GOOGLE_PLACES_API_KEY;

  /**
   * Search for businesses using Google Places or search fallbacks
   */
  async search(niche: string, region: string, limit: number = 10): Promise<EnrichedBusiness[]> {
    console.log(`[PlacesService] Search called: niche="${niche}", region="${region}", limit=${limit}`);
    if (this.apiKey && this.apiKey !== "YOUR_GOOGLE_PLACES_KEY") {
      try {
        console.log(`[PlacesService] Attempting Google Places API...`);
        const results = await this.searchGooglePlaces(niche, region, limit);
        console.log(`[PlacesService] Google Places API found ${results.length} results`);
        if (results.length > 0) return results;
      } catch (err: any) {
        console.error("[PlacesService] Google Places search failed, switching to fallbacks:", err.message || err);
      }
    }

    // Attempt DuckDuckGo scraper first
    try {
      console.log(`[PlacesService] Attempting DuckDuckGo HTML scraper fallback...`);
      const results = await this.searchDuckDuckGo(niche, region, limit);
      console.log(`[PlacesService] DuckDuckGo scraper found ${results.length} results`);
      if (results.length > 0) return results;
    } catch (err: any) {
      console.error("[PlacesService] DuckDuckGo crawler fallback failed, trying OpenStreetMap:", err.message || err);
    }

    // Try OpenStreetMap Nominatim as secondary fallback
    try {
      console.log(`[PlacesService] Attempting OpenStreetMap Nominatim fallback...`);
      const results = await this.searchOpenStreetMap(niche, region, limit);
      console.log(`[PlacesService] OpenStreetMap Nominatim found ${results.length} results`);
      if (results.length > 0) return results;
    } catch (err: any) {
      console.error("[PlacesService] OSM Nominatim search fallback failed, trying Gemini:", err.message || err);
    }

    // Try Gemini AI Model search as final fallback
    try {
      console.log(`[PlacesService] Attempting Gemini AI search fallback...`);
      const results = await this.searchGemini(niche, region, limit);
      console.log(`[PlacesService] Gemini fallback search found ${results.length} results`);
      return results;
    } catch (err: any) {
      console.error("[PlacesService] Gemini fallback search failed:", err.message || err);
      return [];
    }
  }

  /**
   * Real Google Places API search implementation
   */
  private async searchGooglePlaces(niche: string, region: string, limit: number): Promise<EnrichedBusiness[]> {
    const query = `${niche} in ${region}`;
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
    
    const response = await axios.get(textSearchUrl);
    const results = response.data.results || [];
    
    const businesses: EnrichedBusiness[] = [];
    const targetResults = results.slice(0, limit);

    for (const item of targetResults) {
      try {
        // Fetch place details for website and contact info
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&fields=name,formatted_phone_number,website,formatted_address,rating,geometry&key=${this.apiKey}`;
        const detailRes = await axios.get(detailsUrl);
        const details = detailRes.data.result || {};

        businesses.push({
          placeId: item.place_id,
          name: details.name || item.name,
          website: details.website || undefined,
          phone: details.formatted_phone_number || undefined,
          address: details.formatted_address || item.formatted_address,
          rating: details.rating || item.rating || undefined,
          coordinates: details.geometry?.location
            ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng }
            : undefined,
          detectedTechnologies: [],
          socialLinks: {},
          contacts: [],
        });
      } catch (err) {
        console.error(`Failed fetching details for place ID ${item.place_id}:`, err);
        // Add basic place details if detail fetch fails
        businesses.push({
          placeId: item.place_id,
          name: item.name,
          address: item.formatted_address,
          rating: item.rating,
          coordinates: item.geometry?.location
            ? { lat: item.geometry.location.lat, lng: item.geometry.location.lng }
            : undefined,
          detectedTechnologies: [],
          socialLinks: {},
          contacts: [],
        });
      }
    }

    return businesses;
  }

  /**
   * Fallback using DuckDuckGo Scraper
   */
  private async searchDuckDuckGo(niche: string, region: string, limit: number): Promise<EnrichedBusiness[]> {
    const query = `${niche} ${region}`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log(`[PlacesService] Fetching DuckDuckGo URL: ${ddgUrl}`);
    
    let response;
    try {
      response = await axios.get(ddgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      console.log(`[PlacesService] DuckDuckGo response status: ${response.status}`);
    } catch (err: any) {
      console.error(`[PlacesService] DuckDuckGo network request failed:`, err.message || err);
      throw err;
    }

    const $ = cheerio.load(response.data);
    const businesses: EnrichedBusiness[] = [];

    const resultsNode = $(".result__a");
    console.log(`[PlacesService] Cheerio found ${resultsNode.length} nodes matching '.result__a'`);

    resultsNode.each((i, element) => {
      if (businesses.length >= limit) return;

      const titleNode = $(element);
      let title = titleNode.text().trim();
      let url = titleNode.attr("href") || "";

      // Decode DuckDuckGo redirects
      if (url.includes("uddg=")) {
        const rawUrl = url.split("uddg=")[1]?.split("&")[0];
        if (rawUrl) {
          url = decodeURIComponent(rawUrl);
        }
      }

      // Skip invalid URLs or non-business directories
      if (!url.startsWith("http") || url.includes("duckduckgo.com") || url.includes("wikipedia.org") || url.includes("facebook.com") || url.includes("instagram.com")) {
        return;
      }

      // Clean business title
      title = title.replace(/\s*[-|]\s*(Practo|Lybrate|Justdial|LinkedIn|Facebook|Instagram|Mapquest|Yelp|Indiamart|Yellow Pages|Sulekha|B2B)[\s\S]*/i, "").trim();

      businesses.push({
        name: title,
        website: url,
        address: `${region}, India`,
        rating: 4.0, // default placeholder for scraped results
        coordinates: { lat: 20.2961, lng: 85.8245 }, // default coordinates (Bhubaneswar center)
        detectedTechnologies: [],
        socialLinks: {},
        contacts: [],
      });
    });

    return businesses;
  }

  /**
   * Fallback using OpenStreetMap Nominatim API
   */
  private async searchOpenStreetMap(niche: string, region: string, limit: number): Promise<EnrichedBusiness[]> {
    // Search query patterns - clean up region to city name for better OSM Nominatim matches
    const city = region.split(",")[0].trim();
    const query = `${niche} in ${city}`;
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit * 2}&extratags=1&addressdetails=1&accept-language=en`;
    console.log(`[PlacesService] Fetching OSM Nominatim URL: ${osmUrl}`);

    let response;
    try {
      response = await axios.get(osmUrl, {
        headers: {
          "User-Agent": "Enterprise-Lead-Finder-System/1.0 (contact@crmsolution.com)"
        }
      });
      console.log(`[PlacesService] OSM Nominatim response status: ${response.status}`);
    } catch (err: any) {
      console.error(`[PlacesService] OSM Nominatim network request failed:`, err.message || err);
      throw err;
    }

    const data = response.data;
    console.log(`[PlacesService] OSM data type: ${typeof data}, isArray: ${Array.isArray(data)}, length: ${Array.isArray(data) ? data.length : 'N/A'}`);
    if (!Array.isArray(data)) return [];

    const businesses: EnrichedBusiness[] = [];

    for (const item of data) {
      if (businesses.length >= limit) break;

      const name = item.display_name.split(",")[0].trim();
      const addr = item.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || region;
      
      let website = item.extratags?.website || item.extratags?.["contact:website"] || "";
      if (!website || !/^https?:\/\//i.test(website)) {
        // Generate a domain based on the business name to search against later if no site listed
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        website = `https://www.${cleanName}.com`;
      }

      const phone = item.extratags?.phone || item.extratags?.["contact:phone"] || undefined;

      businesses.push({
        name,
        website,
        phone,
        address: item.display_name,
        rating: 4.5,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
        detectedTechnologies: [],
        socialLinks: {},
        contacts: [],
      });
    }

    return businesses;
  }

  /**
   * Fallback using Gemini generative model to search for real businesses
   */
  private async searchGemini(niche: string, region: string, limit: number): Promise<EnrichedBusiness[]> {
    const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      console.log("[PlacesService] Gemini API key is missing or not set. Skipping fallback.");
      return [];
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const baseModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Search and retrieve ${limit} real local businesses in the niche: "${niche}" located in: "${region}".
      Return a JSON response containing an array of objects. Each object must have:
      1. "name": string (business name)
      2. "website": string (website URL starting with http:// or https://)
      3. "phone": string (phone number if available)
      4. "address": string (physical address)
      5. "rating": number (between 3.5 and 5.0)
      6. "latitude": number (coordinates)
      7. "longitude": number (coordinates)
      
      Return ONLY the raw JSON array. Do not wrap in markdown code blocks.`;

      let result;
      try {
        result = await baseModel.generateContent(prompt);
      } catch (err: any) {
        const errMsg = String(err.message || err);
        if (errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("not supported")) {
          console.warn("[PlacesService] gemini-1.5-flash failed, trying gemini-pro fallback...");
          const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
          result = await fallbackModel.generateContent(prompt);
        } else {
          throw err;
        }
      }

      const text = result.response.text().trim();
      
      // Clean markdown braces if returned
      const jsonStr = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: any) => ({
        name: item.name,
        website: item.website || undefined,
        phone: item.phone || undefined,
        address: item.address || `${region}, India`,
        rating: item.rating || 4.2,
        coordinates: item.latitude && item.longitude 
          ? { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) }
          : undefined,
        detectedTechnologies: [],
        socialLinks: {},
        contacts: [],
      }));
    } catch (err: any) {
      console.error("[PlacesService] Gemini business search fallback failed:", err.message || err);
      return [];
    }
  }
}
