"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import LoadingWrapper from "@/components/loading-wrapper"

interface CashVoucher {
  id: string
  paid_to: string
  voucher_no: string
  date: string
  total_amount: number
  check_no: string
  account_name: string
  account_number: string
  bank_amount: number
  status: string
}

interface PaginatedResponse {
  data: CashVoucher[]
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number
  to: number
}

export default function CashVoucherPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState<CashVoucher[]>([])
  const [pagination, setPagination] = useState<Omit<PaginatedResponse, "data"> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchVouchers = async (page = 1) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/cash-vouchers?page=${page}&per_page=10`)
      if (!response.ok) {
        throw new Error("Failed to fetch cash vouchers")
      }
      const data: PaginatedResponse = await response.json()

      // Handle paginated response structure
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid data format: Expected paginated response with data array")
      }

      setVouchers(data.data)
      setPagination({
        current_page: data.current_page,
        per_page: data.per_page,
        total: data.total,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
      })
      setCurrentPage(data.current_page)
    } catch (error: any) {
      console.error("Error fetching cash vouchers:", error)
      toast({
        title: "Error",
        description: `Failed to load vouchers: ${error.message || "An unexpected error occurred."}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVouchers(currentPage)
  }, [])

  const handleView = (id: string) => {
    router.push(`/admin/cashvoucher/view/${id}`)
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/cashvoucher/edit/${id}`)
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this voucher? This will update its status to 'cancelled'.")) {
      return
    }

    try {
      const response = await fetch(`/api/cash-vouchers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to cancel cash voucher")
      }

      toast({
        title: "Success",
        description: "Cash voucher status updated to 'cancelled'.",
      })

      fetchVouchers(currentPage) // Re-fetch vouchers to show updated status
    } catch (error: any) {
      console.error("Error cancelling cash voucher:", error)
      toast({
        title: "Error",
        description: `Failed to cancel voucher: ${error.message || "An unexpected error occurred."}`,
        variant: "destructive",
      })
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchVouchers(page)
  }

  if (isLoading) {
    return (
      <LoadingWrapper>
        <p>Loading cash vouchers...</p>
      </LoadingWrapper>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Cash Vouchers</h1>
        {/* <Button onClick={() => router.push("/admin/cashvoucher/new")}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Voucher
        </Button> */}
      </div>

      {vouchers.length === 0 ? (
        <p className="text-center text-gray-500">No cash vouchers found.</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Paid To</TableHead>
               
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.voucher_no}</TableCell>
                    <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                    <TableCell>{voucher.paid_to}</TableCell>
        
                  
                    <TableCell className="text-right">
                      ₱
                      {Number(voucher.total_amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="capitalize">{voucher.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleView(voucher.id)}>
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="sr-only">View</span>
                        </Button>
                        {/* <Button variant="outline" size="icon" onClick={() => handleEdit(voucher.id)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button> */}
                        <Button variant="outline" size="icon" onClick={() => handleCancel(voucher.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                          <span className="sr-only">Cancel</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {pagination.from} to {pagination.to} of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.last_page}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
