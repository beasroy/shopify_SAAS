"use client";

import { useState, useEffect } from "react";
import { Check, ArrowRight, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ShopifyModalContent from "./ShopifyModalContent";
import OtherPlatformModalContent from "./OtherPlatformModalContent";
import { FacebookLogo, GoogleLogo, Ga4Logo, ShopifyLogo } from "@/data/logo";
import { baseURL } from "@/data/constant";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setUser } from "@/store/slices/UserSlice";
import { setBrandNameFixed } from "@/store/slices/BrandNameSlice";

const platforms = [
  {
    name: "Shopify",
    color: "bg-emerald-50",
    icon: ShopifyLogo,
    textColor: "text-emerald-700",
    ringColor: "ring-emerald-200",
    description: "Connect your e-commerce store",
  },
  {
    name: "Facebook",
    color: "bg-blue-50",
    icon: FacebookLogo,
    textColor: "text-blue-700",
    ringColor: "ring-blue-200",
    description: "Link your ad accounts",
  },
  {
    name: "Google Ads",
    color: "bg-rose-50",
    icon: GoogleLogo,
    textColor: "text-rose-700",
    ringColor: "ring-rose-200",
    description: "Import campaign data",
  },
  {
    name: "Google Analytics",
    color: "bg-yellow-50",
    icon: Ga4Logo,
    textColor: "text-yellow-700",
    ringColor: "ring-yellow-200",
    description: "Track website metrics",
  },
];

interface BrandSetupProps {
  newOpenModalVal: string;
}

