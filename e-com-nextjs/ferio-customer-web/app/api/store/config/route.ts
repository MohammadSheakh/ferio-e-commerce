import { NextResponse } from "next/server";
import { fallbackStoreConfig, getStoreConfig } from "@/lib/store";

export async function GET() {
  try {
    return NextResponse.json({ data: await getStoreConfig() });
  } catch {
    return NextResponse.json({ data: fallbackStoreConfig });
  }
}
