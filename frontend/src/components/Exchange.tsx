import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ArrowUpDown, User, X, Copy } from 'lucide-react'

// Token icon component - placeholder for actual token images
function TokenIcon({ token }: { token: string }) {
  const getTokenColor = (token: string) => {
    const colors: Record<string, string> = {
      ETH: 'bg-blue-500',
      BTC: 'bg-orange-500',
      USDC: 'bg-blue-400',
    }
    return colors[ token ] || 'bg-purple-500'
  }

  return (
    <div
      className={`w-12 h-12 ${getTokenColor(token)} rounded-full flex items-center justify-center text-white font-bold text-sm`}
    >
      {token.slice(0, 2)}
    </div>
  )
}

// Mock offers data
const mockOffers = [
  {
    id: 1,
    user: '0x1234...5678',
    token: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000001',
    amount: '1.5',
    price: '$1,200',
    usdAmount: '$1,800',
    type: 'Buy',
  },
  {
    id: 2,
    user: '0xabcd...efgh',
    token: 'USDC',
    tokenAddress: '0x0000000000000000000000000000000000000002',
    amount: '1000',
    price: '$1.00',
    usdAmount: '$1,000',
    type: 'Sell',
  },
  {
    id: 3,
    user: '0x9876...5432',
    token: 'BTC',
    tokenAddress: '0x0000000000000000000000000000000000000003',
    amount: '0.1',
    price: '$45,000',
    usdAmount: '$4,500',
    type: 'Buy',
  },
  {
    id: 4,
    user: '0xfedc...ba98',
    token: 'ETH',
    tokenAddress: '0x0000000000000000000000000000000000000001',
    amount: '2.0',
    price: '$1,250',
    usdAmount: '$2,500',
    type: 'Sell',
  },
  {
    id: 5,
    user: '0x1111...2222',
    token: 'USDC',
    tokenAddress: '0x0000000000000000000000000000000000000002',
    amount: '500',
    price: '$1.00',
    usdAmount: '$500',
    type: 'Buy',
  },
  {
    id: 6,
    user: '0x3333...4444',
    token: 'BTC',
    tokenAddress: '0x0000000000000000000000000000000000000003',
    amount: '0.05',
    price: '$45,000',
    usdAmount: '$2,250',
    type: 'Sell',
  },
]

export default function Exchange() {
  const { isConnected } = useAccount()
  const [ activeTab, setActiveTab ] = useState<'Buy' | 'Sell'>('Buy')
  const [ selectedOffer, setSelectedOffer ] = useState<(typeof mockOffers)[ number ] | null>(null)

  const buyOffers = mockOffers.filter((offer) => offer.type === 'Buy')
  const sellOffers = mockOffers.filter((offer) => offer.type === 'Sell')
  const displayedOffers = activeTab === 'Buy' ? buyOffers : sellOffers

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // ignore copy errors for now
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ArrowUpDown className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold">Exchange</h1>
        </div>

        {isConnected ? (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => setActiveTab('Buy')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${activeTab === 'Buy'
                  ? 'bg-green-500/20 text-green-500'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                Buy ({buyOffers.length})
              </button>
              <button
                onClick={() => setActiveTab('Sell')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${activeTab === 'Sell'
                  ? 'bg-red-500/20 text-red-500'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                Sell ({sellOffers.length})
              </button>
            </div>

            {/* Offers List */}
            <div className="space-y-4">
              {displayedOffers.length > 0 ? (
                displayedOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <TokenIcon token={offer.token} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold">
                              {offer.amount} {offer.token} | {offer.usdAmount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <User className="w-4 h-4" />
                            <span>{offer.user}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Price</p>
                        <p className="text-lg font-semibold">{offer.price}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                        Accept Offer
                      </button>
                      <button
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                        onClick={() => setSelectedOffer(offer)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
                  <p className="text-gray-400">
                    No {activeTab.toLowerCase()} offers available
                  </p>
                </div>
              )}
            </div>
            {selectedOffer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Offer details</h2>
                    <button
                      className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                      onClick={() => setSelectedOffer(null)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Wallet address</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono break-all text-xs flex-1">{selectedOffer.user}</span>
                        <button
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded-md text-gray-200 transition-colors"
                          onClick={() => handleCopy(selectedOffer.user)}
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Token</p>
                      <p className="font-medium">{selectedOffer.token}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Token address</p>
                      <p className="font-mono break-all text-xs">{selectedOffer.tokenAddress}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 mb-1">Amount</p>
                        <p className="font-medium">
                          {selectedOffer.amount} {selectedOffer.token}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">USD value</p>
                        <p className="font-medium">{selectedOffer.usdAmount}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 mb-1">Price</p>
                        <p className="font-medium">{selectedOffer.price}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Side</p>
                        <p className="font-medium">{selectedOffer.type}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    className="mt-6 w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 font-semibold text-white transition-colors"
                    onClick={() => setSelectedOffer(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
            <ArrowUpDown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              Connect your wallet to view offers
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

