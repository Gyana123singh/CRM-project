import axios from "axios";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import * as https from "https";
import { BusinessContactDTO, SocialLinks } from "../types";

export interface ScrapedData {
  contacts: BusinessContactDTO[];
  socialLinks: SocialLinks;
  html: string;
  headers: Record<string, string>;
}

export class WebsiteScraperService {
  private axiosInstance = axios.create({
    timeout: 8000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    // Bypass self-signed SSL errors in production scanning
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    maxRedirects: 5,
  });

  /**
   * Scrape business homepage and potential contact pages
   */
  async scrape(url: string): Promise<ScrapedData> {
    if (!url || !url.startsWith("http")) {
      return { contacts: [], socialLinks: {}, html: "", headers: {} };
    }

    const contacts: BusinessContactDTO[] = [];
    const socialLinks: SocialLinks = {};
    let homepageHtml = "";
    let responseHeaders: Record<string, string> = {};

    try {
      // 1. Fetch homepage
      const response = await this.axiosInstance.get(url);
      homepageHtml = response.data;
      responseHeaders = response.headers as Record<string, string>;

      const $ = cheerio.load(homepageHtml);

      // Extract from homepage
      this.extractContactsFromHtml($, url, "homepage", contacts, socialLinks);

      // 2. Discover and scrape /about and /contact pages
      const linksToFollow: string[] = [];
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const resolved = this.resolveUrl(url, href);
        if (!resolved) return;

        const lowerHref = href.toLowerCase();
        if (
          (lowerHref.includes("contact") || lowerHref.includes("about") || lowerHref.includes("reach")) &&
          !linksToFollow.includes(resolved) &&
          resolved !== url
        ) {
          linksToFollow.push(resolved);
        }
      });

      // Scan up to 2 subpages to prevent infinite loop crawling
      const subpagesToScan = linksToFollow.slice(0, 2);
      for (const pageUrl of subpagesToScan) {
        try {
          const subRes = await this.axiosInstance.get(pageUrl);
          const sub$ = cheerio.load(subRes.data);
          const sourceName = pageUrl.replace(url, "");
          this.extractContactsFromHtml(sub$, pageUrl, sourceName, contacts, socialLinks);
        } catch (subErr) {
          // Silent warning, subpages might fail
          console.debug(`Failed to scan subpage ${pageUrl}:`, subErr);
        }
      }
    } catch (err: any) {
      console.error(`Failed to scrape website ${url}:`, err.message || err);
    }

    return {
      contacts,
      socialLinks,
      html: homepageHtml,
      headers: responseHeaders,
    };
  }

  /**
   * Extract social profiles, emails, and phone numbers from cheerio context
   */
  private extractContactsFromHtml(
    $: CheerioAPI,
    pageUrl: string,
    source: string,
    contacts: BusinessContactDTO[],
    socialLinks: SocialLinks
  ) {
    // 1. Parse JSON-LD metadata
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "");
        this.extractFromJsonLd(json, source, contacts, socialLinks);
      } catch {
        // Skip malformed JSON-LD
      }
    });

    // 2. Parse Meta Tags
    const ogEmail = $('meta[property="og:email"]').attr("content");
    if (ogEmail && this.isValidEmail(ogEmail)) {
      contacts.push({ type: "email", value: ogEmail.toLowerCase().trim(), source });
    }

    const ogPhone = $('meta[property="og:phone_number"]').attr("content") || $('meta[name="phone"]').attr("content");
    if (ogPhone) {
      contacts.push({ type: "phone", value: ogPhone.trim(), source });
    }

    // 3. Scan anchor links (mailto, tel, socials)
    $("a").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      const text = $(el).text().trim();
      if (!href) return;

      // Mailto links
      if (href.startsWith("mailto:")) {
        const email = href.substring(7).split("?")[0].trim().toLowerCase();
        if (this.isValidEmail(email)) {
          contacts.push({ type: "email", value: email, name: text || undefined, source });
        }
      }

      // Tel links
      if (href.startsWith("tel:")) {
        const phone = href.substring(4).split("?")[0].trim();
        if (phone.length > 5) {
          contacts.push({ type: "phone", value: phone, name: text || undefined, source });
        }
      }

      // Social profiles detection
      this.detectSocialProfile(href, socialLinks);
    });

    // 4. Regex scans on raw text nodes (backup parser for plaintext lists)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;
    const bodyText = $("body").text();
    let match;

    while ((match = emailRegex.exec(bodyText)) !== null) {
      const email = match[0].toLowerCase().trim();
      if (this.isValidEmail(email) && !contacts.some((c) => c.value === email)) {
        contacts.push({ type: "email", value: email, source: `${source} (plaintext)` });
      }
    }
  }

  /**
   * Helper to parse Schema.org JSON-LD elements recursively
   */
  private extractFromJsonLd(json: any, source: string, contacts: BusinessContactDTO[], socialLinks: SocialLinks) {
    if (!json) return;

    if (Array.isArray(json)) {
      json.forEach((item) => this.extractFromJsonLd(item, source, contacts, socialLinks));
      return;
    }

    // Capture sameAs urls (usually links to socials)
    if (json.sameAs) {
      const urls = Array.isArray(json.sameAs) ? json.sameAs : [json.sameAs];
      urls.forEach((url: string) => this.detectSocialProfile(url, socialLinks));
    }

    // Capture email
    if (json.email) {
      const email = String(json.email).replace("mailto:", "").trim().toLowerCase();
      if (this.isValidEmail(email)) {
        contacts.push({ type: "email", value: email, source: `${source} (json-ld)` });
      }
    }

    // Capture phone
    if (json.telephone) {
      contacts.push({ type: "phone", value: String(json.telephone).trim(), source: `${source} (json-ld)` });
    }

    // Recurse into nested structures (like organization / contactPoint)
    if (json.contactPoint) {
      this.extractFromJsonLd(json.contactPoint, source, contacts, socialLinks);
    }
  }

  /**
   * Parse profile URL and assign it to the socialLinks record
   */
  private detectSocialProfile(url: string, socialLinks: SocialLinks) {
    try {
      const lower = url.toLowerCase();
      if (lower.includes("facebook.com/") || lower.includes("fb.com/")) {
        socialLinks.facebook = url;
      } else if (lower.includes("instagram.com/") || lower.includes("instagr.am/")) {
        socialLinks.instagram = url;
      } else if (lower.includes("linkedin.com/")) {
        socialLinks.linkedin = url;
      } else if (lower.includes("twitter.com/") || lower.includes("x.com/")) {
        socialLinks.twitter = url;
      } else if (lower.includes("youtube.com/") || lower.includes("youtu.be/")) {
        socialLinks.youtube = url;
      }
    } catch {
      // Skip invalid URLs
    }
  }

  /**
   * Resolve relative links to absolute ones
   */
  private resolveUrl(base: string, relative: string): string | null {
    try {
      if (relative.startsWith("http")) return relative;
      if (relative.startsWith("//")) return `https:${relative}`;
      const url = new URL(relative, base);
      return url.toString();
    } catch {
      return null;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && !email.endsWith(".png") && !email.endsWith(".jpg") && !email.endsWith(".webp") && !email.endsWith(".gif");
  }
}
