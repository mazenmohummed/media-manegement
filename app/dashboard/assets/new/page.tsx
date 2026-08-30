"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Save,
  Loader2,
  Calendar,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewAssetPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    assetName: "",
    category: "",
    purchaseDate: "",
    currentValue: "",
    availabilityStatus: "AVAILABLE",
    serialNumber: "",
    location: "",
    maintenanceDueAt: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/assets/${data.asset.id}`);
      } else {
        const error = await res.json();
        setError(error.error || "Failed to create asset");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/assets"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" /> Assets
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-sm text-zinc-300">New Asset</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-950/40 border border-purple-800 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Add New Asset</h1>
            <p className="text-sm text-zinc-500">Enter asset details below</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                Asset Name *
              </label>
              <Input
                name="assetName"
                value={formData.assetName}
                onChange={handleChange}
                placeholder="e.g., Canon EOS R5 Camera"
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                Category *
              </label>
              <Input
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Camera Equipment"
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                Serial Number
              </label>
              <Input
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="e.g., SN123456789"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                Current Value ($)
              </label>
              <Input
                type="number"
                name="currentValue"
                value={formData.currentValue}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                Purchase Date
              </label>
              <Input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                Availability Status
              </label>
              <select
                name="availabilityStatus"
                value={formData.availabilityStatus}
                onChange={handleChange}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3"
              >
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
                <option value="LOST">Lost</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                Location
              </label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Studio A"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-2">
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Maintenance Due Date
                </span>
              </label>
              <Input
                type="date"
                name="maintenanceDueAt"
                value={formData.maintenanceDueAt}
                onChange={handleChange}
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Asset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}