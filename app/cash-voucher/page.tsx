"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, Download, Trash2, Upload, X, Save } from "lucide-react"
import domtoimage from "dom-to-image"
import { useToast } from "@/hooks/use-toast"

interface Particular {
  id: string
  description: string
  amount: string
}

// Helper function to format date consistently for preview to avoid hydration issues
const formatDateForPreview = (dateString: string) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "" // Handle invalid date strings

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${month} ${day}, ${year}`
}

export default function CashVoucher() {
  const { toast } = useToast() // Initialize useToast
  const currentYearTwoDigits = new Date().getFullYear().toString().slice(-2)
  const initialVoucherNo = `CSH-${currentYearTwoDigits}-000001`

  const [formData, setFormData] = useState({
    paidTo: "",
    voucherNo: initialVoucherNo,
    date: "",
    logo: "/logo.png", // Using placeholder.svg
  })
  const [particulars, setParticulars] = useState<Particular[]>([{ id: "1", description: "", amount: "" }])
  const [receivedBy, setReceivedBy] = useState({
    name: "",
    signature: null as File | null,
    signatureUrl: "",
    date: "",
  })
  const [approvedBy, setApprovedBy] = useState({
    name: "",
    signature: null as File | null,
    signatureUrl: "",
    date: "",
  })
  const previewRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchLatestVoucherNo = async () => {
      try {
        const response = await fetch("/api/cash/latest-voucher-no", {
          cache: "no-store",
        })
        if (response.ok) {
          const data = await response.json()
          console.log("Fetched latest voucher number from API:", data.latest_voucher_no)
          setFormData((prev) => ({
            ...prev,
            voucherNo: data.latest_voucher_no,
          }))
        } else {
          console.error("Failed to fetch latest voucher number:", await response.json())
          toast({
            title: "Error",
            description: "Failed to load voucher number.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching latest voucher number:", error)
        toast({
          title: "Error",
          description: "Error connecting to backend for voucher number.",
          variant: "destructive",
        })
      }
    }
    fetchLatestVoucherNo()
  }, []) // The useEffect hook is used to perform side effects like data fetching [^2].

  const addParticular = () => {
    const newParticular = {
      id: Date.now().toString(),
      description: "",
      amount: "",
    }
    setParticulars([...particulars, newParticular])
  }

  const removeParticular = (id: string) => {
    if (particulars.length > 1) {
      setParticulars(particulars.filter((p) => p.id !== id))
    }
  }

  const updateParticular = (id: string, field: keyof Particular, value: string) => {
    setParticulars(particulars.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const calculateTotal = () => {
    return particulars
      .reduce((total, particular) => {
        return total + (Number.parseFloat(particular.amount) || 0)
      }, 0)
      .toFixed(2)
  }

  const handleSignatureUpload = (file: File, type: "received" | "approved") => {
    const url = URL.createObjectURL(file)
    if (type === "received") {
      setReceivedBy({ ...receivedBy, signature: file, signatureUrl: url })
    } else {
      setApprovedBy({ ...approvedBy, signature: file, signatureUrl: url })
    }
  }

  const removeSignature = (type: "received" | "approved") => {
    if (type === "received") {
      if (receivedBy.signatureUrl && receivedBy.signatureUrl.startsWith("blob:")) {
        URL.revokeObjectURL(receivedBy.signatureUrl)
      }
      setReceivedBy({ ...receivedBy, signature: null, signatureUrl: "" })
    } else {
      if (approvedBy.signatureUrl && approvedBy.signatureUrl.startsWith("blob:")) {
        URL.revokeObjectURL(approvedBy.signatureUrl)
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
      // Generate PNG from node, using a fixed width for export
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
      link.download = `cash-voucher-${formData.voucherNo || "untitled"}.png`
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
    setIsSaving(true)
    try {
      const payload = new FormData()
      payload.append("paidTo", formData.paidTo)
      payload.append("voucherNo", formData.voucherNo)
      payload.append("date", formData.date)
      particulars.forEach((p, index) => {
        payload.append(`particulars[${index}][description]`, p.description)
        payload.append(`particulars[${index}][amount]`, (Number.parseFloat(p.amount) || 0).toString())
      })
      payload.append("receivedBy[name]", receivedBy.name)
      if (receivedBy.signature) {
        payload.append("receivedBy[signature]", receivedBy.signature)
      }
      payload.append("receivedBy[date]", receivedBy.date)
      payload.append("approvedBy[name]", approvedBy.name)
      if (approvedBy.signature) {
        payload.append("approvedBy[signature]", approvedBy.signature)
      }
      payload.append("approvedBy[date]", approvedBy.date)

      const response = await fetch("/api/cash", {
        method: "POST",
        body: payload,
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: "Voucher saved successfully!",
        })
        console.log("Voucher saved:", result)
        // Optionally reset form or fetch new voucher number here if needed
      } else {
        const contentType = response.headers.get("content-type")
        let errorData
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json()
        } else {
          errorData = await response.text()
          console.error("Received non-JSON response from Laravel (POST /cash-vouchers):", errorData)
        }
        toast({
          title: "Error",
          description: `Failed to save voucher: ${errorData.message || JSON.stringify(errorData.errors || errorData)}`,
          variant: "destructive",
        })
        console.error("Failed to save voucher:", errorData)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${(error as Error).message}`,
        variant: "destructive",
      })
      console.error("Submission error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cash Voucher</h1>
        <p className="text-slate-500">Create and manage cash vouchers with live preview.</p>
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
                  value={formData.voucherNo}
                  readOnly // Made readonly
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
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Particulars</h3>
                <Button onClick={addParticular} size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>
              {particulars.map((particular, index) => (
                <div key={particular.id} className="border rounded-md p-3 space-y-2 bg-gray-50 relative">
                  <h4 className="font-semibold text-slate-900">Particular #{index + 1}</h4>
                  <div className="space-y-2">
                    <Label htmlFor={`description-${particular.id}`}>
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id={`description-${particular.id}`}
                      placeholder="Enter particular description"
                      value={particular.description}
                      onChange={(e) => updateParticular(particular.id, "description", e.target.value)}
                      rows={2} // Reduced rows for description
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`amount-${particular.id}`}>
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`amount-${particular.id}`}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      value={particular.amount}
                      onChange={(e) => updateParticular(particular.id, "amount", e.target.value)}
                    />
                  </div>
                  {particulars.length > 1 && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeParticular(particular.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
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
                      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-2">
                        <img
                          src={receivedBy.signatureUrl || "/placeholder.svg"}
                          alt="Signature"
                          className="max-h-20 mx-auto"
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
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
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
                      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-2">
                        <img
                          src={approvedBy.signatureUrl || "/placeholder.svg"}
                          alt="Signature"
                          className="max-h-20 mx-auto"
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
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
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
            <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isSaving}>
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Voucher
                </>
              )}
            </Button>
            <Button onClick={exportAsImage} className="w-full" size="lg">
              <Download className="w-4 h-4 mr-2" /> Export as Image
            </Button>
          </CardContent>
        </Card>
        {/* Preview Section */}
        <Card className="lg:col-span-3 border rounded-lg bg-white shadow-sm h-fit">
          <div
            ref={previewRef}
            className="bg-white p-6 border-2 border-gray-300 text-black w-full"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            <div className="flex items-center mb-4">
              {/* Logo */}
              <div className="flex-shrink-0 mr-4">
                <img
                  src={formData.logo || "/placeholder.svg"}
                  alt="Company Logo"
                  className="max-h-14 max-w-[150px]"
                  crossOrigin="anonymous"
                />
              </div>
              {/* Title */}
              <div className="flex-grow text-center">
                <h2 className="text-base font-bold underline">CASH VOUCHER</h2>
              </div>
            </div>
            {/* Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mb-4">
              {" "}
              {/* Adjusted to sm:grid-cols-2 for better mobile stacking */}
              <div className="flex items-center mt-8">
                <span className="font-semibold">Paid to:</span>
                <span className="ml-2 border-b border-black flex-grow min-h-[1.5rem] flex items-end">
                  <span className="pb-1">{formData.paidTo}</span>
                </span>
              </div>
              <div className="flex flex-col items-end space-y-1 mt-4 sm:mt-8">
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
                    <span className="pb-1">{formatDateForPreview(formData.date)}</span>
                  </span>
                </div>
              </div>
            </div>
            {/* Table */}
            <div className="border-2 border-black mb-2">
              {/* Header Row */}
              <div className="grid grid-cols-[8fr_3fr_1fr] border-b border-black bg-gray-100">
                <div className="py-2 px-2 font-semibold text-center border-r border-black flex items-center justify-center">
                  PARTICULARS
                </div>
                <div className="col-span-2 py-2 px-2 font-semibold text-center flex items-center justify-center">
                  AMOUNT
                </div>
              </div>
              {/* Content Area */}
              <div className="relative">
                {/* Vertical lines */}
                <div className="absolute inset-y-0 left-[calc(7.98/12*100%)] w-px bg-black"></div>
                <div className="absolute inset-y-0 left-[calc(11/12*100%)] w-px bg-black"></div>
                {/* Particulars rows */}
                <div className="min-h-[100px]">
                  {Array.from({ length: Math.max(particulars.length, 4) }).map((_, index) => {
                    const particular = particulars[index]
                    const [whole, cents] = particular?.amount
                      ? Number.parseFloat(particular.amount).toFixed(2).split(".")
                      : ["", ""]
                    return (
                      <div
                        key={particular?.id || `empty-${index}`}
                        className="grid grid-cols-[8fr_3fr_1fr] min-h-[25px] last:border-b-0"
                      >
                        <div className="px-2 py-1 whitespace-pre-wrap text-sm">{particular?.description || ""}</div>
                        <div className="px-2 py-1 text-right text-sm">{particular ? whole : ""}</div>
                        <div className="px-2 py-1 text-left text-sm">{particular ? `.${cents}` : ""}</div>
                      </div>
                    )
                  })}
                </div>
                {/* Total Row */}
                <div className="grid grid-cols-[8fr_3fr_1fr] font-semibold">
                  <div className="p-2 text-right">TOTAL ₱</div>
                  {(() => {
                    const [totalWhole, totalCents] = calculateTotal().split(".")
                    return (
                      <>
                        <div className="p-2 text-right">{totalWhole}</div>
                        <div className="p-2 text-left">.{totalCents}</div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mt-2">
              {" "}
              {/* Changed to responsive grid */}
              <div className="text-start">
                <div className="mb-1 font-semibold">Received by:</div>
                <div className="mb-0">
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 items-end mb-2 mt-12">
                    <div className="flex flex-col items-center text-center relative min-h-[40px]">
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
                        <span className="pb-1">{formatDateForPreview(receivedBy.date)}</span>
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
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 items-end mb-2 mt-12">
                    <div className="flex flex-col items-center text-center relative min-h-[40px]">
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
                        <span className="pb-1">{formatDateForPreview(approvedBy.date)}</span>
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
