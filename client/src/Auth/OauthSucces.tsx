import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useUser } from '../context/UserContext';

const GoogleCallback = () => {
    const navigate = useNavigate();
    const { setUser } = useUser();
    const { toast } = useToast();
    const baseURL = import.meta.env.PROD? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

    useEffect(() => {
        const handleGoogleCallback = async () => {
            try {
                const queryParams = new URLSearchParams(window.location.search);
                const googletoken = queryParams.get('token');
                if (!googletoken) {
                    navigate('/');
                    return;
                }
                const login = await axios.post(`${baseURL}/api/auth/login/oauth?auth_token=${googletoken}`,{email:null,password:null})
                setUser(login.data.user);

                if(login.data.success){
                    navigate('/dashboard');
                }
               
            } catch (error) {
                console.error('Google callback error:', error);
                toast({
                    title: 'Error',
                    description: 'An error occurred while handling the Google login callback.',
                    variant: 'destructive',
                });
                navigate('/');
            }
        };

        handleGoogleCallback();
    }, [navigate, setUser, toast]);

    return null;
};

export default GoogleCallback;
