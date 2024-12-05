import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useUser } from '../context/UserContext';

const GoogleCallback = () => {
    const navigate = useNavigate();
    const { setUser } = useUser();
    const { toast } = useToast();
    const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

    useEffect(() => {
        const handleGoogleCallback = async () => {
            try {
                const queryParams = new URLSearchParams(window.location.search);
                const googletoken = queryParams.get('token');
                const isBrandSetup = queryParams.has('brand-setup'); // Checks for the presence of the parameter

                console.log('Token:', googletoken);
                console.log('Is Brand Setup:', isBrandSetup);

                if (isBrandSetup) {
                    console.log('Brand-setup is present, redirecting to /dashboard');
                    navigate('/dashboard', { replace: true });
                    return;
                }

                if (googletoken) {
                    console.log('Token is present, proceeding with login');
                    const login = await axios.post(
                        `${baseURL}/api/auth/login/oauth?auth_token=${googletoken}`,
                        { email: null, password: null }
                    );

                    if (login.data.success) {
                        console.log('Login successful, setting user and redirecting to /dashboard');
                        setUser(login.data.user);
                        navigate('/dashboard');
                        return;
                    } else {
                        console.log('Login failed, redirecting to /');
                        toast({
                            title: 'Login Failed',
                            description: 'Unable to authenticate with Google.',
                            variant: 'destructive',
                        });
                        navigate('/');
                        return;
                    }
                }

                console.log('No token and no brand-setup, redirecting to /');
                navigate('/'); // Default fallback if neither token nor brand-setup
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
    }, [navigate, setUser, toast, baseURL]);

    return null;
};

export default GoogleCallback;
