// app/dashboard/vendors/[vendorId]/page.tsx (Complete version)
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, Plus, Edit3, X, Trash2, Star, CheckCircle, 
  Clock, AlertCircle, TrendingUp, DollarSign, Package, 
  Calendar, ArrowUpRight, ArrowDownRight, Eye, FileText,
  ClipboardList
} from 'lucide-react';
import { ProcurementChainStatus } from '@/components/procurement/ProcurementChainStatus';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface VendorStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  deliveredCount: number;
  pendingCount: number;
  averageRating: string;
  onTimePercentage: number;
  totalReviews: number;
}

interface PurchaseOrder {
  id: string;
  poNo: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  expectedDeliveryDate: string | null;
  createdAt: string;
  vendor: {
    name: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
}

interface Review {
  id: string;
  rating: number;
  onTimeDelivery: boolean;
  comment: string | null;
  createdAt: string;
  purchaseOrder?: {
    poNo: string | null;
  } | null;
}

interface ProcurementTask {
  id: string;
  title: string | null;
  taskType: string;
  plannedExpenses: Array<{
    id: string;
    itemName: string;
    status: string;
  }>;
  quotations: Array<{
    id: string;
    quotationNo: string | null;
    status: string;
  }>;
}

export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.vendorId as string;

  const [vendor, setVendor] = useState<any>(null);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [procurementTasks, setProcurementTasks] = useState<ProcurementTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchase-orders' | 'reviews' | 'procurement'>('overview');

  const fetchVendorData = async () => {
    if (!vendorId) return;
    
    setLoading(true);
    try {
      // Fetch vendor details with purchase history and procurement tasks
      const res = await fetch(`/api/vendors/${vendorId}?include=stats,orders,procurement`);
      if (!res.ok) throw new Error('Failed to fetch vendor details');
      const data = await res.json();
      
      setVendor(data.vendor);
      setStats(data.stats);
      setPurchaseOrders(data.vendor?.purchaseOrders || []);
      setReviews(data.vendor?.performanceReviews || []);
      setProcurementTasks(data.procurementTasks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorData();
  }, [vendorId]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!vendor) return <NotFoundDisplay />;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header with Stats */}
      <VendorHeader vendor={vendor} stats={stats} vendorId={vendorId} />
      
      {/* Statistics Cards */}
      <StatsCards stats={stats} />
      
