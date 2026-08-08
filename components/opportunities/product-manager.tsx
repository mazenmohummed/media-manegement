"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Package, Loader2 } from "lucide-react";
import { DiscoveryProduct } from "@prisma/client";

interface ProductManagerProps {
  opportunityId: string;
  initialProducts: DiscoveryProduct[];
}

export function ProductManager({ opportunityId, initialProducts }: ProductManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState<DiscoveryProduct[]>(initialProducts);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DiscoveryProduct | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    usp: "",
  });

  const openModal = (product?: DiscoveryProduct) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name || "",
        price: product.price ? product.price.toString() : "",
        usp: product.usp || "",
      });
    } else {
      setSelectedProduct(null);
      setFormData({ name: "", price: "", usp: "" });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedProduct) {
        const res = await fetch(`/api/opportunities/${opportunityId}/products`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedProduct.id, ...formData }),
        });
        if (res.ok) {
          const updated = await res.json();
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }
      } else {
        const res = await fetch(`/api/opportunities/${opportunityId}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const created = await res.json();
          setProducts((prev) => [...prev, created]);
        }
      }
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/products?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <span>Products</span>
          <Package className="w-4 h-4 text-amber-400" />
        </h3>
        <button
          onClick={() => openModal()}
          className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          title="Add Product"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {products.length > 0 ? (
        <div className="space-y-3">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs space-y-1 relative group"
            >
              <div className="flex justify-between items-start">
                <div className="flex justify-between items-center w-full pr-12">
                  <p className="font-semibold text-zinc-200">{prod.name}</p>
                  {prod.price !== null && (
                    <span className="text-emerald-400 font-mono">
                      ${prod.price.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(prod)}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(prod.id)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {prod.usp && (
                <p className="text-zinc-400">
                  <span className="text-zinc-500">USP:</span> {prod.usp}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 italic">No products recorded.</p>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-5 space-y-4">
            <h4 className="text-sm font-semibold text-zinc-100">
              {selectedProduct ? "Edit Product" : "Add Product"}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">USP</label>
                <textarea
                  value={formData.usp}
                  onChange={(e) => setFormData({ ...formData, usp: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}