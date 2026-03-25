import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { itemName, cost } = await req.json();

    const rental = await db.externalRental.create({
      data: {
        itemName,
        cost: parseFloat(cost),
        taskId: id
      }
    });

    return NextResponse.json(rental);
  } catch (error) {
    return new NextResponse("Rental Creation Failed", { status: 500 });
  }
}