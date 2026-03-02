import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import { getCanonicalCity } from '../utils/cityAliases.js';

// Load .env when this module is used standalone (e.g. by cityClassificationWorker run without server)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// #region agent log
fetch('http://127.0.0.1:7791/ingest/2df78964-76d9-43ce-8aef-0f2a37dc308a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'48a575'},body:JSON.stringify({sessionId:'48a575',location:'gptService.js:init',message:'OpenAI client initialized',data:{hasOpenAIKey:!!process.env.OPENAI_API_KEY},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
// #endregion

export async function classifyCitiesWithGPT(cities) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Only apply alias when the city is in our alias map (e.g. Bangalore → Bengaluru); otherwise use as-is
    const cityList = cities.map((c, i) => {
        const canonical = getCanonicalCity(c.city);
        const displayCity = canonical ? canonical.charAt(0).toUpperCase() + canonical.slice(1) : (c.city || '');
        return `${i + 1}. ${displayCity}, ${c.state}${c.country ? ', ' + c.country : ''}`;
    }).join('\n');

const prompt = `You are a geography expert. Classify the following cities using your full geography knowledge — you can classify any city. The country is already provided in the list; use it for region/tier rules. When a city has well-known alternate names (e.g. Bangalore/Bengaluru, Delhi/New Delhi, Bombay/Mumbai), use the canonical or official form in your response so we can match consistently.

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

Reference city list (for this run — use for context; classify these and any city using your knowledge):
${cityList}

Return a JSON object with a "cities" array. Include one classification per city in the reference list above. Each city object should have:
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

            const cityCanonical = getCanonicalCity(city.city);
            const stateNorm = (city.state || '').toLowerCase().trim();
            // Match by canonical so Bangalore and Bengaluru get the same classification
            const classification = resultCities[index] || resultCities.find(
                r => getCanonicalCity(r.city) === cityCanonical &&
                     (r.state?.toLowerCase().trim() || '') === stateNorm
            );

            if (classification) {
                // Use country from input (cities array); GPT does not return it
                const country = city.country || 'unknown';
                const countryNormalized = String(country).toLowerCase().replaceAll(/\s+/g, '') || 'unknown';
                const stateNormalized = (city.state || 'unknown').toLowerCase().replaceAll(/\s+/g, '') || 'unknown';
                // lookupKey uses canonical city so Bangalore and Bengaluru share the same key
                const lookupKey = `${cityCanonical}_${stateNormalized}_${countryNormalized}`;
                
                classifications.push({
                    lookupKey: lookupKey,
                    city: city.city,
                    state: city.state,
                    country: country,
                    cityNormalized: cityCanonical,
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
                const countryNormalized = String(country).toLowerCase().replaceAll(/\s+/g, '') || 'unknown';
                const stateNormalized = (city.state || 'unknown').toLowerCase().replaceAll(/\s+/g, '') || 'unknown';
                const lookupKey = `${cityCanonical}_${stateNormalized}_${countryNormalized}`;
                classifications.push({
                    lookupKey: lookupKey,
                    city: city.city,
                    state: city.state,
                    country: country,
                    cityNormalized: cityCanonical,
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

