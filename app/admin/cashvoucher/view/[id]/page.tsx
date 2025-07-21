"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import LoadingWrapper from "@/components/loading-wrapper"
import Image from "next/image"

interface Particular {
  id: string
  description: string
  amount: number
}

interface CashVoucher {
  id: string
  paid_to: string
  voucher_no: string
  date: string
  total_amount: number
  particulars: Particular[]
  received_by_name: string
  received_by_signature_url: string | null
  received_by_date: string
  approved_by_name: string
  approved_by_signature_url: string | null
  approved_by_date: string
  status: string
}

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function CashVoucherViewPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [voucher, setVoucher] = useState<CashVoucher | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get the Laravel API URL from environment variables
  const LARAVEL_API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (id) {
      const fetchVoucher = async () => {
        try {
          setIsLoading(true)
          const response = await fetch(`/api/cash-vouchers/${id}`)
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to fetch cash voucher")
          }
          const data: CashVoucher = await response.json()
          setVoucher(data)
        } catch (err: any) {
          setError(err.message)
          toast({
            title: "Error",
            description: `Failed to load cash voucher: ${err.message}`,
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }

      fetchVoucher()
    }
  }, [id, toast])

  if (isLoading) {
    return (
      <LoadingWrapper>
        <p>Loading cash voucher details...</p>
      </LoadingWrapper>
    )
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  if (!voucher) {
    return <div className="p-4 text-gray-500">Cash Voucher not found.</div>
  }

  const totalAmountInteger = Math.floor(Number.parseFloat(voucher.total_amount.toString()))
  const totalAmountDecimal = Number.parseFloat(voucher.total_amount.toString()).toFixed(2).split(".")[1]

  // Helper function to get full signature URL
  const getSignatureUrl = (relativePath: string | null) => {
    if (!relativePath) {
      return "/placeholder.svg" // Fallback to placeholder if no path
    }

    // If the path already starts with http/https, return as is (for backward compatibility)
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
      return relativePath
    }

    // If it's a relative path starting with /signatures/, construct the full URL
    if (relativePath.startsWith("/signatures/")) {
      if (!LARAVEL_API_URL) {
        return "/placeholder.svg" // Fallback if no API URL configured
      }
      // Remove trailing slash from API URL if present, and remove /api from the end if it exists
      let baseUrl = LARAVEL_API_URL.endsWith("/") ? LARAVEL_API_URL.slice(0, -1) : LARAVEL_API_URL
      // Remove /api from the end of the URL since signatures are served directly from public folder
      if (baseUrl.endsWith("/api")) {
        baseUrl = baseUrl.slice(0, -4)
      }
      return `${baseUrl}${relativePath}`
    }

    // For any other format, try to construct the URL
    if (LARAVEL_API_URL) {
      let baseUrl = LARAVEL_API_URL.endsWith("/") ? LARAVEL_API_URL.slice(0, -1) : LARAVEL_API_URL
      // Remove /api from the end of the URL since signatures are served directly from public folder
      if (baseUrl.endsWith("/api")) {
        baseUrl = baseUrl.slice(0, -4)
      }
      return `${baseUrl}/${relativePath}`
    }

    return "/placeholder.svg"
  }

  return (
    <div className="flex justify-center p-4 bg-gray-100 min-h-screen">
      <div
        className="bg-white p-6 border border-gray-300 text-black w-full max-w-3xl shadow-lg"
        style={{ fontFamily: "Arial, sans-serif", fontSize: "12px" }}
      >
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-shrink-0 mr-4">
            <Image
              src="/logo.png" // Using the provided image URL
              alt="ABIC Realty Logo"
              width={150}
              height={56}
              className="max-h-14 max-w-[150px] object-contain"
              crossOrigin="anonymous"
            />
          </div>
          <div className="flex-grow text-center pt-2">
            <h2 className="text-base font-bold underline uppercase">Cash Voucher</h2>
          </div>
          <div className="flex-shrink-0 text-right space-y-1 text-sm">
            <div className="flex items-center justify-end mt-16">
              <span className="font-semibold mr-2">Voucher No:</span>
              <span className="border-b border-black min-w-[120px] text-right px-1">{voucher.voucher_no || "N/A"}</span>
            </div>
            <div className="flex items-center justify-end">
              <span className="font-semibold mr-2">Date:</span>
              <span className="border-b border-black min-w-[120px] text-right px-1">
                {formatDate(voucher.date) || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Paid To Section */}
        <div className="flex items-center mb-4">
          <span className="font-semibold mr-2">Paid to:</span>
          <span className="border-b border-black w-[150px] min-h-[1.5rem] pb-1 text-sm">
            {voucher.paid_to || "N/A"}
          </span>
        </div>

        {/* Particulars Table */}
        <div className="border border-black mb-4">
          <div className="grid grid-cols-[70%_30%] border-b border-black bg-gray-100 h-8 items-center">
            <div className="border-r border-black flex items-center justify-center font-semibold uppercase text-sm">
              Particulars
            </div>
            <div className="flex items-center justify-center font-semibold uppercase text-sm">Amount</div>
          </div>
          <div className="grid grid-cols-[70%_30%] min-h-[200px] relative">
            <div className="absolute inset-y-0 left-[70%] w-px bg-black"></div> {/* Vertical separator */}
            <div className="p-2 text-sm flex flex-col">
              {voucher.particulars.length > 0 ? (
                voucher.particulars.map((p, index) => (
                  <div key={p.id || index} className="mb-1">
                    {p.description}
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No particulars listed.</div>
              )}
            </div>
            <div className="grid grid-cols-[1fr_auto] relative">
              <div className="absolute inset-y-0 right-[80px] w-px bg-black"></div>{" "}
              {/* Vertical separator for amount */}
              <div className="p-2 text-right text-sm flex flex-col h-full">
                {voucher.particulars.length > 0 ? (
                  voucher.particulars.map((p, index) => (
                    <div key={p.id || index} className="mb-1">
                      {Math.floor(Number.parseFloat(p.amount.toString()))}
                    </div>
                  ))
                ) : (
                  <>&nbsp;</>
                )}
              </div>
              <div className="w-[80px] p-2 text-sm flex flex-col h-full">
                {voucher.particulars.length > 0 ? (
                  voucher.particulars.map((p, index) => (
                    <div key={p.id || index} className="mb-1">
                      .{Number.parseFloat(p.amount.toString()).toFixed(2).split(".")[1]}
                    </div>
                  ))
                ) : (
                  <>&nbsp;</>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[70%_30%] border-t border-black bg-gray-100 h-8 items-center">
            <div className="border-r border-black flex items-center px-2 font-semibold text-sm">TOTAL P</div>
            <div className="grid grid-cols-[1fr_auto] relative">
              <div className="absolute inset-y-0 right-[80px] w-px bg-black"></div>
              <div className="flex items-center justify-end px-2 font-semibold text-sm">{totalAmountInteger}</div>
              <div className="w-[80px] flex items-center px-2 font-semibold text-sm">.{totalAmountDecimal}</div>
            </div>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="flex justify-between mt-6 text-sm">
          <div className="text-left flex-1 mr-4">
            <div className="mb-1 font-semibold">Received by:</div>
            <div className="mt-8">
              <div className="flex flex-col items-center text-center relative min-h-[40px]">
                {voucher.received_by_signature_url && (
                  <div className="absolute bottom-[calc(100%-8px)] left-1/2 -translate-x-1/2">
                    <Image
                      src={getSignatureUrl(voucher.received_by_signature_url) || "/placeholder.svg"}
                      alt="Received By Signature"
                      width={100}
                      height={50}
                      className="max-h-10 max-w-[100px] mx-auto object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <div className="min-h-[18px] flex items-end justify-center border-b border-black w-full">
                  <span className="pb-1">{voucher.received_by_name || "____________________"}</span>
                </div>
                <div className="pt-1 text-xs whitespace-nowrap">PRINTED NAME AND SIGNATURE</div>
              </div>
              <div className="flex flex-col items-center text-center w-full mt-4">
                <div className="min-h-[18px] flex items-end justify-center border-b border-black w-full">
                  <span className="pb-1">{formatDate(voucher.received_by_date) || "____________________"}</span>
                </div>
                <div className="pt-1 text-xs whitespace-nowrap">DATE</div>
              </div>
            </div>
          </div>
          <div className="text-left flex-1 ml-4">
            <div className="mb-1 font-semibold">Approved by:</div>
            <div className="mt-8">
              <div className="flex flex-col items-center text-center relative min-h-[40px]">
                {voucher.approved_by_signature_url && (
                  <div className="absolute bottom-[calc(100%-8px)] left-1/2 -translate-x-1/2">
                    <Image
                      src={getSignatureUrl(voucher.approved_by_signature_url) || "/placeholder.svg"}
                      alt="Approved By Signature"
                      width={100}
                      height={50}
                      className="max-h-10 max-w-[100px] mx-auto object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <div className="min-h-[18px] flex items-end justify-center border-b border-black w-full">
                  <span className="pb-1">{voucher.approved_by_name || "____________________"}</span>
                </div>
                <div className="pt-1 text-xs whitespace-nowrap">PRINTED NAME AND SIGNATURE</div>
              </div>
              <div className="flex flex-col items-center text-center w-full mt-4">
                <div className="min-h-[18px] flex items-end justify-center border-b border-black w-full">
                  <span className="pb-1">{formatDate(voucher.approved_by_date) || "____________________"}</span>
                </div>
                <div className="pt-1 text-xs whitespace-nowrap">DATE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
