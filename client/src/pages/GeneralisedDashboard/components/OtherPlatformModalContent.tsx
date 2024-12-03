import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/context/UserContext'

interface OtherPlatformModalContentProps {
  platform: string
  onConnect: (platform: string, account: string) => void
}

interface GoogleAdsAccount {
  name: string
  clientId: string
}

interface GoogleAnalyticsAccount {
  name: string
  id: string
}

interface FacebookAdsAccount {
  name: string
  id: string
}

export default function OtherPlatformModalContent({ platform, onConnect }: OtherPlatformModalContentProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccount[]>([])
  const [googleAnalyticsAccounts, setGoogleAnalyticsAccounts] = useState<GoogleAnalyticsAccount[]>([])
  const [facebookAdsAccounts, setFacebookAdsAccounts] = useState<FacebookAdsAccount[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])
  const user = useUser()

  useEffect(() => {
    const fetchGoogleAdsAccounts = async () => {
      try {
        const userId = user.user?.id
        const response = await axios.post(
          'http://localhost:8000/api/setup/google-accounts',
          { userId },
          { withCredentials: true }
        )
        setGoogleAdsAccounts(
          response.data.clientAccounts.filter((account: any) => !account.hidden)
        )
      } catch (error) {
        console.error('Error fetching Google Ads accounts:', error)
      }
    }

    const fetchGoogleAnalyticsAccounts = async () => {
      try {
        const userId = user.user?.id
        const response = await axios.post(
          'http://localhost:8000/api/setup/ga4-propertyIds',
          { userId },
          { withCredentials: true }
        )
        setGoogleAnalyticsAccounts(response.data.accounts || [])
      } catch (error) {
        console.error('Error fetching Google Analytics accounts:', error)
      }
    }

    const fetchFacebookAdsAccounts = async () => {
      try {
        const userId = user.user?.id
        const response = await axios.post(
          'http://localhost:8000/api/setup/facebook-accounts',
          { userId },
          { withCredentials: true }
        )
        setFacebookAdsAccounts(response.data.accounts || [])
      } catch (error) {
        console.error('Error fetching Facebook Ads accounts:', error)
      }
    }

    if (platform.toLowerCase() === 'google ads') fetchGoogleAdsAccounts()
    if (platform.toLowerCase() === 'google analytics') fetchGoogleAnalyticsAccounts()
    if (platform.toLowerCase() === 'facebook ads') fetchFacebookAdsAccounts()
  }, [platform, user])

  const filteredAccounts = () => {
    switch (platform.toLowerCase()) {
      case 'google ads':
        return googleAdsAccounts.filter((account) =>
          account.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      case 'google analytics':
        return googleAnalyticsAccounts.filter((account) =>
          account.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      case 'facebook ads':
        return facebookAdsAccounts.filter((account) =>
          account.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      default:
        return []
    }
  }

  const handleConnect = (account: GoogleAdsAccount | GoogleAnalyticsAccount | FacebookAdsAccount) => {
    const displayName = 'clientId' in account 
      ? `${account.name} (${(account as GoogleAdsAccount).clientId})`
      : `${account.name} (${(account as GoogleAnalyticsAccount | FacebookAdsAccount).id})`

    onConnect(platform, displayName)
    setConnectedAccounts((prev) =>
      'clientId' in account
        ? [...prev, account.clientId]
        : [...prev, account.id]
    )
  }

  return (
    <div className="mt-4 space-y-4  max-h-[60vh] overflow-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search accounts..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredAccounts().map((account) => (
        <div
          key={
            platform.toLowerCase() === 'google ads'
              ? (account as GoogleAdsAccount).clientId
              : (account as GoogleAnalyticsAccount | FacebookAdsAccount).id
          }
          className="flex items-center justify-between p-2 bg-gray-100 rounded"
        >
          <span>
            {platform.toLowerCase() === 'google ads'
              ? `${(account as GoogleAdsAccount).name} (${(account as GoogleAdsAccount).clientId})`
              : `${(account as GoogleAnalyticsAccount | FacebookAdsAccount).name} (${(account as GoogleAnalyticsAccount | FacebookAdsAccount).id})`}
          </span>
          <Button
            size="sm"
            onClick={() => handleConnect(account)}
            disabled={
              platform.toLowerCase() === 'google ads'
                ? connectedAccounts.includes((account as GoogleAdsAccount).clientId)
                : connectedAccounts.includes((account as GoogleAnalyticsAccount | FacebookAdsAccount).id)
            }
          >
            {connectedAccounts.includes(
              platform.toLowerCase() === 'google ads'
                ? (account as GoogleAdsAccount).clientId
                : (account as GoogleAnalyticsAccount | FacebookAdsAccount).id
            ) ? (
              <Check className="h-4 w-4 mr-2" />
            ) : null}
            {connectedAccounts.includes(
              platform.toLowerCase() === 'google ads'
                ? (account as GoogleAdsAccount).clientId
                : (account as GoogleAnalyticsAccount | FacebookAdsAccount).id
            )
              ? 'Connected'
              : 'Connect'}
          </Button>
        </div>
      ))}
    </div>
  )
}