export default function BrandSetup({ newOpenModalVal }: BrandSetupProps) {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<
    Record<string, string[]>
  >({});
  const fixedBrandName = useSelector(
    (state: RootState) => state.brandName.brandName
  );
  const [brandName, setBrandName] = useState<string>(
    fixedBrandName?.toString() || ""
  );
  const [googleAdsConnections, setGoogleAdsConnections] = useState<
    {
      clientId: string;
      managerId?: string;
    }[]
  >([]);
  const [ga4Id, setGa4Id] = useState<string>("");
  const [fbAdId, setFBAdId] = useState<string[]>([]);
  const [shop, setShop] = useState<string>("");
  const [shopifyAccessToken, setShopifyAccessToken] = useState("");
  const user = useSelector((state: RootState) => state.user.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const shopName = params.get("shop_name");

    if (accessToken && shopName) {
      setShopifyAccessToken(accessToken);
      setShop(shopName);
      setConnectedAccounts((prev) => ({
        ...prev,
        Shopify: [shopName],
      }));
    }
  }, []);

  const handleConnect = (
    platform: string,
    account: string,
    accountId: string,
    managerId?: string
  ) => {
    // Update connected accounts
    setConnectedAccounts((prev) => ({
      ...prev,
      [platform]: [...(prev[platform] || []), account],
    }));

    // Handle platform-specific connection logic
    if (platform.toLowerCase() === "google ads") {
      // Store comprehensive Google Ads connection details
      setGoogleAdsConnections((prev) => [
        ...prev,
        {
          clientId: accountId,
          managerId: managerId,
        },
      ]);
    } else if (platform.toLowerCase() === "google analytics") {
      setGa4Id(accountId);
    } else if (platform.toLowerCase() === "facebook") {
      setFBAdId((prev) => [...prev, accountId]);
    }

    toast({
      description: `Successfully connected ${account} to ${platform}`,
      variant: "default",
    });
  };

  const isConnected = (platform: string) => {
    return (connectedAccounts[platform]?.length || 0) > 0;
  };

  const getConnectedId = (platformName: string): string => {
    switch (platformName.toLowerCase()) {
      case "google ads":
        return googleAdsConnections.map((conn) => conn.clientId).join(",");
      case "google analytics":
        return ga4Id;
      case "facebook":
        return fbAdId.join(",");
      default:
        return "";
    }
  };

  const canSubmit = () => {
    return !!brandName && Object.keys(connectedAccounts).length > 0;
  };

  const handleSubmit = async () => {
    if (!brandName || Object.keys(connectedAccounts).length === 0) {
      return toast({
        description: "Please complete all fields before submitting.",
        variant: "destructive",
      });
    }

    const payload = {
      name: brandName,
      googleAdAccount: googleAdsConnections.map((connection) => ({
        clientId: connection.clientId,
        managerId: connection.managerId || "",
      })),
      ga4Account: { PropertyID: ga4Id || "" },
      fbAdAccounts: fbAdId.map((accountId) => accountId),
      shopifyAccount: {
        shopName: shop || "",
        shopifyAccessToken: shopifyAccessToken || "",
      },
    };

    try {
      // First create the brand
      const brandResponse = await axios.post(
        `${baseURL}/api/brands/add`,
        payload,
        { withCredentials: true }
      );

      const newBrandId = brandResponse.data.brand._id;

      // Then add the brand to user
      if (user) {
        await axios.post(
          `${baseURL}/api/users/add-brand`,
          {
            userId: user?.id,
            brandId: newBrandId,
          },
          { withCredentials: true }
        );
      }
      // Update local state
      const updatedUser = user
        ? {
            ...user,
            brands: [...user.brands, newBrandId],
          }
        : null;

      if (updatedUser) {
        console.log(updatedUser);
        dispatch(setUser(updatedUser));
        console.log("after updating the state", user);
        navigate("/dashboard");
      }

      toast({
        description: "Brand setup completed successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      toast({
        description: "Error creating brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (
      newOpenModalVal === "Google Ads" ||
      newOpenModalVal === "Google Analytics" ||
      newOpenModalVal === "Facebook"
    ) {
      setOpenModal(newOpenModalVal);
    }
  }, [newOpenModalVal]);

  // Setting brand name to redux store
  useEffect(() => {
    if (brandName.length <= 0) return;

    const fixNameHandler = setTimeout(() => {
      dispatch(setBrandNameFixed(brandName));
    }, 3000);

    // clear timeout if brandName changes withing delay.
    return () => clearTimeout(fixNameHandler);
  }, [brandName, dispatch]);

  return (
    <Card className="mx-auto max-w-7xl shadow-lg">
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Brand Setup</h2>
              <p className="text-gray-500">
                Enter your brand details and connect your platforms
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label
              htmlFor="brandName"
              className="text-sm font-medium text-gray-700"
            >
              Brand Name
            </Label>
            <Input
              id="brandName"
              placeholder="Enter your brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Platform Connections */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Connect Platforms
            </Label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {platforms.map((platform) => {
                return (
                  <Dialog
                    key={platform.name}
                    open={openModal === platform.name}
                    onOpenChange={(isOpen) => {
                      if (!isOpen) {
                        setOpenModal(null);
                        // removing platform value from url.
                        searchParams.delete("platform");
                        setSearchParams(searchParams, { replace: true });
                      } else {
                        setOpenModal(platform.name);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        className={`relative group p-6 rounded-xl ${platform.color} ring-1 ${platform.ringColor} transition-all duration-200 hover:scale-[1.02] w-full text-left`}
                      >
                        <div className="flex items-start gap-4">
                          <platform.icon width="2rem" height="2rem" />
                          <div className="flex-1">
                            <h3
                              className={`font-semibold ${platform.textColor}`}
                            >
                              {platform.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {platform.description}
                            </p>
                          </div>
                          {isConnected(platform.name) ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Connect to {platform.name}</DialogTitle>
                        <DialogDescription>
                          {platform.name === "Shopify"
                            ? "Enter your Shopify store name and login to connect."
                            : "Select an account to connect with your brand."}
                        </DialogDescription>
                      </DialogHeader>
                      {platform.name === "Shopify" ? (
                        <ShopifyModalContent />
                      ) : (
                        <OtherPlatformModalContent
                          platform={platform.name}
                          onConnect={handleConnect}
                          connectedId={getConnectedId(platform.name)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </div>

          {/* Connected Accounts Summary */}
          {Object.keys(connectedAccounts).length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium text-gray-900 mb-3">
                Connected Platforms
              </h3>
              <div className="space-y-2">
                {Object.entries(connectedAccounts).map(
                  ([platform, accounts]) => (
                    <div key={platform} className="flex justify-between">
                      <span className="text-gray-600">{platform}</span>
                      <span className="font-medium">{accounts.join(", ")}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full"
            disabled={!canSubmit()}
            onClick={handleSubmit}
          >
            Complete Setup
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
