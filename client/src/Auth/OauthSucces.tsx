import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useDispatch} from 'react-redux';
import { setUser } from '@/store/slices/UserSlice'


const GoogleCallback = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const dispatch = useDispatch();
    const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

        useEffect(() => {
            const handleOauthCallback = async () => {
                try {
                    const queryParams = new URLSearchParams(window.location.search);
                    const googletoken = queryParams.get('token');
                    const fbToken = queryParams.get('fbToken');
                    const googleRefreshToken = queryParams.get('googleRefreshToken');
        
                    // Helper function for token update
                    const updateToken = async (url: string, token: string, type: string) => {
                        const response = await axios.get(`${baseURL}${url}?${type}=${token}`, { withCredentials: true });
                        if (response.data.success) {
                            console.log(`${type} token updated successfully, redirecting to /dashboard`);
                            navigate('/dashboard');
                            return true;
                        } else {
                            console.error(`Failed to update ${type} token`);
                            toast({
                                title: 'Update Failed',
                                description: `Unable to update ${type} token.`,
                                variant: 'destructive',
                            });
                            navigate('/');
                            return false;
                        }
                    };
        
                    if (googletoken) {
                        console.log('Token found, proceeding with login');
                        const login = await axios.post(`${baseURL}/api/auth/login/oauth?auth_token=${googletoken}`, { email: null, password: null });
        
                        if (login.data.success) {
                            console.log('Login successful, redirecting to /dashboard');
                            dispatch(setUser(login.data.user));
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
        
                    if (fbToken) {
                        await updateToken('/api/auth/updateTokens/facebook', fbToken, 'fbToken');
                        return;
                    }
        
                    if (googleRefreshToken) {
                        await updateToken('/api/auth/updateTokens/google', googleRefreshToken, 'googleRefreshToken');
                        return;
                    }
        
                    console.log('No token present, redirecting to /');
                    navigate('/');
        
                } catch (error) {
                    console.error('Error during OAuth callback:', error);
                    toast({
                        title: 'Error',
                        description: 'An error occurred while handling the login callback.',
                        variant: 'destructive',
                    });
                    navigate('/');
                }
            };
        
            handleOauthCallback();
        }, [navigate, setUser, toast, baseURL]);
        

    return null;
};

export default GoogleCallback;