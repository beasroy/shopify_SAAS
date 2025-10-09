import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '@/store/slices/UserSlice'
import { setBrands , setSelectedBrandId } from '@/store/slices/BrandSlice'
import { resetAllTokenErrors } from '@/store/slices/TokenSllice'
import { useBrandRefresh } from '@/hooks/useBrandRefresh';
import { RootState } from '@/store';

const GoogleCallback = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const dispatch = useDispatch();
    const { refreshBrands } = useBrandRefresh();
    const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

    const selectedBrandId = useSelector((state: RootState) => state.brand.selectedBrandId);

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
                     
                        // If we have a brandId, proceed with normal token update
                        const response = await axios.put(
                            `${baseURL}${url}/${type}?brandId=${selectedBrandId}`,
                            {}, // Empty body since we are using query params
                            { 
                                params: { [type]: token },
                                withCredentials: true 
                            }
                        );                        
                        if (response.data.success) {
                            console.log(`${type} token updated successfully`);
                            // Reset all token errors when a token is successfully updated
                            dispatch(resetAllTokenErrors());
                            
                            if (type === "zohoToken") {
                                console.log("Zoho token updated, redirecting to /profile");
                                navigate('/profile');
                            } else {
                                const sourcePage = queryParams.get('source') || '/dashboard';
                                let modalToOpen = '';
                                
                                // Determine which modal to open based on token type
                                switch(type) {
                                    case 'googleadRefreshToken':
                                        modalToOpen = 'googleAds';
                                        break;
                                    case 'googleanalyticsRefreshToken':
                                        modalToOpen = 'googleAnalytics';
                                        break;
                                    case 'fbToken':
                                        modalToOpen = 'facebook';
                                        break;
                                }
                                
                                // Show success toast
                                toast({
                                    title: 'Success',
                                    description: `${type} token updated successfully.`,
                                    variant: 'default',
                                });
                                
                                // Redirect to the source page with modal parameter if applicable
                                if (modalToOpen) {
                                    navigate(`${sourcePage}?openModal=${modalToOpen}`);
                                } else {
                                    navigate(sourcePage);
                                }
                                return true;
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
                            console.log('No brands found, redirecting to /first-time-brand-setup');
                            navigate('/first-time-brand-setup');
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

                        dispatch(setUser(user));
                        dispatch(setBrands(brands));
                        dispatch(setSelectedBrandId(brands[0]._id));
                        await refreshBrands();  
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
    }, [navigate, setUser, toast, baseURL, selectedBrandId]);


    return null;
};

export default GoogleCallback;