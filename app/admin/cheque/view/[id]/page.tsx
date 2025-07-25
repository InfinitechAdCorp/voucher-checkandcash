"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import LoadingWrapper from "@/components/loading-wrapper"
import Image from "next/image"

interface ChequeVoucher {
  id: string
  paid_to: string
  voucher_no: string
  date: string
  amount: number
  purpose: string
  check_no: string // Not displayed in this layout, but kept in interface
  account_name: string // Not displayed in this layout, but kept in interface
  account_number: string // Not displayed in this layout, but kept in interface
  bank_amount: number // Not displayed in this layout, but kept in interface
  received_by_name: string
  received_by_signature_url: string | null
  received_by_date: string
  approved_by_name: string
  approved_by_signature_url: string | null
  approved_by_date: string
  status: string // Not displayed in this layout, but kept in interface
}

const formatDate = (dateString: string) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function ChequeVoucherViewPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [voucher, setVoucher] = useState<ChequeVoucher | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get the Laravel API URL from environment variables
  const LARAVEL_API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (id) {
      const fetchVoucher = async () => {
        try {
          setIsLoading(true)
          const response = await fetch(`/api/cheque-vouchers/${id}`)
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to fetch cheque voucher")
          }
          const data: ChequeVoucher = await response.json()
          setVoucher(data)
        } catch (err: any) {
          setError(err.message)
          toast({
            title: "Error",
            description: `Failed to load cheque voucher: ${err.message}`,
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
        <p>Loading cheque voucher details...</p>
      </LoadingWrapper>
    )
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  if (!voucher) {
    return <div className="p-4 text-gray-500">Cheque Voucher not found.</div>
  }

  const amountParts = Number.parseFloat(voucher.amount.toString()).toFixed(2).split(".")
  const wholeAmount = amountParts[0]
  const decimalAmount = amountParts[1]

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
      // Remove trailing slash from API URL if present
      const baseUrl = LARAVEL_API_URL.endsWith("/") ? LARAVEL_API_URL.slice(0, -1) : LARAVEL_API_URL
      return `${baseUrl}${relativePath}`
    }
    // For any other format, try to construct the URL
    if (LARAVEL_API_URL) {
      const baseUrl = LARAVEL_API_URL.endsWith("/") ? LARAVEL_API_URL.slice(0, -1) : LARAVEL_API_URL
      return `${baseUrl}/${relativePath}`
    }
    return "/placeholder.svg"
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-end items-center mb-4">
        <Button onClick={() => router.back()}>Back to List</Button>
      </div>
      <div className="border border-gray-300 p-6 rounded-lg shadow-sm bg-white max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
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
          <div className="flex-grow text-center">
            <h1 className="text-xl font-bold underline mt-6 mr-32">CHEQUE VOUCHER</h1>
          </div>
        </div>
        <div className="mb-6 flex justify-between items-start">
          {/* Left side: Paid to */}
          <div className="flex items-center">
            <p className=" mr-2 mt-6">Paid to:</p>
            <p className="w-64 border-b border-black text-lg mt-2">{voucher.paid_to}</p>
          </div>
          {/* Right side: Voucher No and Date */}
          <div className="text-right text-sm">
            <p className="mb-1">
              Voucher No: <span className="font-semibold border-b border-black px-2">{voucher.voucher_no}</span>
            </p>
            <p>
              <span className="mr-2">Date:</span>
              <span className="font-semibold border-b border-black px-4">
                {new Date(voucher.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "2-digit",
                })}
              </span>
            </p>
          </div>
        </div>
        {/* Particulars and Amount Table */}
        <div className="border border-black mb-6">
          {/* Header Row */}
          <div className="flex border-b border-black">
            <div className="flex-1 border-r border-black p-2 text-left font-bold bg-gray-100">PARTICULARS</div>
            <div className="w-[250px] border-black p-2 text-left font-bold bg-gray-100">AMOUNT</div>
          </div>

          {/* Content Row */}
          <div className="flex min-h-[160px]">
            {/* Particulars Column */}
            <div className="flex-1 border-r border-black p-2 align-top">{voucher.purpose}</div>

            {/* Amount Column */}
            <div className="w-[250px] flex">
              {/* Integer Part */}
              <div className="flex-1 border-r border-black p-2 text-right text-sm">
                <div className="mb-1">₱{Math.floor(Number.parseFloat(voucher.amount.toString()))}</div>
              </div>
              {/* Decimal Part */}
              <div className="w-[60px] p-2 text-left text-sm">
                <div className="mb-1">.{Number.parseFloat(voucher.amount.toString()).toFixed(2).split(".")[1]}</div>
              </div>
            </div>
          </div>

          {/* Total Row */}
          <div className="flex">
            <div className="flex-1 border-r border-black p-2 text-right font-bold">TOTAL</div>
            <div className="w-[250px] flex">
              {/* Integer Part */}
              <div className="flex-1 border-r border-black p-2 text-start text-sm font-bold">
                ₱{Math.floor(Number.parseFloat(voucher.amount.toString()))}
              </div>
              {/* Decimal Part */}
              <div className="w-[60px] p-2 text-left text-sm font-bold">
                .{Number.parseFloat(voucher.amount.toString()).toFixed(2).split(".")[1]}
              </div>
            </div>
          </div>
        </div>
        {/* Signatures Section */}
        <div className="flex justify-between mt-8 text-sm">
          <div className="flex-1 mr-8">
            <div className="mb-4 font-semibold">Received by:</div>
            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                {voucher.received_by_signature_url && (
                  <div className="mb-2 flex justify-center">
                    <Image
                      src={getSignatureUrl(voucher.received_by_signature_url) || "/placeholder.svg"}
                      alt="Received By Signature"
                      width={120}
                      height={60}
                      className="max-h-12 max-w-[120px] object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <div className="border-b border-black min-h-[20px] mb-1 text-center pb-1">
                  {voucher.received_by_name || ""}
                </div>
                <div className="text-xs text-center uppercase">PRINTED NAME AND SIGNATURE</div>
              </div>
              <div className="w-32">
                <div className="border-b border-black min-h-[20px] mb-1 text-center pb-1 mt-14">
                  {formatDate(voucher.received_by_date) || ""}
                </div>
                <div className="text-xs text-center uppercase">DATE</div>
              </div>
            </div>
          </div>
          <div className="flex-1 ml-8">
            <div className="mb-4 font-semibold">Approved by:</div>
            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                {voucher.approved_by_signature_url && (
                  <div className="mb-2 flex justify-center">
                    <Image
                      src={getSignatureUrl(voucher.approved_by_signature_url) || "/placeholder.svg"}
                      alt="Approved By Signature"
                      width={120}
                      height={60}
                      className="max-h-12 max-w-[120px] object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <div className="border-b border-black min-h-[20px] mb-1 text-center pb-1">
                  {voucher.approved_by_name || ""}
                </div>
                <div className="text-xs text-center uppercase">PRINTED NAME AND SIGNATURE</div>
              </div>
              <div className="w-32">
                <div className="border-b border-black min-h-[20px] mb-1 text-center pb-1 mt-14">
                  {formatDate(voucher.approved_by_date) || ""}
                </div>
                <div className="text-xs text-center uppercase">DATE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
