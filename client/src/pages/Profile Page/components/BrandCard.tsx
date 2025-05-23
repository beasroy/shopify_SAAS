import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, Plus, Settings, Trash2, ShoppingBag, BarChart3, LineChart, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BrandIntegrationModal } from "./BrandIntegrationModal"
import { useSelector } from "react-redux"
import { RootState } from "@/store"
import axios from "axios"
import { baseURL } from "@/data/constant"
import { BrandDetail , FullBrandData } from "@/interfaces"

const platformIcons = {
    shopify: { 
      icon: ShoppingBag, 
      name: "Shopify" 
    },
    googleAds: { 
      icon: BarChart3, 
      name: "Google Ads" 
    },
    googleAnalytics: { 
      icon: LineChart, 
      name: "Google Analytics" 
    },
    facebook: { 
      icon: Facebook, 
      name: "Facebook" 
    }
  }

export function BrandCards({ 
    userBrands = [] as string[] 
  }: { 
    userBrands?: string[] 
  }) {
  const navigate = useNavigate()
  const [selectedBrand, setSelectedBrand] = useState<{id: string, name: string} | null>(null)
  const [selectedBrandData, setSelectedBrandData] = useState<FullBrandData | null>(null)
  const brands = useSelector((state: RootState) => state.brand.brands);

  const userBrandDetails: BrandDetail[] = userBrands?.map((brandId: string) => {
    const brand = brands.find((b) => b._id === brandId);
    return brand 
      ? { _id: brand._id, name: brand.name }
      : { _id: brandId, name: "Unknown Brand" };
  }) || [];

  useEffect(() => {
    const fetchBrandDetails = async () => {
      if (selectedBrand) {
        try {
          const response = await axios.get(`${baseURL}/api/brands/${selectedBrand.id}`,{withCredentials : true});
          setSelectedBrandData(response.data);
        } catch (error) {
          console.error('Error fetching brand details:', error);
        }
      }
    };

    fetchBrandDetails();
  }, [selectedBrand]);

  const handleOpenModal = (brand: {id: string, name: string}) => {
    setSelectedBrand(brand)
  }

  const handleCloseModal = () => {
    setSelectedBrand(null)
    setSelectedBrandData(null)
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Button onClick={() => navigate("/brand-setup")} variant="outline" className="text-slate-700">
          <Plus className="h-5 w-5 mr-2" />
          Add New Brand
        </Button>

        {userBrandDetails.map((brand) => (
          <div
            key={brand._id}
            className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleOpenModal({ id: brand._id, name: brand.name })}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{brand.name}</h3>
                  <span className="text-sm text-slate-500">Connected</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-600"
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle settings click
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Integration Status</span>
                <Badge className="bg-teal-100 text-teal-700">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenModal({ id: brand._id, name: brand.name })
                  }}
                >
                  Manage
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle delete click
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedBrand && selectedBrandData && (
        <BrandIntegrationModal
          isOpen={true}
          onClose={handleCloseModal}
          brandId={selectedBrand.id}
          brandName={selectedBrand.name}
          brandData={selectedBrandData}
          platformIcons={platformIcons}
        />
      )}
    </div>
  )
}