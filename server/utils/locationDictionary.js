export const GOOGLE_REGION_TO_STATE = {
  20453: "andhra pradesh",
  20454: "assam",
  20455: "bihar",
  20457: "gujarat",
  20458: "haryana",
  20459: "jammu and kashmir",
  20460: "karnataka",
  20461: "kerala",
  20462: "maharashtra",
  20463: "meghalaya",
  20464: "madhya pradesh",
  20465: "odisha",
  20466: "punjab",
  20468: "rajasthan",
  20469: "tamil nadu",
  20470: "tripura",
  20471: "uttar pradesh",
  20472: "west bengal",
  21268: "goa",
  21289: "arunachal pradesh",
  21334: "chhattisgarh",
  21335: "himachal pradesh",
  21336: "jharkhand",
  21337: "manipur",
  21338: "mizoram",
  21339: "nagaland",
  21340: "sikkim",
  21341: "uttarakhand",
  9061642: "telangana",
  21281: "delhi",
  21288: "chandigarh",
  21287: "puducherry",
};

export const VALID_REGIONS = [
  "north",
  "south",
  "east",
  "west",
  "central",
  "other",
];

export const STATE_TO_REGION = {
  // North
  delhi: "north",
  haryana: "north",
  "himachal pradesh": "north",
  "jammu and kashmir": "north",
  punjab: "north",
  rajasthan: "north",
  "uttar pradesh": "north",
  uttarakhand: "north",
  chandigarh: "north",
  ladakh: "north",

  // South
  "andhra pradesh": "south",
  karnataka: "south",
  kerala: "south",
  "tamil nadu": "south",
  telangana: "south",
  puducherry: "south",
  lakshadweep: "south",
  "andaman and nicobar islands": "south",

  // East
  bihar: "east",
  jharkhand: "east",
  odisha: "east",
  "west bengal": "east",
  sikkim: "east",
  assam: "east",
  "arunachal pradesh": "east",
  manipur: "east",
  meghalaya: "east",
  mizoram: "east",
  nagaland: "east",
  tripura: "east",

  // West
  goa: "west",
  gujarat: "west",
  maharashtra: "west",
  "dadra and nagar haveli": "west",
  "daman and diu": "west",

  // Central
  chhattisgarh: "central",
  "madhya pradesh": "central",
};

/**
 * Returns the region for a given state name. Returns 'other' if not found.
 */
export function getRegionForState(stateName) {
  if (!stateName) return "other";
  const normalized = stateName.toLowerCase().trim();
  return STATE_TO_REGION[normalized] || "other";
}

/**
 * Normalizes a region string to ensure it strictly matches the allowed enum.
 */
export function normalizeRegion(region) {
  if (!region) return "other";
  const normalized = region.toLowerCase().trim();
  if (VALID_REGIONS.includes(normalized)) {
    return normalized;
  }
  return "other";
}
