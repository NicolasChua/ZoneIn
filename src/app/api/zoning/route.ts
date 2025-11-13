/**
 * @description
 * This is the main API route for the zoning report feature. It consolidates the backend logic
 * that was previously in a separate Express server. This route handles POST requests containing
 * an address, retrieves zoning information for that address, and then uses the OpenAI API
 * to generate a human-readable zoning report.
 *
 * @endpoint POST /api/zoning
 *
 * @request
 * Body: { "address": "123 N State St, Chicago, IL" }
 *
 * @response
 * Success: Returns the JSON response from the OpenAI Chat Completions API.
 * Error: Returns a JSON object with an error message and an appropriate status code.
 *
 * @dependencies
 * - next/server: For handling requests and responses in Next.js App Router.
 * - @/lib/chicagoApi: A custom library to interact with Chicago's GIS APIs.
 * - @/app/prompt: Contains the prompt template for the OpenAI API call.
 */
import { NextResponse } from "next/server";
import { getZoningByAddress } from "@/lib/chicagoApi";
import { DEFAULT_PROMPT } from "@/app/prompt";

/**
 * Handles POST requests to generate a zoning report.
 * It takes an address, gets its zoning class from the Chicago API,
 * then queries the OpenAI API to generate a report.
 *
 * @param req - The incoming Next.js request object.
 * @returns A NextResponse object with the OpenAI API response or an error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address } = body;

    // 1. Validate input
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // 2. Get Zoning Class from Chicago's API via our library
    const { zoneClass } = await getZoningByAddress(address);
    if (!zoneClass) {
      return NextResponse.json(
        { error: "No zoning information found for the provided address." },
        { status: 404 }
      );
    }

    // 3. Prepare and send the prompt to OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 }
      );
    }

    const finalPrompt = `Address: ${address}\\nZone Class: ${zoneClass}\\n\\n${DEFAULT_PROMPT}`;

    const openaiResponse = await fetch("<https://api.openai.com/v1/chat/completions>", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [{ role: "user", content: finalPrompt }],
      }),
    });

    const openaiData = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI API Error:", openaiData);
      return NextResponse.json(
        { error: openaiData.error?.message || "An error occurred with the OpenAI API." },
        { status: openaiResponse.status }
      );
    }

    // 4. Return the successful response from OpenAI
    return NextResponse.json(openaiData);
  } catch (error) {
    console.error("[ZONING_API_ERROR]", error);

    // Provide a generic but helpful error message
    let errorMessage = "An internal server error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
