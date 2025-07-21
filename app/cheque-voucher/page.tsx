"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Download, Upload, X } from "lucide-react"
import domtoimage from "dom-to-image"
import { useToast } from "@/hooks/use-toast" // Import useToast

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

export default function ChequeVoucher() {
  const { toast } = useToast() // Initialize useToast
  const [formData, setFormData] = useState({
    paidTo: "",
    voucherNo: "", // Will be fetched from backend
    date: "",
    logo: "/logo.png", // Using placeholder.svg
    amount: "",
    purpose: "",
    checkNo: "",
    accountName: "",
    accountNumber: "",
    bankAmount: "",
  })
  const [receivedBy, setReceivedBy] = useState<{
    name: string
    signature: File | null
    signatureUrl: string // This will be a blob URL for preview, then updated with public URL from backend
    date: string
  }>({
    name: "",
    signature: null,
    signatureUrl: "",
    date: "",
  })
  const [approvedBy, setApprovedBy] = useState<{
    name: string
    signature: File | null
    signatureUrl: string // This will be a blob URL for preview, then updated with public URL from backend
    date: string
  }>({
    name: "",
    signature: null,
    signatureUrl: "",
    date: "",
  })
  const [isLoading, setIsLoading] = useState(false) // New loading state
  const [isSaving, setIsSaving] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Fetch next voucher number on component mount
  useEffect(() => {
    const fetchNextVoucherNumber = async () => {
      try {
        const response = await fetch("/api/check/voucher-next-no")
        if (!response.ok) {
          throw new Error("Failed to fetch next voucher number")
        }
        const data = await response.json()
        setFormData((prev) => ({ ...prev, voucherNo: data.nextVoucherNo }))
      } catch (error) {
        console.error("Error fetching next voucher number:", error)
        toast({
          title: "Error",
          description: "Failed to load next voucher number. Please try again.",
          variant: "destructive",
        })
      }
    }
    fetchNextVoucherNumber()
  }, [])

  const handleSignatureUpload = (file: File, type: "received" | "approved") => {
    const url = URL.createObjectURL(file) // Create blob URL for immediate preview
    if (type === "received") {
      setReceivedBy({ ...receivedBy, signature: file, signatureUrl: url })
    } else {
      setApprovedBy({ ...approvedBy, signature: file, signatureUrl: url })
    }
  }

  const removeSignature = (type: "received" | "approved") => {
    if (type === "received") {
      if (receivedBy.signatureUrl && receivedBy.signatureUrl.startsWith("blob:")) {
        URL.revokeObjectURL(receivedBy.signatureUrl) // Clean up blob URL
      }
      setReceivedBy({ ...receivedBy, signature: null, signatureUrl: "" })
    } else {
      if (approvedBy.signatureUrl && approvedBy.signatureUrl.startsWith("blob:")) {
        URL.revokeObjectURL(approvedBy.signatureUrl) // Clean up blob URL
      }
      setApprovedBy({ ...approvedBy, signature: null, signatureUrl: "" })
    }
  }

  const exportAsImage = async () => {
    if (!previewRef.current) return
    try {
      setIsSaving(true)
      const node = previewRef.current
      // Wait for images (e.g., logos, signatures) to load
      const images = Array.from(node.querySelectorAll("img"))
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise((res) => {
            img.onload = img.onerror = res
          })
        }),
      )
      // Generate PNG from node, using the current dimensions
      const originalWidth = node.style.width
      const originalMaxWidth = node.style.maxWidth
      node.style.width = "1000px" // Set your desired export width here
      node.style.maxWidth = "1000px" // Ensure it doesn't exceed this width
      const dataUrl = await (domtoimage as any).toPng(node, {
        bgcolor: "#ffffff", // Force white background
        width: 1000, // Use the fixed width for export
        height: node.offsetHeight, // Capture the height after width adjustment
        style: {
          backgroundColor: "#ffffff",
          boxSizing: "border-box",
        },
      })
      node.style.width = originalWidth
      node.style.maxWidth = originalMaxWidth
      // Download
      const link = document.createElement("a")
      link.download = `cheque-voucher-${formData.voucherNo || "untitled"}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export voucher image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true) // Set loading to true
    try {
      const payload = new FormData()
      // Append all form data fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "logo") {
          // Don't send placeholder logo
          payload.append(key, value)
        }
      })
      // Append receivedBy fields
      payload.append("receivedBy[name]", receivedBy.name)
      payload.append("receivedBy[date]", receivedBy.date)
      if (receivedBy.signature) {
        payload.append("receivedBy[signature]", receivedBy.signature)
      }
      // Append approvedBy fields
      payload.append("approvedBy[name]", approvedBy.name)
      payload.append("approvedBy[date]", approvedBy.date)
      if (approvedBy.signature) {
        payload.append("approvedBy[signature]", approvedBy.signature)
      }

      const response = await fetch("/api/check", {
        method: "POST",
        body: payload, // Send FormData directly
        // No 'Content-Type' header needed for FormData, browser sets it automatically
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(JSON.stringify(errorData))
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: "Voucher saved successfully!",
      })
      console.log("Voucher saved:", result)

      // Update signature URLs with the public URLs returned from Laravel
      setReceivedBy((prev) => ({
        ...prev,
        signatureUrl: result.voucher.received_by_signature_url || "",
        signature: null, // Clear the File object after successful upload
      }))
      setApprovedBy((prev) => ({
        ...prev,
        signatureUrl: result.voucher.approved_by_signature_url || "",
        signature: null, // Clear the File object after successful upload
      }))

      // Reset all form fields and signatures for a new entry
      setFormData((prev) => ({
        ...prev,
        paidTo: "",
        date: "", // Reset date field
        amount: "",
        purpose: "",
        checkNo: "",
        accountName: "",
        accountNumber: "",
        bankAmount: "",
      }))
      removeSignature("received") // Clear received signature and URL
      setReceivedBy((prev) => ({ ...prev, name: "", date: "" })) // Reset receivedBy name and date
      removeSignature("approved") // Clear approved signature and URL
      setApprovedBy((prev) => ({ ...prev, name: "", date: "" })) // Reset approvedBy name and date

      // Fetch the next voucher number after successful save
      const nextVoucherResponse = await fetch("/api/check/voucher-next-no")
      if (nextVoucherResponse.ok) {
        const nextVoucherData = await nextVoucherResponse.json()
        setFormData((prev) => ({ ...prev, voucherNo: nextVoucherData.nextVoucherNo }))
      }
    } catch (error: any) {
      console.error("Error saving voucher:", error)
      let errorMessage = "Failed to save voucher. Please try again."
      try {
        const parsedError = JSON.parse(error.message)
        if (parsedError.errors) {
          // Format validation errors from Laravel for display
          const validationErrors = Object.entries(parsedError.errors)
            .map(([field, messages]) => {
              // Convert camelCase field names to more readable format (e.g., "paidTo" -> "paid to")
              const fieldName = field
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()
                .replace("by.", "by ") // Adjust for nested fields
              return `${fieldName}: ${(messages as string[]).join(", ")}`
            })
            .join("\n")
          errorMessage = `Validation failed:\n${validationErrors}`
        } else if (parsedError.message) {
          errorMessage = parsedError.message
        }
      } catch (parseError) {
        // If the error message is not a JSON string, use it directly
        errorMessage = error.message
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false) // Set loading to false regardless of success or failure
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cheque Voucher</h1>
        <p className="text-slate-500">Create and manage cheque vouchers with live preview.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Section */}
        <Card className="h-fit lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-slate-900">Voucher Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paidTo">Paid To</Label>
                <Input
                  id="paidTo"
                  placeholder="Enter payee name"
                  value={formData.paidTo}
                  onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voucherNo">Voucher No</Label>
                <Input
                  id="voucherNo"
                  placeholder="Enter voucher number"
                  value={formData.voucherNo}
                  onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                  readOnly // Make it read-only as it's fetched from backend
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Transaction Details</h3>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    placeholder="Enter purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkNo">Check No</Label>
                  <Input
                    id="checkNo"
                    placeholder="Enter check number"
                    value={formData.checkNo}
                    onChange={(e) => setFormData({ ...formData, checkNo: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="Enter account name"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">Received By</h4>
                <div className="space-y-2">
                  <Label>Printed Name</Label>
                  <Input
                    placeholder="Enter printed name"
                    value={receivedBy.name}
                    onChange={(e) => setReceivedBy({ ...receivedBy, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signature</Label>
                  {receivedBy.signatureUrl ? (
                    <div className="space-y-2">
                      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center">
                        {" "}
                        {/* Removed fixed h-24 */}
                        <img
                          src={receivedBy.signatureUrl || "/placeholder.svg"}
                          alt="Signature"
                          className="max-h-16 max-w-[120px] object-contain"
                          crossOrigin="anonymous"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => removeSignature("received")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex flex-col items-center justify-center">
                      {" "}
                      {/* Removed fixed h-24 */}
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <Label htmlFor="receivedSignature" className="cursor-pointer text-sm text-gray-600">
                        Click to upload signature
                      </Label>
                      <Input
                        id="receivedSignature"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleSignatureUpload(file, "received")
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={receivedBy.date}
                    onChange={(e) => setReceivedBy({ ...receivedBy, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">Approved By</h4>
                <div className="space-y-2">
                  <Label>Printed Name</Label>
                  <Input
                    placeholder="Enter printed name"
                    value={approvedBy.name}
                    onChange={(e) => setApprovedBy({ ...approvedBy, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signature</Label>
                  {approvedBy.signatureUrl ? (
                    <div className="space-y-2">
                      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center">
                        {" "}
                        {/* Removed fixed h-24 */}
                        <img
                          src={approvedBy.signatureUrl || "/placeholder.svg"}
                          alt="Signature"
                          className="max-h-16 max-w-[120px] object-contain"
                          crossOrigin="anonymous"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => removeSignature("approved")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex flex-col items-center justify-center">
                      {" "}
                      {/* Removed fixed h-24 */}
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <Label htmlFor="approvedSignature" className="cursor-pointer text-sm text-gray-600">
                        Click to upload signature
                      </Label>
                      <Input
                        id="approvedSignature"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleSignatureUpload(file, "approved")
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={approvedBy.date}
                    onChange={(e) => setApprovedBy({ ...approvedBy, date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Voucher"}
            </Button>
            <Button onClick={exportAsImage} className="w-full bg-transparent" size="lg" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export as Image
            </Button>
          </CardContent>
        </Card>
        {/* Preview Section */}
        <Card className="lg:col-span-3 border rounded-lg bg-white shadow-sm h-fit">
          <div
            ref={previewRef}
            className="bg-white p-4 border-2 border-gray-300 text-black w-full"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            <div className="flex items-center mb-4">
              {/* Logo */}
              <div className="flex-shrink-0 mr-2">
                <img
                  src={formData.logo || "/placeholder.svg"}
                  alt="Company Logo"
                  className="max-h-14 max-w-[150px]"
                  crossOrigin="anonymous"
                />
              </div>
              {/* Title */}
              <div className="flex-grow text-center">
                <h2 className="text-base font-bold underline">CHEQUE VOUCHER</h2>
              </div>
            </div>
            {/* Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 mb-4">
              {" "}
              {/* Adjusted to sm:grid-cols-2 for better mobile stacking */}
              <div className="flex items-center mt-2">
                <span className="font-semibold">Paid to:</span>
                <span className="ml-2 border-b border-black flex-grow min-h-[1.5rem] flex items-end">
                  <span className="pb-1">{formData.paidTo}</span>
                </span>
              </div>
              <div className="flex flex-col items-end space-y-1 mt-4 sm:mt-2">
                {" "}
                {/* Adjusted margin for sm screens */}
                <div className="flex items-center w-full justify-end">
                  <span className="font-semibold flex-shrink-0 pr-2">Voucher No:</span>
                  <span className="border-b border-black inline-flex items-end min-w-[130px] text-right min-h-[1.5rem]">
                    <span className="pb-1">{formData.voucherNo}</span>
                  </span>
                </div>
                <div className="flex items-center w-full justify-end">
                  <span className="font-semibold flex-shrink-0 pr-2">Date:</span>
                  <span className="border-b border-black inline-flex items-end min-w-[130px] text-right min-h-[1.5rem]">
                    <span className="pb-1">{formatDate(formData.date)}</span>
                  </span>
                </div>
              </div>
            </div>
            {/* Table with all details inside */}
            <div className="grid grid-rows-[auto_1fr] border-2 border-black mb-2">
              {/* Header Row - Fixed height and proper vertical centering */}
              <div
                className="grid grid-cols-[65%_35%] border-b border-black bg-gray-100 relative"
                style={{ height: "50px" }}
              >
                {/* PARTICULAR Column */}
                <div className="border-r border-black relative flex items-center justify-center px-2">
                  <div className="font-semibold text-center">PARTICULAR</div>
                </div>
                {/* AMOUNT Column */}
                <div className="flex items-center justify-center px-2">
                  <div className="font-semibold text-center">AMOUNT</div>
                </div>
              </div>
              {/* Main Content Area */}
              <div className="grid grid-cols-[65%_35%] relative">
                {/* Vertical line between Particular and Amount */}
                <div className="absolute inset-y-0 left-[65%] w-px bg-black"></div>
                {/* Left Column: Particular and Bank Details */}
                <div className="px-2 py-2 text-sm flex flex-col">
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center flex-wrap">
                      {" "}
                      {/* Added flex-wrap for small screens */}
                      <span className="font-semibold">Purpose:</span>
                      <span className="ml-1 inline-flex items-end flex-grow min-h-[1.2rem]">
                        {" "}
                        {/* Changed w-40 to flex-grow */}
                        <span className="pb-px">{formData.purpose}</span>
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap">
                      {" "}
                      {/* Added flex-wrap for small screens */}
                      <span className="font-semibold">Check No:</span>
                      <span className="ml-1 inline-flex items-end flex-grow min-h-[1.2rem]">
                        {" "}
                        {/* Changed w-40 to flex-grow */}
                        <span className="pb-px">{formData.checkNo}</span>
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold">Bank Details:</span>
                      <div className="pl-4 space-y-1">
                        <div className="flex items-center flex-wrap">
                          {" "}
                          {/* Added flex-wrap for small screens */}
                          <span className="font-semibold">Account Name:</span>
                          <span className="ml-1 border-b border-black inline-flex items-end flex-grow min-h-[1.2rem]">
                            {" "}
                            {/* Changed w-40 to flex-grow */}
                            <span className="pb-px">{formData.accountName}</span>
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap">
                          {" "}
                          {/* Added flex-wrap for small screens */}
                          <span className="font-semibold">Account Number:</span>
                          <span className="ml-1 border-b border-black inline-flex items-end flex-grow min-h-[1.2rem]">
                            {" "}
                            {/* Changed w-40 to flex-grow */}
                            <span className="pb-px">{formData.accountNumber}</span>
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap">
                          {" "}
                          {/* Added flex-wrap for small screens */}
                          <span className="font-semibold">Amount:</span>
                          <span className="ml-1 border-b border-black inline-flex items-end flex-grow min-h-[1.2rem]">
                            {" "}
                            {/* Changed w-40 to flex-grow */}
                            <span className="pb-px">
                              {formData.amount ? `₱${Number.parseFloat(formData.amount).toFixed(2)}` : <>&nbsp;</>}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right Column: Amount - This will be a grid with two sub-columns for whole and cents */}
                <div className="grid grid-cols-[1fr_auto] relative">
                  {/* Vertical line for cents - this will be the continuous one */}
                  <div className="absolute inset-y-0 right-[80px] w-px bg-black"></div>
                  {/* Whole number part (left sub-column of Amount) */}
                  <div className="px-2 py-2 text-right text-sm flex flex-col h-full">
                    <div className="flex-grow flex items-end justify-end">
                      {formData.amount ? `₱${Math.floor(Number.parseFloat(formData.amount))}` : ""}
                    </div>
                  </div>
                  {/* Cents part (right sub-column of Amount) */}
                  <div className="w-[80px] px-2 py-2 text-sm flex flex-col h-full">
                    <div className="flex-grow flex items-start justify-start"></div>
                    <div className="pt-1 flex items-end justify-start">
                      {formData.amount ? Number.parseFloat(formData.amount).toFixed(2).split(".")[1] : "00"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 mt-2">
              {" "}
              {/* Changed to responsive grid */}
              <div className="text-start">
                <div className="mb-1 font-semibold">Received by:</div>
                <div className="mb-0">
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 items-end mb-2 mt-10">
                    <div className="flex flex-col items-center text-center relative min-h-[40px] mt-4">
                      {receivedBy.signatureUrl && (
                        <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2">
                          <img
                            src={receivedBy.signatureUrl || "/placeholder.svg"}
                            alt="Signature"
                            className="max-h-10 max-w-[100px] mx-auto object-contain"
                            crossOrigin="anonymous"
                          />
                        </div>
                      )}
                      <div className="min-h-[24px] flex items-end justify-center border-b-[1px] border-b-black w-full">
                        <span className="pb-1">{receivedBy.name}</span>
                      </div>
                      <div className="pt-1 text-xs whitespace-nowrap">PRINTED NAME AND SIGNATURE</div>
                    </div>
                    <div className="flex flex-col items-center text-center w-[100px] min-h-[40px]">
                      <div className="min-h-[24px] flex items-end justify-center border-b-[1px] border-b-black w-full">
                        <span className="pb-1">{formatDate(receivedBy.date)}</span>
                      </div>
                      <div className="pt-1 text-xs whitespace-nowrap">DATE</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-start mt-4 md:mt-0">
                {" "}
                {/* Added top margin for mobile, removed for md+ */}
                <div className="mb-1 font-semibold">Approved by:</div>
                <div className="mb-0">
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 items-end mb-2 mt-10">
                    <div className="flex flex-col items-center text-center relative min-h-[40px] mt-4">
                      {approvedBy.signatureUrl && (
                        <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2">
                          <img
                            src={approvedBy.signatureUrl || "/placeholder.svg"}
                            alt="Signature"
                            className="max-h-10 max-w-[100px] mx-auto object-contain"
                            crossOrigin="anonymous"
                          />
                        </div>
                      )}
                      <div className="min-h-[24px] flex items-end justify-center border-b-[1px] border-b-black w-full">
                        <span className="pb-1">{approvedBy.name}</span>
                      </div>
                      <div className="pt-1 text-xs whitespace-nowrap">PRINTED NAME AND SIGNATURE</div>
                    </div>
                    <div className="flex flex-col items-center text-center w-[100px] min-h-[40px]">
                      <div className="min-h-[24px] flex items-end justify-center border-b-[1px] border-b-black w-full">
                        <span className="pb-1">{formatDate(approvedBy.date)}</span>
                      </div>
                      <div className="pt-1 text-xs whitespace-nowrap">DATE</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
