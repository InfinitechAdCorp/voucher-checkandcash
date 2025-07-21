import { NextResponse } from "next/server"

const LARAVEL_API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params
  if (!LARAVEL_API_URL) {
    return NextResponse.json({ message: "Laravel API URL is not configured." }, { status: 500 })
  }
  try {
    const response = await fetch(`${LARAVEL_API_URL}/cash-vouchers/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Ensure fresh data
    })
    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { message: errorData.message || "Failed to fetch cash voucher" },
        { status: response.status },
      )
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching cash voucher:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await request.json() // For JSON payload (like status update)
  if (!LARAVEL_API_URL) {
    return NextResponse.json({ message: "Laravel API URL is not configured." }, { status: 500 })
  }
  try {
    const response = await fetch(`${LARAVEL_API_URL}/cash-vouchers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { message: errorData.message || "Failed to update cash voucher" },
        { status: response.status },
      )
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error updating cash voucher:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}

// This POST method is specifically for handling FormData with _method=PUT for file uploads
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params
  const formData = await request.formData()
  if (!LARAVEL_API_URL) {
    return NextResponse.json({ message: "Laravel API URL is not configured." }, { status: 500 })
  }
  try {
    const response = await fetch(`${LARAVEL_API_URL}/cash-vouchers/${id}`, {
      method: "POST", // Laravel expects POST for FormData with _method=PUT
      body: formData,
    })
    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { message: errorData.message || "Failed to update cash voucher with files" },
        { status: response.status },
      )
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error updating cash voucher with files:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}
