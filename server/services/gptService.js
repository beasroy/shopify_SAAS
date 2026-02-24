import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


export async function classifyCitiesWithGPT(cities) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Build city list for prompt (country comes from input; GPT does not need to generate it)
    const cityList = cities.map((c, i) =>
        `${i + 1}. ${c.city}, ${c.state}${c.country ? ', ' + c.country : ''}`
    ).join('\n');

const prompt = `You are a geography expert. For each city, classify it accordingly. The country is already provided in the list — do not infer or generate country; use the given country if needed for region/tier rules.

3. Tier: "tier1", "tier2", or "tier3"
   - For Indian cities: Use the official tier classification system:
     * tier1: Major metropolitan cities (Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, etc.)
     * tier2: Mid-sized cities with good infrastructure (Jaipur, Lucknow, Nagpur, Surat, etc.)
     * tier3: Smaller cities and towns
   - For non-Indian cities: Always use "tier3" (this is a placeholder since tier classification is India-specific)

4. Region: Geographic region classification based on where the city/state is actually located within the country
   - Determine the region based on the actual geographic position of the city/state within the country's borders
   - Use "north", "south", "east", "west", "central", or "other" based on the physical location
   - For India: All cities in the same state belong to the same region (e.g., Maharashtra is in the west, Tamil Nadu is in the south)
   - For other countries: Classify based on where the state/province is geographically located within that country
     * Example: A city in California, USA → "west" (because California is in the western part of the US)
     * Example: A city in New York, USA → "east" (because New York is in the eastern part of the US)
     * Example: A city in Ontario, Canada → "east" or "central" (depending on its actual location within Canada)

5. Is coastal: true or false
   - true if the city is located on a coastline or has direct access to a sea/ocean
   - false otherwise

Cities to classify:
${cityList}

Return a JSON object with a "cities" array. Each city object should have :
{
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "metroStatus": "metro",
  "tier": "tier1",
  "region": "west",
  "isCoastal": true
}

Return ONLY valid JSON, no other text.`;

    try {
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini", 
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
            // Skip cities with null/empty state or city
            if (!city.city || !city.state) {
                console.warn(`Skipping city with missing data: city=${city.city}, state=${city.state}`);
                return;
            }

            const classification = resultCities[index] || resultCities.find(
                c => c.city?.toLowerCase() === city.cityNormalized && 
                     c.state?.toLowerCase() === (city.state || '').toLowerCase()
            );

            if (classification) {
                // Use country from input (cities array); GPT does not return it
                const country = city.country || 'unknown';
                const countryNormalized = country.toLowerCase().replaceAll(/\s+/g, '');
                const stateNormalized = (city.state || 'unknown').toLowerCase().replaceAll(/\s+/g, '');
                const lookupKey = `${city.cityNormalized}_${stateNormalized}_${countryNormalized}`;
                
                classifications.push({
                    lookupKey: lookupKey,
                    city: city.city,
                    state: city.state,
                    country: country,
                    cityNormalized: city.cityNormalized,
                    metroStatus: classification.metroStatus || 'non-metro',
                    tier: classification.tier || 'tier3', // Default to tier3 if not specified
                    region: classification.region || (country.toLowerCase() === 'india' ? 'central' : 'other'),
                    isCoastal: classification.isCoastal || false,
                    confidence: 0.9
                });
            } else {
                // Fallback if classification not found
                console.warn(`No classification found for ${city.city}, ${city.state}`);
                const country = city.country || 'unknown';
                const countryNormalized = country.toLowerCase().replaceAll(/\s+/g, '');
                const stateNormalized = (city.state || 'unknown').toLowerCase().replaceAll(/\s+/g, '');
                const lookupKey = `${city.cityNormalized}_${stateNormalized}_${countryNormalized}`;
                classifications.push({
                    lookupKey: lookupKey,
                    city: city.city,
                    state: city.state,
                    country: country,
                    cityNormalized: city.cityNormalized,
                    metroStatus: 'non-metro',
                    tier: 'tier3', // Default to tier3 for unclassified cities
                    region: 'other',
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

