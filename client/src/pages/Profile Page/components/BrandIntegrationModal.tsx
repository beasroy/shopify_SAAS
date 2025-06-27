import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, PlusCircle, CheckCircle, XCircle } from "lucide-react"
import { FullBrandData } from "@/interfaces"
import PlatformModal from "@/components/dashboard_component/PlatformModal"


interface PlatformIcon {
    icon: React.ElementType;
    name: string;
}

interface BrandIntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    brandId: string;
    brandName: string;
    brandData: FullBrandData;
    platformIcons: {
        shopify: PlatformIcon;
        googleAds: PlatformIcon;
        googleAnalytics: PlatformIcon;
        facebook: PlatformIcon;
    };
}

export function BrandIntegrationModal({ 
    isOpen, 
    onClose, 
    brandId, 
    brandName, 
    brandData, 
    platformIcons 
}: BrandIntegrationModalProps) {
    const [activeTab, setActiveTab] = useState("overview")
    const [platformModalOpen, setPlatformModalOpen] = useState(false)
    const [selectedPlatform, setSelectedPlatform] = useState("")
    const platforms = [
        {
            key: "shopify",
            icon: platformIcons.shopify.icon,
            name: platformIcons.shopify.name,
            isConnected: !!brandData.shopifyAccount,
            accountNumber: '1 Store',
            accountName: brandData.shopifyAccount?.shopName,
            data: brandData.shopifyAccount,
            allowMultipleAccounts: false
        },
        {
            key: "googleAds",
            icon: platformIcons.googleAds.icon,
            name: platformIcons.googleAds.name,
            isConnected: brandData.googleAdAccount && brandData.googleAdAccount.length > 0,
            accountNumber: brandData.googleAdAccount ? `${brandData.googleAdAccount.length} Account(s)` : undefined,
            accountName: brandData.googleAdAccount && brandData.googleAdAccount.length > 0
            ? `${brandData.googleAdAccount.map((acc) => acc.clientId).join(", ")}` 
            : undefined,
            data: brandData.googleAdAccount,
            allowMultipleAccounts: true
        },
        {
            key: "googleAnalytics",
            icon: platformIcons.googleAnalytics.icon,
            name: platformIcons.googleAnalytics.name,
            isConnected: !!brandData.ga4Account?.PropertyID,
            accountNumber: '1 Property',
            accountName: brandData.ga4Account?.PropertyID ? `Property ${brandData.ga4Account.PropertyID}` : undefined,
            data: brandData.ga4Account,
            allowMultipleAccounts: false
        },
        {
            key: "facebook",
            icon: platformIcons.facebook.icon,
            name: platformIcons.facebook.name,
            isConnected: brandData.fbAdAccounts && brandData.fbAdAccounts.length > 0,
            accountNumber: brandData.fbAdAccounts ? `${brandData.fbAdAccounts.length} Account(s)` : undefined,
            accountName: brandData.fbAdAccounts && brandData.fbAdAccounts.length > 0
            ? `${brandData.fbAdAccounts.join(", ")}` 
            : undefined,
            data: brandData.fbAdAccounts,
            allowMultipleAccounts: true
        }
    ]
    useEffect(()=>{
        console.log(brandId);
    },[])
    
    const handleAddAccount = (platformKey: string) => {
        setSelectedPlatform(platformKey)
        setPlatformModalOpen(true)
    }
    
    const handlePlatformModalSuccess = (platform: string, accountName: string, accountId: string) => {
        // Refresh the brand data or update the UI as needed
        console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`)
        // You might want to trigger a refresh of the brand data here
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[100vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-teal-600" />
                        </div>
                        <DialogTitle className="text-xl">{brandName}</DialogTitle>
                    </div>
                    <DialogDescription>Manage platform integrations for this brand</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-2">
                    <TabsList className="grid grid-cols-5 mb-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="shopify">Shopify</TabsTrigger>
                        <TabsTrigger value="googleAds">Google Ads</TabsTrigger>
                        <TabsTrigger value="googleAnalytics">Analytics</TabsTrigger>
                        <TabsTrigger value="facebook">Facebook</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {platforms.map((platform) => (
                                <div key={platform.key} className="border rounded-lg p-4 bg-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <platform.icon className="h-4 w-4 text-slate-700" />
                                            </div>
                                            <h3 className="font-medium">{platform.name}</h3>
                                        </div>
                                        <Badge
                                            className={platform.isConnected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}
                                        >
                                            {platform.isConnected ? "Connected" : "Not Connected"}
                                        </Badge>
                                    </div>

                                    <div className="text-sm text-slate-600 space-y-2">
                                        {platform.isConnected ? (
                                            <>
                                                {platform.accountNumber && (
                                                    <div className="flex justify-between">
                                                        <span>Account(s):</span>
                                                        <span className="font-medium">{platform.accountNumber}</span>
                                                    </div>
                                                )}
                                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setActiveTab(platform.key)}>
                                                    View Details
                                                </Button>
                                            </>
                                        ) : (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="w-full"
                                                onClick={() => handleAddAccount(platform.key)}
                                            >
                                                <PlusCircle className="h-4 w-4 mr-2" />
                                                Add {platform.key === 'shopify' ? 'Store' : 'Account'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {platforms.map((platform) => (
                        <TabsContent key={platform.key} value={platform.key} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <platform.icon className="h-5 w-5 text-slate-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg">{platform.name}</h3>
                                        <span className="text-sm text-slate-500">
                                            {platform.isConnected ? `Connected to ${platform.accountName}` : "Not connected"}
                                        </span>
                                    </div>
                                </div>
                                <Badge className={platform.isConnected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                                    {platform.isConnected ? "Active" : "Inactive"}
                                </Badge>
                            </div>

                            <div className="border rounded-lg p-5 bg-slate-50">
                                <h4 className="font-medium mb-3">Connection Details</h4>

                                {platform.isConnected ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <p className="text-slate-500">Account Name</p>
                                                <p className="font-medium">{platform.accountName || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-slate-500">Status</p>
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>Connected</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-4 justify-end">
                                        {platform.allowMultipleAccounts && ( <Button size={"sm"} onClick={() => handleAddAccount(platform.key)}>
                                            <PlusCircle className="h-4 w-4 mr-1" />
                                            Add {platform.key === 'shopify' ? 'Store' : 'Account'}
                                        </Button>)}
                                            <Button variant="destructive" size="sm" className="text-white hover:bg-red-800">
                                                Disconnect
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <XCircle className="h-5 w-5" />
                                            <span>Not connected</span>
                                        </div>

                                        <div className="bg-white p-4 rounded border text-sm">
                                            <h5 className="font-medium mb-2">Why connect {platform.name}?</h5>
                                            <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                                <li>Get comprehensive analytics across all your marketing channels</li>
                                                <li>Track performance metrics in one dashboard</li>
                                                <li>Generate insights from combined data sources</li>
                                            </ul>
                                        </div>

                                        <Button className="mt-2" onClick={() => handleAddAccount(platform.key)}>
                                            <PlusCircle className="h-4 w-4 mr-2" />
                                            Add {platform.key === 'shopify' ? 'Store' : 'Account'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
            
            {/* Platform Modal for adding accounts */}
            {selectedPlatform && (
                <PlatformModal
                    platform={selectedPlatform === 'googleAds' ? 'Google Ads' : 
                              selectedPlatform === 'googleAnalytics' ? 'Google Analytics' : 
                              selectedPlatform === 'facebook' ? 'Facebook' : 'Shopify'}
                    open={platformModalOpen}
                    onOpenChange={setPlatformModalOpen}
                    brandId={brandId}
                    onSuccess={handlePlatformModalSuccess}
                />
            )}
        </Dialog>
    )
}