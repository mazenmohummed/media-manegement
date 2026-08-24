"use client";

import { use, useEffect, useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BudgetPageProps {
  params: Promise<{ taskId: string }>;
}

export default function TaskBudgetPage({ params }: BudgetPageProps) {
  const { taskId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states for Create / Edit
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("EQUIPMENT");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [description, setDescription] = useState("");

  // Approval Modal States
  const [approvingExp, setApprovingExp] = useState<any>(null);
  const [approvedCostInput, setApprovedCostInput] = useState("");

  const fetchBudget = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/budget`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to load budget", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [taskId]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setItemName("");
    setCategory("EQUIPMENT");
    setQuantity("1");
    setUnitCost("");
    setTaxRate("0");
    setDescription("");
  };

  const handleOpenEdit = (exp: any) => {
    setEditingId(exp.id);
    setItemName(exp.itemName);
    setCategory(exp.category);
    setQuantity(String(exp.quantity));
    setUnitCost(String(exp.unitCost));
    setTaxRate(String(exp.taxRate));
    setDescription(exp.description || "");
    setShowForm(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      itemName,
      category,
      quantity: parseFloat(quantity) || 1,
      unitCost: parseFloat(unitCost) || 0,
      taxRate: parseFloat(taxRate) || 0,
      description,
    };

    const url = editingId 
      ? `/api/tasks/${taskId}/planned-expenses/${editingId}`
      : `/api/tasks/${taskId}/budget`;
      
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetForm();
      fetchBudget();
    } else {
      const err = await res.json();
      alert(err.error || "Operation failed");
    }
  };

  const handleAction = async (expenseId: string, actionType: string, customApprovedCost?: number) => {
    let status = "DRAFT";
    if (actionType === "APPROVE") status = "APPROVED";
    if (actionType === "REJECT") status = "REJECTED";
    if (actionType === "SUBMIT") status = "DRAFT"; // Mapped to DRAFT since PENDING_APPROVAL isn't in your schema
    if (actionType === "DRAFT") status = "DRAFT";

    const payload: any = { status };
    if (customApprovedCost !== undefined) {
      payload.approvedCost = customApprovedCost;
    }

    const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setApprovingExp(null);
      setApprovedCostInput("");
      fetchBudget();
    } else {
      const err = await res.json();
      alert(err.error || "Action failed");
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this planned expense item?")) return;

    const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${expenseId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchBudget();
    } else {
      const err = await res.json();
      alert(err.error || "Delete failed");
    }
  };

  if (loading) return <div className="p-6">Loading budget dashboard...</div>;
  if (!data?.task) return <div className="p-6">Task budget not found.</div>;

  const { task, plannedExpenses } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Task Budget & Expense Roll-up</h1>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Add Planned Expense"}
        </Button>
      </div>

      {/* Approval Modal prompt */}
      {approvingExp && (
        <Card className="border-green-600 bg-zinc-950/90">
          <CardHeader>
            <CardTitle className="text-base text-green-500">Approve Expense: {approvingExp.itemName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Approved Cost ({approvingExp.currency})</label>
              <input 
                type="number" 
                step="any" 
                value={approvedCostInput} 
                onChange={(e) => setApprovedCostInput(e.target.value)} 
                placeholder={String(approvingExp.totalEstimated)} 
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank or use total estimated cost ({approvingExp.totalEstimated}) if no adjustment is needed.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApprovingExp(null)}>Cancel</Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white" 
                onClick={() => handleAction(
                  approvingExp.id, 
                  "APPROVE", 
                  approvedCostInput ? parseFloat(approvedCostInput) : approvingExp.totalEstimated
                )}
              >
                Confirm Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Form Card */}
      {showForm && (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Edit Planned Expense" : "New Planned Expense Item"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitForm} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Item Name</label>
                <input 
                  type="text" 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)} 
                  required 
                  placeholder="e.g. License, Hardware"
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="EQUIPMENT">EQUIPMENT</option>
                  <option value="LOCATION">LOCATION</option>
                  <option value="TRANSPORT">TRANSPORT</option>
                  <option value="CATERING">CATERING</option>
                  <option value="TALENT">TALENT</option>
                  <option value="RENTAL">RENTAL</option>
                  <option value="SOFTWARE">SOFTWARE</option>
                  <option value="PERMITS">PERMITS</option>
                  <option value="PRODUCTION">PRODUCTION</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Quantity</label>
                <input 
                  type="number" 
                  step="any" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  required 
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Unit Cost</label>
                <input 
                  type="number" 
                  step="any" 
                  value={unitCost} 
                  onChange={(e) => setUnitCost(e.target.value)} 
                  required 
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Tax Rate (%)</label>
                <input 
                  type="number" 
                  step="any" 
                  value={taxRate} 
                  onChange={(e) => setTaxRate(e.target.value)} 
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Description</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Optional details"
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{editingId ? "Update Item" : "Save Item"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Planned Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{task.plannedRevenue} EGP</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Planned Expense Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{task.plannedExpenseTotal} EGP</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Approved Budget</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{task.approvedBudget} EGP</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Budget Variance</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${task.budgetVariance < 0 ? 'text-red-500' : 'text-blue-600'}`}>{task.budgetVariance} EGP</div></CardContent>
        </Card>
      </div>

      {/* Planned Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planned Expense Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty / Unit Cost</TableHead>
                <TableHead>Total Est.</TableHead>
                <TableHead>Approved Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plannedExpenses.map((exp: any) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.itemName}</TableCell>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell>{exp.quantity} × {exp.unitCost} {exp.currency}</TableCell>
                  <TableCell>{exp.totalEstimated} {exp.currency}</TableCell>
                  <TableCell>{exp.approvedCost ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={exp.status === "APPROVED" ? "default" : "outline"}>
                      {exp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {exp.status === "DRAFT" && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setApprovingExp(exp); setApprovedCostInput(String(exp.totalEstimated)); }}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(exp.id, "REJECT")}>
                          Reject
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(exp)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(exp.id)}>
                          Delete
                        </Button>
                      </>
                    )}
                    {exp.status === "APPROVED" && (
                      <Button size="sm" variant="ghost" className="text-xs text-zinc-400" onClick={() => handleAction(exp.id, "DRAFT")}>
                        Revert to Draft
                      </Button>
                    )}
                    {exp.status === "REJECTED" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleOpenEdit(exp)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(exp.id)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {plannedExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No planned expenses found for this task.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}