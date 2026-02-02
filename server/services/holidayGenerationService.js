import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate holidays for a country and year using GPT API
 * @param {String} country - ISO country code (e.g., 'IN', 'US')
 * @param {Number} year - Year for which to generate holidays
 * @returns {Promise<Array>} Array of holiday objects
 */
export async function generateHolidaysWithGPT(country, year) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Map country codes to country names for better GPT understanding
    const countryNames = {
        'IN': 'India',
        'US': 'United States',
        'UK': 'United Kingdom',
        'CA': 'Canada',
        'AU': 'Australia',
        'DE': 'Germany',
        'FR': 'France',
        'JP': 'Japan',
        'CN': 'China',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'ES': 'Spain',
        'IT': 'Italy',
        'RU': 'Russia',
        'KR': 'South Korea'
    };

    const countryName = countryNames[country.toUpperCase()] || country;

    // Country-specific examples to guide GPT
    const countryExamples = {
        'IN': `For India, you MUST include ALL of the following categories:
- NATIONAL HOLIDAYS: Republic Day (Jan 26), Independence Day (Aug 15), Gandhi Jayanti (Oct 2), etc.
- HINDU FESTIVALS: Diwali, Holi, Dussehra, Raksha Bandhan, Janmashtami, Ganesh Chaturthi, Navratri, Durga Puja, Karva Chauth, Pongal, Onam, Baisakhi, Makar Sankranti, Lohri, etc.
- ISLAMIC FESTIVALS: Eid al-Fitr, Eid al-Adha, Muharram, Milad un Nabi, etc.
- CHRISTIAN FESTIVALS: Christmas, Good Friday, Easter, etc.
- SIKH FESTIVALS: Guru Nanak Jayanti, Baisakhi, etc.
- BUDDHIST FESTIVALS: Buddha Purnima, etc.
- JAIN FESTIVALS: Mahavir Jayanti, etc.
- REGIONAL FESTIVALS: Pongal (Tamil Nadu), Onam (Kerala), Bihu (Assam), Gudi Padwa (Maharashtra), Ugadi (Karnataka/Andhra), etc.
- INTERNATIONAL OBSERVANCES: New Year's Day, Valentine's Day (Feb 14), International Women's Day (Mar 8), Mother's Day, Father's Day, Friendship Day, etc.
- CULTURAL FESTIVALS: Basant Panchami, Karva Chauth, Teej, etc.
- STATE-SPECIFIC HOLIDAYS: Include state formation days, regional festivals, etc.`,
        'US': `For United States, include:
- FEDERAL HOLIDAYS: New Year's Day, Martin Luther King Jr. Day, Presidents' Day, Memorial Day, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas
- RELIGIOUS HOLIDAYS: Easter, Good Friday, Christmas, Hanukkah, etc.
- CULTURAL OBSERVANCES: Valentine's Day, St. Patrick's Day, Mother's Day, Father's Day, Halloween, etc.
- ETHNIC/CULTURAL FESTIVALS: Cinco de Mayo, Juneteenth, etc.`,
        'default': `Include all major categories:
- National/public holidays
- Religious festivals (all major religions in the country)
- Cultural celebrations
- International observances (Valentine's Day, Mother's Day, etc.)
- Regional/state-specific holidays
- Traditional festivals`
    };

    const examples = countryExamples[country.toUpperCase()] || countryExamples['default'];

    const prompt = `You are a comprehensive cultural and calendar expert. Generate an EXHAUSTIVE and COMPLETE list of ALL holidays, festivals, observances, and celebrations for ${countryName} for the year ${year}.

CRITICAL REQUIREMENTS - DO NOT MISS ANY HOLIDAYS:

1. COMPREHENSIVE COVERAGE - Include EVERY type of holiday:
   ${examples}

2. RELIGIOUS FESTIVALS - Include ALL major religious festivals for ALL religions practiced in ${countryName}:
   - Calculate exact dates for variable-date festivals (like Diwali, Easter, Eid, etc.) for the year ${year}
   - Include both major and minor religious observances
   - Don't skip any significant religious festivals

3. INTERNATIONAL OBSERVANCES - Include widely celebrated international days:
   - New Year's Day (Jan 1)
   - Valentine's Day (Feb 14)
   - International Women's Day (Mar 8)
   - Mother's Day (varies by country)
   - Father's Day (varies by country)
   - Friendship Day
   - Halloween (Oct 31) if celebrated
   - And other internationally recognized days

4. NATIONAL HOLIDAYS - All official public holidays and national observances

5. CULTURAL FESTIVALS - Traditional cultural celebrations, harvest festivals, seasonal festivals

6. REGIONAL/STATE HOLIDAYS - State-specific holidays, regional festivals, local observances

7. SCOPE CLASSIFICATION - For each holiday, classify its scope:
   - "national": Observed nationwide across the entire country
   - "state": Observed in specific states/provinces/regions (include state name)
   - "regional": Observed in specific regions or communities (include region name if applicable)

8. DATE ACCURACY - For variable-date festivals:
   - Calculate the EXACT date for ${year} using proper calendars (lunar, solar, etc.)
   - Use accurate calculations for festivals like Diwali, Eid, Easter, etc.
   - Ensure all dates are correct for ${year}

9. COMPLETENESS CHECK - Before finalizing, verify you have included:
   - All major religious festivals
   - All national holidays
   - All cultural festivals
   - International observances
   - Regional/state-specific holidays
   - Don't miss festivals like Janmashtami, Valentine's Day, Karva Chauth, etc.

For each holiday, provide:
- name: The official or commonly used name of the holiday/festival
- date: The EXACT date in YYYY-MM-DD format for ${year} (calculate variable dates accurately)
- scope: "national", "state", or "regional"
- state: State/province name if scope is "state" (null otherwise)
- region: Region name if scope is "regional" (null otherwise)
- description: A brief description of what the holiday represents or celebrates
- isRecurring: true (all holidays are recurring annually)
- recurrencePattern: "annually"

Return a JSON object with a "holidays" array containing ALL holidays. Each holiday object should have:
{
  "name": "Janmashtami",
  "date": "2024-08-26",
  "scope": "national",
  "state": null,
  "region": null,
  "description": "Hindu festival celebrating the birth of Lord Krishna",
  "isRecurring": true,
  "recurrencePattern": "annually"
}

IMPORTANT: Generate a COMPLETE and EXHAUSTIVE list. Do not skip any festivals. Include at least 50-100+ holidays for countries with diverse cultures like India.

Return ONLY valid JSON, no other text.`;

    try {
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: "You are a helpful assistant that returns only valid JSON. Always return a JSON object with a 'holidays' array." 
                },
                { 
                    role: "user", 
                    content: prompt 
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2  // Lower temperature for more consistent and comprehensive results
        });

        const content = response.choices[0].message.content;
        let result;
        
        try {
            result = JSON.parse(content);
        } catch (parseError) {
            // Try to extract JSON if wrapped in markdown
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    result = JSON.parse(jsonMatch[0]);
                } catch {
                    throw new Error(`Failed to parse GPT response as JSON: ${parseError.message}`);
                }
            } else {
                throw new Error(`Failed to parse GPT response as JSON: ${parseError.message}`);
            }
        }

        const holidays = result.holidays || (Array.isArray(result) ? result : []);

        // Validate and format holidays
        const formattedHolidays = holidays.map(holiday => {
            // Validate date format
            const date = new Date(holiday.date);
            if (Number.isNaN(date.getTime())) {
                throw new TypeError(`Invalid date format: ${holiday.date}`);
            }

            // Normalize date to start of day
            date.setHours(0, 0, 0, 0);

            return {
                name: holiday.name || holiday.festivalName || 'Unknown Holiday',
                date: date,
                scope: holiday.scope || 'national',
                state: holiday.state || null,
                description: holiday.description || '',
                isRecurring: holiday.isRecurring === true || holiday.isRecurring === undefined,
                recurrencePattern: holiday.recurrencePattern || 'annually'
            };
        });

        return formattedHolidays;

    } catch (error) {
        console.error('GPT API Error:', error);
        throw new Error(`GPT holiday generation failed: ${error.message}`);
    }
}