      {/* Tabs - Added Procurement tab */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Content */}
      {activeTab === 'overview' && <OverviewTab vendor={vendor} stats={stats} />}
      {activeTab === 'purchase-orders' && (
        <PurchaseOrdersTab purchaseOrders={purchaseOrders} vendorId={vendorId} />
      )}
      {activeTab === 'reviews' && <ReviewsTab reviews={reviews} />}
      {activeTab === 'procurement' && (
        <ProcurementTab tasks={procurementTasks} />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function VendorHeader({ vendor, stats, vendorId }: { vendor: any; stats: VendorStats | null; vendorId: string }) {
  const router = useRouter();

  return (
    <div className="bg-background p-6 rounded-3xl shadow-sm border border-border">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-600/20 flex items-center justify-center">
            <Building2 size={28} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">
              {vendor.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${
                vendor.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : vendor.status === 'INACTIVE'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {vendor.status}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                #{vendor.vendorNo || 'N/A'}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                • {vendor.category?.name || 'Uncategorized'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/vendors/purchase-orders/new?vendorId=${vendorId}`)}
            className="px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-blue-700 transition shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2"
          >
            <Plus size={16} />
            New PO
          </button>
          <Link
            href={`/dashboard/vendors/${vendorId}/edit`}
            className="p-2.5 bg-muted/30 border border-border rounded-2xl hover:bg-muted transition inline-flex"
          >
            <Edit3 size={16} className="text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatsCards({ stats }: { stats: VendorStats | null }) {
  if (!stats) return null;

  const cards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: Package,
      color: 'text-blue-600',
    },
    {
      label: 'Total Spent',
      value: `$${stats.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      label: 'Avg. Order Value',
      value: `$${stats.averageOrderValue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      label: 'On-Time Delivery',
      value: `${stats.onTimePercentage}%`,
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-background p-6 rounded-3xl shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {card.label}
            </p>
            <card.icon size={20} className={card.color} />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function TabNavigation({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: 'overview' | 'purchase-orders' | 'reviews' | 'procurement') => void }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'purchase-orders', label: 'Purchase Orders' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'procurement', label: 'Procurement Chain' },
  ];

  return (
    <div className="border-b border-border">
      <div className="flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'purchase-orders' | 'reviews' | 'procurement')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ vendor, stats }: { vendor: any; stats: VendorStats | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Contact Info */}
      <div className="bg-background p-6 rounded-3xl shadow-sm border border-border space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Contact Information
        </h3>
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">
            <span className="text-muted-foreground">Email:</span> {vendor.email || 'N/A'}
          </p>
          <p className="text-xs font-bold text-foreground">
            <span className="text-muted-foreground">Phone:</span> {vendor.phoneNumber || 'N/A'}
          </p>
          <p className="text-xs font-bold text-foreground">
            <span className="text-muted-foreground">Tax ID:</span> {vendor.taxNumber || 'N/A'}
          </p>
          <p className="text-xs font-bold text-foreground">
            <span className="text-muted-foreground">Payment Terms:</span> {vendor.paymentTerms || 'N/A'}
          </p>
        </div>
      </div>

      {/* Address */}
      <div className="bg-background p-6 rounded-3xl shadow-sm border border-border space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Address
        </h3>
        {vendor.address ? (
          <div className="text-xs font-bold text-foreground space-y-1">
            <p>{vendor.address.line1}</p>
            {vendor.address.line2 && <p>{vendor.address.line2}</p>}
            <p>
              {vendor.address.city}, {vendor.address.state} {vendor.address.postalCode}
            </p>
            <p>{vendor.address.country}</p>
          </div>
        ) : (
          <p className="text-xs font-bold text-muted-foreground uppercase">No address provided.</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-background p-6 rounded-3xl shadow-sm border border-border space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Performance Summary
        </h3>
        {stats && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground">Total Orders</span>
              <span className="text-xs font-black text-foreground">{stats.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground">Delivered</span>
              <span className="text-xs font-black text-emerald-600">{stats.deliveredCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground">Pending</span>
              <span className="text-xs font-black text-amber-600">{stats.pendingCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground">Avg. Rating</span>
              <span className="text-xs font-black text-foreground flex items-center gap-1">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                {stats.averageRating} / 5
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {vendor.notes && (
        <div className="lg:col-span-3 bg-background p-6 rounded-3xl shadow-sm border border-border space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Notes
          </h3>
          <p className="text-xs font-bold text-foreground">{vendor.notes}</p>
        </div>
      )}
    </div>
  );
}

function PurchaseOrdersTab({ purchaseOrders, vendorId }: { purchaseOrders: PurchaseOrder[]; vendorId: string }) {
  const router = useRouter();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-muted text-muted-foreground';
      case 'SENT':
        return 'bg-blue-600/10 text-blue-600 border border-blue-600/20';
      case 'CONFIRMED':
        return 'bg-purple-600/10 text-purple-600 border border-purple-600/20';
      case 'DELIVERED':
        return 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20';
      case 'CANCELLED':
        return 'bg-red-600/10 text-red-600 border border-red-600/20';
      case 'INVOICED':
        return 'bg-amber-600/10 text-amber-600 border border-amber-600/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (purchaseOrders.length === 0) {
    return (
      <div className="bg-background p-12 rounded-3xl shadow-sm border border-border text-center">
        <FileText size={48} className="mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          No purchase orders found for this vendor.
        </p>
        <button
          onClick={() => router.push(`/dashboard/vendors/purchase-orders/new?vendorId=${vendorId}`)}
          className="mt-4 px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Create First PO
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-3xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/30 border-b border-border">
            <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <th className="p-4">PO Number</th>
              <th className="p-4">Status</th>
              <th className="p-4">Total Amount</th>
              <th className="p-4">Expected Delivery</th>
              <th className="p-4">Items</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-muted/10 transition-colors">
                <td className="p-4 font-black text-foreground">
                  {po.poNo || 'Draft Order'}
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClass(po.status)}`}>
                    {po.status}
                  </span>
                </td>
                <td className="p-4 font-black text-foreground">
                  {po.currency || 'EGP'} {po.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                </td>
                <td className="p-4 text-muted-foreground">
                  {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'Not specified'}
                </td>
                <td className="p-4 text-muted-foreground">
                  {po.items?.length || 0} items
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => router.push(`/dashboard/vendors/purchase-orders/${po.id}`)}
                    className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    title="View PO"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsTab({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="bg-background p-12 rounded-3xl shadow-sm border border-border text-center">
        <Star size={48} className="mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          No performance reviews yet.
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">
          Reviews will appear here after purchase orders are delivered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-background p-6 rounded-3xl shadow-sm border border-border">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}
                    />
                  ))}
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded ${
                  review.onTimeDelivery
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {review.onTimeDelivery ? 'On-Time' : 'Delayed'}
                </span>
              </div>
              {review.purchaseOrder?.poNo && (
                <p className="text-[10px] text-muted-foreground">
                  PO: {review.purchaseOrder.poNo}
                </p>
              )}
              {review.comment && (
                <p className="text-sm text-foreground italic">
                  "{review.comment}"
                </p>
              )}
              <p className="text-[9px] text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Procurement Tab ──────────────────────────────────────────────────────────

function ProcurementTab({ tasks }: { tasks: ProcurementTask[] }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-background p-12 rounded-3xl shadow-sm border border-border text-center">
        <ClipboardList size={48} className="mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          No procurement chains found for this vendor.
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">
          Procurement chains appear when tasks have planned expenses or quotations.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map((task) => (
        <div key={task.id} className="bg-background p-6 rounded-3xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-foreground">
                {task.title || task.taskType || 'Untitled Task'}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] text-muted-foreground">
                  {task.plannedExpenses.length} planned expenses
                </span>
                <span className="text-[9px] text-muted-foreground">
                  • {task.quotations.length} quotations
                </span>
              </div>
            </div>
            <Link
              href={`/dashboard/tasks/${task.id}`}
              className="text-xs text-blue-600 hover:text-blue-500 font-bold uppercase tracking-wider"
            >
              View Task →
            </Link>
          </div>
          
          {/* Procurement Chain Status */}
          <div className="mt-2">
            <ProcurementChainStatus taskId={task.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Loading, Error, NotFound components ────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-background p-6 rounded-3xl shadow-sm border border-border animate-pulse">
        <div className="h-12 w-48 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-background p-6 rounded-3xl shadow-sm border border-border animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-center">
        <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
        <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Error loading vendor</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    </div>
  );
}

function NotFoundDisplay() {
  const router = useRouter();
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 text-center">
        <AlertCircle size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Vendor not found</p>
        <button
          onClick={() => router.push('/dashboard/vendors')}
          className="mt-4 px-6 py-2 bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-amber-600 transition"
        >
          Back to Vendors
        </button>
      </div>
    </div>
  );
}

// ─── Import ProcurementChainStatus ──────────────────────────────────────────

// This component needs to be imported at the top:
// import { ProcurementChainStatus } from "@/components/procurement/ProcurementChainStatus";

// Note: The ProcurementChainStatus component should be defined in:
// components/procurement/ProcurementChainStatus.tsx