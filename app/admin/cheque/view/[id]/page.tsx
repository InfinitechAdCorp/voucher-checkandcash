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
          <div className="flex items-center">
            <Image src="/logo.png" alt="ABIC Realty Logo" width={60} height={60} className="mr-2" />
            <div className="text-sm">
              <p className="font-bold">ABIC Realty</p>
              <p>&amp; Consultancy Corporation</p>
            </div>
          </div>
          <div className="flex-grow text-center">
            <h1 className="text-xl font-bold underline">CHEQUE VOUCHER</h1>
          </div>
          <div className="text-right text-sm">
            <p className="mb-1">
              Voucher No: <span className="font-semibold border-b border-black px-2">{voucher.voucher_no}</span>
            </p>
            <p>
              Date:{" "}
              <span className="font-semibold border-b border-black px-2">
                {new Date(voucher.date).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>

        {/* Paid To Section */}
        <div className="mb-6 flex items-center">
          <p className="font-semibold mr-2">Paid to:</p>
          <p className="flex-grow border-b border-black text-lg font-medium">{voucher.paid_to}</p>
        </div>

        {/* Particulars and Amount Table */}
        <div className="border border-black mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left w-3/4">PARTICULARS</th>
                <th className="border border-black p-2 text-left w-1/4">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-40 align-top">
                <td className="border border-black p-2">{voucher.purpose}</td>
                <td className="border border-black p-2 text-right align-top">
                  <div className="flex justify-end items-center h-full">
                    <span className="mr-1">₱</span>
                    <span className="font-semibold">{wholeAmount}</span>
                    <span className="ml-1">.{decimalAmount}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 text-right font-bold">TOTAL ₱</td>
                <td className="border border-black p-2 text-right font-bold">
                  <div className="flex justify-end items-center">
                    <span className="mr-1">₱</span>
                    <span>{wholeAmount}</span>
                    <span className="ml-1">.{decimalAmount}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures Section */}
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div>
            <p className="font-semibold mb-4">Received by:</p>
            <div className="flex flex-col items-center mb-4">
              {voucher.received_by_signature_url ? (
                <Image
                  src={getSignatureUrl(voucher.received_by_signature_url) || "/placeholder.svg"}
                  alt="Received By Signature"
                  width={150}
                  height={80}
                  className="border border-gray-300 mb-2"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-[150px] h-[80px] border border-gray-300 flex items-center justify-center text-gray-400 text-xs mb-2">
                  No Signature
                </div>
              )}
              <p className="border-b border-black w-full text-center py-1 text-sm font-medium">
                {voucher.received_by_name}
              </p>
              <p className="text-xs mt-1">PRINTED NAME AND SIGNATURE</p>
            </div>
            <div className="flex justify-center">
              <p className="border-b border-black w-2/3 text-center py-1 text-sm font-medium">
                {new Date(voucher.received_by_date).toLocaleDateString()}
              </p>
              <p className="text-xs ml-2 mt-1">DATE</p>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-4">Approved by:</p>
            <div className="flex flex-col items-center mb-4">
              {voucher.approved_by_signature_url ? (
                <Image
                  src={getSignatureUrl(voucher.approved_by_signature_url) || "/placeholder.svg"}
                  alt="Approved By Signature"
                  width={150}
                  height={80}
                  className="border border-gray-300 mb-2"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-[150px] h-[80px] border border-gray-300 flex items-center justify-center text-gray-400 text-xs mb-2">
                  No Signature
                </div>
              )}
              <p className="border-b border-black w-full text-center py-1 text-sm font-medium">
                {voucher.approved_by_name}
              </p>
              <p className="text-xs mt-1">PRINTED NAME AND SIGNATURE</p>
            </div>
            <div className="flex justify-center">
              <p className="border-b border-black w-2/3 text-center py-1 text-sm font-medium">
                {new Date(voucher.approved_by_date).toLocaleDateString()}
              </p>
              <p className="text-xs ml-2 mt-1">DATE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
