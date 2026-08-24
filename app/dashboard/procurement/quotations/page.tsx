import React from "react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ExternalLink, Search, X } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface QuotationsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

async function getQuotations(search?: string, status?: string) {
  return await db.quotation.findMany({
    where: {
      AND: [
        status && status !== "ALL" ? { status: status as any } : {},
        search
          ? {
              OR: [
                { quotationNo: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { project: { projectName: { contains: search, mode: "insensitive" } } },
                { vendor: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      project: true,
      vendor: true,
      vendors: {
        include: {
          vendor: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "REQUESTED":
      return <Badge variant="secondary">Requested</Badge>;
    case "RECEIVED":
      return <Badge variant="outline" className="border-blue-500 text-blue-500">Received</Badge>;
    case "COMPARED":
      return <Badge variant="outline" className="border-purple-500 text-purple-500">Compared</Badge>;
    case "SELECTED":
      return <Badge className="bg-green-600 text-white">Selected</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    case "EXPIRED":
      return <Badge variant="secondary" className="text-muted-foreground">Expired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams?.search || "";
  const status = resolvedParams?.status || "ALL";

  const quotations = await getQuotations(search, status);

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor quotations, compare pricing, and track procurement requests.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/procurement/quotations/new">
            <Plus className="mr-2 h-4 w-4" /> Request Quotation
          </Link>
        </Button>
      </div>

      {/* Filter Bar Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-lg border">
        <form method="GET" className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search quotation no, project, vendor..."
              defaultValue={search}
              className="pl-9 w-full"
            />
          </div>

          {/* Status Filter */}
          <Select name="status" defaultValue={status}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="REQUESTED">Requested</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="COMPARED">Compared</SelectItem>
              <SelectItem value="SELECTED">Selected</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>

          {/* Hidden input to preserve status when filtering via text if needed, or submit buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              Filter
            </Button>
            {(search || (status && status !== "ALL")) && (
              <Button asChild variant="ghost" size="icon" title="Reset Filters">
                <Link href="/dashboard/procurement/quotations">
                  <X className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Main Table Container */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation No</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Primary Vendor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No quotations found. Click &quot;Request Quotation&quot; to create one or clear filters.
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">
                    {quotation.quotationNo || "N/A"}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate">
                    {quotation.description || "No description"}
                  </TableCell>
                  <TableCell>
                    {quotation.project ? quotation.project.projectName : "—"}
                  </TableCell>
                  <TableCell>
                    {quotation.vendor?.name ? (
                      <span className="font-medium">{quotation.vendor.name}</span>
                    ) : quotation.vendors.length > 0 ? (
                      <span className="text-muted-foreground">
                        {quotation.vendors.map((v) => v.vendor.name).join(", ")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {quotation.amount != null
                      ? `${quotation.amount.toLocaleString()} ${quotation.currency}`
                      : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                  <TableCell>
                    {quotation.validUntil
                      ? format(new Date(quotation.validUntil), "PP")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/procurement/quotations/${quotation.id}`}>
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">View Quotation</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}