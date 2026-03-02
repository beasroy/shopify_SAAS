/**
 * City name aliases: alternate spellings/names -> canonical form (lowercase).
 * Used so GPT and lookupKey treat e.g. Bangalore/Bengaluru and Delhi/New Delhi as the same.
 * Keys and values are normalized (lowercase, trimmed).
 * Add more as you see variations in Order/address data.
 */
const CITY_ALIASES = {
    // Bangalore / Karnataka
    bangalore: 'bengaluru',
    bangaluru: 'bengaluru',

    // Delhi
    'new delhi': 'delhi',
    delhi: 'delhi',

    // Mumbai (Bombay)
    bombay: 'mumbai',
    mumbai: 'mumbai',

    // Chennai (Madras)
    madras: 'chennai',
    chennai: 'chennai',

    // Kolkata (Calcutta)
    calcutta: 'kolkata',
    kolkata: 'kolkata',

    // Pune (Poona)
    poona: 'pune',
    pune: 'pune',

    // Hyderabad – no common alternate
    // Ahmedabad – no common alternate

    // Other Indian renames / common spellings
    trivandrum: 'thiruvananthapuram',
    thiruvananthapuram: 'thiruvananthapuram',
    cochin: 'kochi',
    kochi: 'kochi',
    mangalore: 'mangaluru',
    mangaluru: 'mangaluru',
    mysore: 'mysuru',
    mysuru: 'mysuru',
    baroda: 'vadodara',
    vadodara: 'vadodara',
    benares: 'varanasi',
    banaras: 'varanasi',
    varanasi: 'varanasi',
    gauhati: 'guwahati',
    guwahati: 'guwahati',
    vizag: 'visakhapatnam',
    visakhapatnam: 'visakhapatnam',
    belgaum: 'belagavi',
    belagavi: 'belagavi',

    // Global (add as needed)
    'new york city': 'new york',
    'nyc': 'new york',
};

/**
 * Get canonical city name for classification and lookupKey.
 * @param {string} name - Raw city name (e.g. "Bangalore", "New Delhi")
 * @returns {string} Canonical form (e.g. "bengaluru", "delhi"), lowercase and trimmed
 */
export function getCanonicalCity(name) {
    if (name == null || typeof name !== 'string') return '';
    const normalized = name.toLowerCase().trim();
    return CITY_ALIASES[normalized] ?? normalized;
}

/**
 * For use in MongoDB aggregation: returns a $switch expression that maps cityNormalized to cityCanonical.
 * Call with the alias object to build branches.
 */
export function getCityCanonicalSwitch() {
    const branches = Object.entries(CITY_ALIASES).map(([from, to]) => ({
        case: { $eq: ['$cityNormalized', from] },
        then: to
    }));
    return {
        $switch: {
            branches,
            default: '$cityNormalized'
        }
    };
}

export { CITY_ALIASES };
