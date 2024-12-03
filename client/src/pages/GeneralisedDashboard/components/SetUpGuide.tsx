import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, BarChart, Target, Facebook } from 'lucide-react'

const SetupGuide: React.FC = () => {
  const steps = [
    {
      title: 'Connect Shopify',
      icon: <ShoppingBag className="h-6 w-6 text-green-500" />,
      color: 'text-green-700',
      instructions: [
        "Enter your Shopify store name in the brand setup form",
        "Click on 'Connect Shopify' and log in to your Shopify account",
        "Authorize the app to access your store data"
      ]
    },
    {
      title: 'Connect Google Ads',
      icon: <Target className="h-6 w-6 text-yellow-500" />,
      color: 'text-yellow-700',
      instructions: [
        "Select your Google Ads account from the dropdown in the brand setup form",
        "If you don't see your account, click 'Login to Google Ads'",
        "Choose the Google account connected to your Google Ads",
        "Grant necessary permissions for data access"
      ]
    },
    {
      title: 'Connect Google Analytics 4',
      icon: <BarChart className="h-6 w-6 text-blue-500" />,
      color: 'text-blue-700',
      instructions: [
        "Select your GA4 property from the dropdown in the brand setup form",
        "If no properties are listed, click 'Login to Google Analytics'",
        "Choose the Google account associated with your GA4 property",
        "Select the appropriate GA4 property and grant access permissions"
      ]
    },
    {
      title: 'Connect Facebook Ads',
      icon: <Facebook className="h-6 w-6 text-indigo-500" />,
      color: 'text-indigo-700',
      instructions: [
        "Click on 'Connect Facebook Ads' in the brand setup form",
        "Log in to the Facebook account connected to your ad accounts",
        "Select the ad account(s) you want to connect",
        "Review and accept the requested permissions"
      ]
    },
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Setup Guide</CardTitle>
        <CardDescription>
          Follow these steps to connect your accounts and set up your brand
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-gray-100`}>{step.icon}</div>
                <h3 className={`text-base font-semibold ${step.color}`}>
                  Step {index + 1}: {step.title}
                </h3>
              </div>
              <ul className="list-disc list-inside pl-4 space-y-1">
                {step.instructions.map((instruction, i) => (
                  <li key={i} className="text-gray-600 text-sm">{instruction}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SetupGuide
