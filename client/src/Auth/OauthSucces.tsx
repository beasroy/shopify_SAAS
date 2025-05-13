import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/slices/UserSlice'
import { setBrands , setSelectedBrandId } from '@/store/slices/BrandSlice'

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
                const googleAdRefreshToken = queryParams.get('googleadRefreshToken');
                const googleAnalyticsRefreshToken = queryParams.get('googleanalyticsRefreshToken');
                const zohoRefreshToken = queryParams.get('zohoToken');
                const userId = queryParams.get('userId');
                const appToken = queryParams.get('shopify_token');
                

                // Helper function for token update
                const updateToken = async (url: string, token: string, type: string) => {
                    try {
                        const response = await axios.put(
                            `${baseURL}${url}/${type}`, 
                            {}, // Empty body since we're using query params
                            { 
                                params: { [type]: token },
                                withCredentials: true 
                            }
                        );
                        
                        if (response.data.success) {
                            console.log(`${type} token updated successfully`);
                            if (type === "zohoToken") {
                                console.log("Zoho token updated, redirecting to /profile");
                                navigate('/profile');
                            } else {
                                console.log(`${type} token updated, redirecting to /dashboard`);
                                navigate('/dashboard');
                            }
                            return true;
                        } else {
                            console.error(`Failed to update ${type} token`);
                            toast({
                                title: 'Update Failed',
                                description: `Unable to update ${type} token.`,
                                variant: 'destructive',
                            });
                            navigate('/dashboard');
                            return false;
                        }
                    } catch (error: any) {
                        console.error(`Error updating ${type} token:`, error);
                        toast({
                            title: 'Update Failed',
                            description: error?.response?.data?.message || `Unable to update ${type} token.`,
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
                        console.log('Login successful');
                        const user = login.data.user;

                        dispatch(setUser(user));

                        if (!user.brands || user.brands.length === 0) {
                            console.log('No brands found, redirecting to /brand-setup');
                            navigate('/brand-setup');
                        } else {
                            console.log('Brands found, redirecting to /dashboard');
                            navigate('/dashboard');
                        }
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
                    await updateToken('/api/auth/updateTokens', fbToken, 'fbToken');
                    return;
                }

                if (googleAdRefreshToken) {
                    await updateToken('/api/auth/updateTokens', googleAdRefreshToken, 'googleadRefreshToken');
                    return;
                }

                if (googleAnalyticsRefreshToken) {
                    await updateToken('/api/auth/updateTokens', googleAnalyticsRefreshToken, 'googleanalyticsRefreshToken');
                    return;
                }

                if (zohoRefreshToken) {
                    await updateToken('/api/auth/updateTokens/zoho', zohoRefreshToken, 'zohoToken');
                    return;
                }

                if (userId && appToken) {
                    console.log('Token found, proceeding with user saving');
                    const getUser = await axios.get(`${baseURL}/api/users/getuser/${userId}?token=${appToken}`);

                    if (getUser.data.success) {
                        const user = getUser.data.user;
                        const brands = getUser.data.brands;

                        console.log("User brands:", user.brands); 
                        console.log("Brands data:", brands);

                        dispatch(setUser(user));
                        dispatch(setBrands(brands));
                        dispatch(setSelectedBrandId(brands[0]._id));
                        if (!user.brands || user.brands.length === 0) {
                            console.log('No brands found, redirecting to /brand-setup');
                            navigate('/brand-setup');
                        } else {
                            console.log('Brands found, redirecting to /dashboard');
                            navigate('/dashboard');
                        }
                        return;
                    } else {
                        console.log('Login failed, redirecting to /login');
                        toast({
                            title: 'Login Failed',
                            description: 'Unable to authenticate with Google.',
                            variant: 'destructive',
                        });
                        navigate('/login');
                        return;
                    }
                }

                console.log('No token present, redirecting to /login');
                navigate('/login');

            } catch (error) {
                console.error('Error during OAuth callback:', error);
                toast({
                    title: 'Error',
                    description: 'An error occurred while handling the login callback.',
                    variant: 'destructive',
                });
                navigate('/login');
            }
        };

        handleOauthCallback();
    }, [navigate, setUser, toast, baseURL]);


    return null;
};

export default GoogleCallback;