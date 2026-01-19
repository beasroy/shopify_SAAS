import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Classify cities using GPT API
 * @param {Array} cities - Array of city objects with {city, state, cityNormalized, lookupKey}
 * @returns {Promise<Array>} Array of classified city objects
 */
export async function classifyCitiesWithGPT(cities) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Build city list for prompt
    const cityList = cities.map((c, i) => 
        `${i + 1}. ${c.city}, ${c.state}`
    ).join('\n');

    const prompt = `You are a geography expert for India. Classify the following cities with:
1. Metro status: "metro" or "non-metro"
2. Tier: "tier1", "tier2", or "tier3" (only these three tiers)
3. Region: "north", "south", "east", "west", or "central" (Note: All cities in the same state belong to the same region. Classify states as: North - Jammu & Kashmir, Himachal Pradesh, Punjab, Haryana, Delhi, Uttarakhand, Uttar Pradesh, Rajasthan; South - Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, Telangana, Puducherry; East - West Bengal, Odisha, Jharkhand, Bihar, and all Northeast states (Assam, Meghalaya, Manipur, Mizoram, Nagaland, Tripura, Arunachal Pradesh, Sikkim); West - Maharashtra, Gujarat, Goa; Central - Madhya Pradesh, Chhattisgarh)
4. Is coastal: true or false

Cities to classify:
${cityList}

Return a JSON object with a "cities" array. Each city object should have:
{
  "city": "Mumbai",
  "state": "Maharashtra",
  "metroStatus": "metro",
  "tier": "tier1",
  "region": "west",
  "isCoastal": true
}

Return ONLY valid JSON, no other text.`;

    try {
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini", // Use gpt-4o-mini for cost efficiency
            messages: [
                { 
                    role: "system", 
                    content: "You are a helpful assistant that returns only valid JSON. Always return a JSON object with a 'cities' array." 
                },
                { 
                    role: "user", 
                    content: prompt 
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
        });

        const content = response.choices[0].message.content;
        let result;
        
        try {
            result = JSON.parse(content);
        } catch (parseError) {
            // Try to extract JSON if wrapped in markdown
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse GPT response as JSON');
            }
        }

        // Map GPT results back to our cities with lookupKey
        const classifications = [];
        const resultCities = result.cities || (Array.isArray(result) ? result : []);

        cities.forEach((city, index) => {
            const classification = resultCities[index] || resultCities.find(
                c => c.city?.toLowerCase() === city.cityNormalized && 
                     c.state?.toLowerCase() === city.state?.toLowerCase()
            );

            if (classification) {
                classifications.push({
                    lookupKey: city.lookupKey,
                    city: city.city,
                    state: city.state,
                    cityNormalized: city.cityNormalized,
                    metroStatus: classification.metroStatus || 'non-metro',
                    tier: classification.tier || 'tier3', // Default to tier3 if not specified
                    region: classification.region || 'central',
                    isCoastal: classification.isCoastal || false,
                    confidence: 0.9
                });
            } else {
                // Fallback if classification not found
                console.warn(`No classification found for ${city.city}, ${city.state}`);
                classifications.push({
                    lookupKey: city.lookupKey,
                    city: city.city,
                    state: city.state,
                    cityNormalized: city.cityNormalized,
                    metroStatus: 'non-metro',
                    tier: 'tier3', // Default to tier3 for unclassified cities
                    region: 'central',
                    isCoastal: false,
                    confidence: 0.5
                });
            }
        });

        return classifications;

    } catch (error) {
        console.error('GPT API Error:', error);
        throw new Error(`GPT classification failed: ${error.message}`);
    }
}

