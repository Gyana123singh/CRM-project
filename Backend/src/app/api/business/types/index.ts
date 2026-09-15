export interface BusinessSearchFilters {
  niche: string;
  region: string;
  platformFilter?: string;
  count?: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
}

export interface BusinessContactDTO {
  type: "email" | "phone" | "general";
  value: string;
  name?: string;
  role?: string;
  source?: string;
}

export interface EnrichedBusiness {
  placeId?: string;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  rating?: number;
  coordinates?: Coordinates;
  cms?: string;
  detectedTechnologies: string[];
  socialLinks: SocialLinks;
  contacts: BusinessContactDTO[];
}
