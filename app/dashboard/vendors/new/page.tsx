'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Category {
  id: string;
  name: string;
}

export default function NewVendorPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const agencyId = session?.user?.agencyId;

  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [error, setError] = useState('');
  
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    categoryId: '',
    categoryName: '', // Used when creating a custom/new category
    address: '',
  });

  // Fetch categories from the dedicated VendorCategory table
  useEffect(() => {
    async function fetchCategories() {
      if (!agencyId) return;
      try {
        const res = await fetch(`/api/vendor-categories?agencyId=${agencyId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setExistingCategories(data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setFetchingCategories(false);
      }
    }

    fetchCategories();
  }, [agencyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'categorySelection') {
      if (value === 'NEW_CATEGORY') {
        setIsCustomCategory(true);
        setFormData({ ...formData, categoryId: '', categoryName: '' });
      } else {
        setIsCustomCategory(false);
        setFormData({ ...formData, categoryId: value, categoryName: '' });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId) {
      setError('Agency ID is missing from session.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      agencyId,
      name: formData.name,
      email: formData.email || undefined,
      phoneNumber: formData.phone || undefined,
      categoryId: formData.categoryId || undefined,
      categoryName: formData.categoryName || undefined,
      address: formData.address ? { city: formData.address } : undefined,
    };

    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create vendor');
      }

      router.push('/dashboard/vendors');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Add New Vendor</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor Name *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter vendor name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="vendor@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+20 ..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          {!isCustomCategory ? (
            <div className="flex gap-2">
              <select
                name="categorySelection"
                onChange={handleChange}
                disabled={fetchingCategories}
                value={formData.categoryId}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a category...</option>
                {existingCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="NEW_CATEGORY" className="font-semibold text-blue-600">
                  + Add New Category
                </option>
              </select>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                name="categoryName"
                value={formData.categoryName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new category name"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomCategory(false);
                  setFormData({ ...formData, categoryName: '', categoryId: '' });
                }}
                className="px-3 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address / City
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Vendor location/city"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Vendor'}
          </button>
        </div>
      </form>
    </div>
  );
}