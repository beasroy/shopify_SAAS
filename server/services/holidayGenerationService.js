import axios from 'axios';

export async function generateHolidaysWithAPI(country, year) {
  if (!process.env.CALENDARIFIC_API_KEY) {
    throw new Error('CALENDARIFIC_API_KEY is not set in environment variables');
  }

  const apiKey = process.env.CALENDARIFIC_API_KEY;
  const countryCode = country.toUpperCase();
  const targetYear = year || new Date().getFullYear();

  try {
    // Fetch holidays from Calendarific API
    const response = await axios.get('https://calendarific.com/api/v2/holidays', {
      params: {
        api_key: apiKey,
        country: countryCode,
        year: targetYear
      }
    });

    if (response.data.meta.code !== 200) {
      throw new Error(`Calendarific API error: ${response.data.meta.error || 'Unknown error'}`);
    }

    const holidays = response.data.response.holidays || [];


    const formattedHolidays = holidays.map(holiday => {
      const isNational = holiday.type && holiday.type.some(type => 
        type.toLowerCase().includes('national')
      );
      const scope = isNational ? 'national' : 'other';

      const dateIso = holiday.date.iso;
      const dateStr = dateIso.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);

      return {
        name: holiday.name,
        date: date,
        description: holiday.description || '',
        scope: scope,
      };
    });

    return formattedHolidays;
  } catch (error) {
    console.error('Calendarific API Error:', error);
    
    if (error.response) {
      throw new Error(`Calendarific API error: ${error.response.data?.meta?.error || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Calendarific API request failed: No response received');
    } else {
      throw new Error(`Calendarific API error: ${error.message}`);
    }
  }
}
