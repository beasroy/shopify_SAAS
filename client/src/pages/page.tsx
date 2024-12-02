import { useEffect } from 'react';
import axios from 'axios';
import { useUser } from '@/context/UserContext';

const GoogleAccountsSetup = () => {
  const user = useUser();
  useEffect(() => {
    const fetchGoogleAccounts = async () => {
      try {
        const response = await axios.post('http://localhost:8000/api/setup/google-accounts',{userId: user.user?.id},{withCredentials: true});
        console.log('Response from API:', response.data);
      } catch (error) {
        console.error('Error fetching Google accounts:', error);
      }
    };

    fetchGoogleAccounts();
  }, []);

  return (
    <div>
      <h1>Google Accounts Setup</h1>
      <p>Check the console for the API response.</p>
    </div>
  );
};

export default GoogleAccountsSetup;
