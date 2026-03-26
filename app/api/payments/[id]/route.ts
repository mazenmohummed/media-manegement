import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // 1. Update type to Promise
) {
  const session = await getServerSession(authOptions);
  
  // 2. Unwrapping the params
  const { id } = await params; 

  if (!session?.user?.agencyId) return new NextResponse("Unauthorized", { status: 401 });
  
  // 3. Safety check for undefined IDs
  if (!id || id === "undefined") {
    return new NextResponse("Invalid Payment ID", { status: 400 });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { 
        id: id,
        agencyId: session.user.agencyId 
      },
      include: {
        client: {
          select: {
            clientName: true,
            clientNo: true,
            
          }
        }
      }
    });

    if (!payment) return new NextResponse("Payment Not Found", { status: 404 });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Payment API Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}