import { NextResponse } from "next/server"

const LARAVEL_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export async function POST(request: Request) {
  if (!LARAVEL_API_BASE_URL) {
    return NextResponse.json(
      { message: "Laravel API URL (NEXT_PUBLIC_API_URL) not configured in .env.local." },
      { status: 500 },
    )
  }
  try {
    // Get FormData directly from the request
    const formData = await request.formData()

    // Forward the FormData directly to the Laravel backend
    const response = await fetch(`${LARAVEL_API_BASE_URL}/cheque-vouchers`, {
      method: "POST",
      body: formData, // Send FormData directly
      // Do NOT set Content-Type header for FormData, fetch does it automatically
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        {
          message: errorData.message || "Failed to save voucher in Laravel.",
          errors: errorData.errors || {}, // Ensure errors are passed
        },
        { status: response.status },
      )
    }
    const result = await response.json()
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Error proxying request to Laravel:", error)
    return NextResponse.json({ message: "Internal server error.", error: error.message }, { status: 500 })
  }
}
