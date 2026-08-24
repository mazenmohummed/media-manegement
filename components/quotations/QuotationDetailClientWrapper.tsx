"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditQuotationClient from "@/components/quotations/EditQuotationClient";

interface QuotationDetailClientWrapperProps {
  agencyId: string;
  quotation: any;
  vendors: any[];
  projects: any[];
  updateQuotationAction: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}

export default function QuotationDetailClientWrapper({
  agencyId,
  quotation,
  vendors,
  projects,
  updateQuotationAction,
  children,
}: QuotationDetailClientWrapperProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      {/* Edit Trigger Button placed alongside other action buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => setIsEditModalOpen(true)}
          variant="outline"
          className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300"
        >
          <Pencil className="w-4 h-4 mr-2" /> Edit Quotation
        </Button>
        {children}
      </div>

      {/* Modal Component */}
      <EditQuotationClient
        agencyId={agencyId}
        quotation={quotation}
        vendors={vendors}
        projects={projects}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        updateQuotationAction={updateQuotationAction}
      />
    </>
  );
}