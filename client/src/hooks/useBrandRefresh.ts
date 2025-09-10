import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import axios from 'axios';
import { baseURL } from '@/data/constant';
import { setBrands } from '@/store/slices/BrandSlice';

export const useBrandRefresh = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user);

  const refreshBrands = useCallback(async () => {
    try {
      if (!user?.brands || user.brands.length === 0) {
        console.warn("No brand IDs found in user context.");
        return;
      }

      const response = await axios.post(
        `${baseURL}/api/brands/filter`,
        { brandIds: user.brands },
        { withCredentials: true },
      );

      dispatch(setBrands(response.data));
    } catch (error) {
      console.error("Error refreshing brands:", error);
    }
  }, [user?.brands, dispatch]);

  return { refreshBrands };
}; 