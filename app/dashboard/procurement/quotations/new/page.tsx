import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import NewQuotationClient from "@/components/quotations/new-quotation-client";


export default async function NewQuotationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return redirect("/auth/login");

  const agencyId = session.user.agencyId;

  const [vendors, projects] = await Promise.all([
    db.vendor.findMany({
      where: { agencyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.project.findMany({
      where: { agencyId },
      select: { id: true, name: true, projectNo: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  async function createQuotationAction(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) return;

    const vendorIds = formData.getAll("vendorIds") as string[];
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as any;
    const validUntil = formData.get("validUntil") as string;
    const description = formData.get("description") as string;
    const notes = formData.get("notes") as string;

    if (!vendorIds || vendorIds.length === 0) {
      throw new Error("Please select at least one vendor.");
    }

    const count = await db.quotation.count({ where: { agencyId: session.user.agencyId } });
    const year = new Date().getFullYear();
    const generatedQuotationNo = `QTN-${year}-${String(count + 1).padStart(3, "0")}`;

    await db.quotation.create({
      data: {
        agencyId: session.user.agencyId,
        projectId: projectId || null,
        quotationNo: generatedQuotationNo,
        currency: "EGP",
        status: status || "REQUESTED",
        validUntil: validUntil ? new Date(validUntil) : null,
        description: description || null,
        notes: notes || null,
        vendors: {
          create: vendorIds.map((vId) => ({
            vendorId: vId,
          })),
        },
      },
    });

    redirect("/dashboard/procurement/quotations");
  }

  return (
    <NewQuotationClient
      agencyId={agencyId}
      vendors={vendors}
      projects={projects}
      createQuotationAction={createQuotationAction}
    />
  );
}