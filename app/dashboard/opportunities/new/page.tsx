"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Users,
  Target,
  Package,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { Client, OpportunityStage } from "@prisma/client";
import { useSession } from "next-auth/react";
import CreateClientCard from "@/components/opportunities/CreateClientCard";

interface AgencyUser {
  id: string;
  name: string;
  role: string;
}

export interface DiscoveryPersonaItem {
  name: string;
  demographics?: string;
  psychographics?: string;
  buyingBehavior?: string;
  goals?: string;
  frustrations?: string;
}

export interface DiscoveryCompetitorItem {
  name: string;
  strengths?: string;
  weaknesses?: string;
  pricingNote?: string;
  marketShare?: string;
}

export interface DiscoveryProductItem {
  name: string;
  sku?: string;
  price?: number | "";
  usp?: string;
  painPoints?: string;
}

interface OpportunityFormData {
  name: string;
  budget: string;
  currency: string;
  stage: OpportunityStage;
  expectedCloseDate: string;
  companyMission: string;
  brandValues: string;
  marketResearchNotes: string;
  marketingStrategy: string;
  communicationStrategy: string;
  mediaStrategy: string;
  creativeStrategy: string;
  launchStrategy: string;
  kpis: string;
  personas: DiscoveryPersonaItem[];
  competitors: DiscoveryCompetitorItem[];
  products: DiscoveryProductItem[];
  clientId: string;
  userId: string;
}

const ELIGIBLE_EMPLOYEE_ROLES = ["ADMIN", "OPERATOR", "TEAMLEADER", "CREATIVE"];

export default function NewOpportunityPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [agencyUsers, setAgencyUsers] = useState<AgencyUser[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [formData, setFormData] = useState<OpportunityFormData>({
    name: "",
    budget: "",
    currency: "EGP",
    stage: OpportunityStage.DISCOVERY,
    expectedCloseDate: "",
    companyMission: "",
    brandValues: "",
    marketResearchNotes: "",
    marketingStrategy: "",
    communicationStrategy: "",
    mediaStrategy: "",
    creativeStrategy: "",
    launchStrategy: "",
    kpis: "",
    personas: [],
    competitors: [],
    products: [],
    clientId: "",
    userId: "",
  });

  useEffect(() => {
    if (session?.user?.agencyId) {
      fetch(`/api/clients?agencyId=${session.user.agencyId}`)
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && Array.isArray(data.clients)) setClients(data.clients);
        })
        .catch((err) => console.error("Failed to load clients", err));

      fetch(`/api/users?agencyId=${session.user.agencyId}`)
        .then(async (res) => {
          const data = await res.json();
          const rawUsers = Array.isArray(data.employees)
            ? data.employees
            : Array.isArray(data.users)
            ? data.users
            : [];
          const eligible = rawUsers.filter((u: AgencyUser) =>
            ELIGIBLE_EMPLOYEE_ROLES.includes(u.role)
          );
          setAgencyUsers(eligible);
        })
        .catch((err) => console.error("Failed to load agency users", err));
    }
  }, [session?.user?.agencyId]);

  const addPersona = () => {
    setFormData((prev) => ({
      ...prev,
      personas: [
        ...prev.personas,
        {
          name: "",
          demographics: "",
          psychographics: "",
          buyingBehavior: "",
          goals: "",
          frustrations: "",
        },
      ],
    }));
  };

  const removePersona = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      personas: prev.personas.filter((_, i) => i !== index),
    }));
  };

  const updatePersona = (
    index: number,
    field: keyof DiscoveryPersonaItem,
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.personas];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, personas: updated };
    });
  };

  const addCompetitor = () => {
    setFormData((prev) => ({
      ...prev,
      competitors: [
        ...prev.competitors,
        {
          name: "",
          strengths: "",
          weaknesses: "",
          pricingNote: "",
          marketShare: "",
        },
      ],
    }));
  };

  const removeCompetitor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  };

  const updateCompetitor = (
    index: number,
    field: keyof DiscoveryCompetitorItem,
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.competitors];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, competitors: updated };
    });
  };

  const addProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        { name: "", sku: "", price: "", usp: "", painPoints: "" },
      ],
    }));
  };

  const removeProduct = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  const updateProduct = (
    index: number,
    field: keyof DiscoveryProductItem,
    value: any
  ) => {
    setFormData((prev) => {
      const updated = [...prev.products];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, products: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        budget: formData.budget ? parseFloat(formData.budget) : null,
        currency: formData.currency || "EGP",
        stage: formData.stage,
        expectedCloseDate: formData.expectedCloseDate || null,
        companyMission: formData.companyMission || null,
        brandValues: formData.brandValues || null,
        marketResearchNotes: formData.marketResearchNotes || null,
        marketingStrategy: formData.marketingStrategy || null,
        communicationStrategy: formData.communicationStrategy || null,
        mediaStrategy: formData.mediaStrategy || null,
        creativeStrategy: formData.creativeStrategy || null,
        launchStrategy: formData.launchStrategy || null,
        kpis: formData.kpis
          ? formData.kpis.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        personas: formData.personas
          .filter((p) => p.name.trim() !== "")
          .map((p) => ({
            ...p,
            name: p.name.trim(),
          })),
        competitors: formData.competitors
          .filter((c) => c.name.trim() !== "")
          .map((c) => ({
            ...c,
            name: c.name.trim(),
          })),
        products: formData.products
          .filter((p) => p.name.trim() !== "")
          .map((p) => ({
            ...p,
            price: p.price !== "" ? Number(p.price) : null,
          })),
        clientId: formData.clientId || null,
        userId: formData.userId || null,
      };

      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create opportunity");

      router.push(`/dashboard/opportunities/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/opportunities"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Opportunities
      </Link>

      {session?.user?.agencyId && (
        <div>
          <button
            type="button"
            onClick={() => setIsClientModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-purple-400" />
            Create New Client
          </button>

          {isClientModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 relative shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-semibold text-zinc-100">
                    Add Client Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(false)}
                    className="text-zinc-400 hover:text-zinc-200 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
                <CreateClientCard
                  agencyId={session.user.agencyId}
                  onSuccess={() => setIsClientModalOpen(false)}
                  onCancel={() => setIsClientModalOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-400" />
            Create Opportunity Discovery Form
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Capture opportunity details, brand discovery specs, target personas,
            competitors, and product vectors.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-950/40 border border-red-900/50 text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
              1. Basic Opportunity Context
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client / Owner */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Opportunity Owner (Client) *
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({ ...formData, clientId: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.clientName}{" "}
                      {client.clientNo ? `(${client.clientNo})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Employee */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Assigned Employee
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) =>
                    setFormData({ ...formData, userId: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select assigned employee...</option>
                  {agencyUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Opportunity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Enterprise Redesign"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Estimated Deal Value
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="25000"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Currency
                </label>
                <input
                  type="text"
                  placeholder="EGP"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Initial Stage
                </label>
                <select
                  value={formData.stage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stage: e.target.value as OpportunityStage,
                    })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Object.values(OpportunityStage).map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Target Close Date
                </label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expectedCloseDate: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Core Brand & Strategy Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
              2. Strategic Positioning & Research Notes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Company Mission
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe client mission..."
                  value={formData.companyMission}
                  onChange={(e) =>
                    setFormData({ ...formData, companyMission: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Brand Values
                </label>
                <textarea
                  rows={3}
                  placeholder="Key brand values..."
                  value={formData.brandValues}
                  onChange={(e) =>
                    setFormData({ ...formData, brandValues: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Marketing Strategy
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline marketing strategy..."
                  value={formData.marketingStrategy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marketingStrategy: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Communication Strategy
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline communication strategy..."
                  value={formData.communicationStrategy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      communicationStrategy: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Media Strategy
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline media strategy..."
                  value={formData.mediaStrategy}
                  onChange={(e) =>
                    setFormData({ ...formData, mediaStrategy: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Creative Strategy
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline creative strategy..."
                  value={formData.creativeStrategy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creativeStrategy: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Launch Strategy
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline launch strategy..."
                  value={formData.launchStrategy}
                  onChange={(e) =>
                    setFormData({ ...formData, launchStrategy: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Target KPIs (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ROI > 3x, CAC < $50, Brand Awareness, Lead Generation"
                  value={formData.kpis}
                  onChange={(e) =>
                    setFormData({ ...formData, kpis: e.target.value })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Market Research Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Key discoveries, industry trends, macro research..."
                  value={formData.marketResearchNotes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marketResearchNotes: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Repeatable Personas Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                3. Target Personas ({formData.personas.length})
              </h2>
              <button
                type="button"
                onClick={addPersona}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Persona
              </button>
            </div>

            {formData.personas.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">
                No target personas added yet. Click &quot;Add Persona&quot; to
                define customer personas.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.personas.map((persona, index) => (
                  <div
                    key={index}
                    className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3 relative group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-semibold text-purple-400">
                        Persona #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePersona(index)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Remove Persona"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Persona Name"
                        value={persona.name}
                        onChange={(e) =>
                          updatePersona(index, "name", e.target.value)
                        }
                        required
                        className="sm:col-span-2 w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Demographics"
                        value={persona.demographics || ""}
                        onChange={(e) =>
                          updatePersona(index, "demographics", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Psychographics"
                        value={persona.psychographics || ""}
                        onChange={(e) =>
                          updatePersona(index, "psychographics", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <textarea
                        rows={2}
                        placeholder="Goals & Objectives"
                        value={persona.goals || ""}
                        onChange={(e) =>
                          updatePersona(index, "goals", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Frustrations / Pain Points"
                        value={persona.frustrations || ""}
                        onChange={(e) =>
                          updatePersona(index, "frustrations", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repeatable Competitors Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" />
                4. Competitors ({formData.competitors.length})
              </h2>
              <button
                type="button"
                onClick={addCompetitor}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Competitor
              </button>
            </div>

            {formData.competitors.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">
                No competitors added yet. Click &quot;Add Competitor&quot; to
                log competitor context.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.competitors.map((comp, index) => (
                  <div
                    key={index}
                    className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3 relative group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-semibold text-rose-400">
                        Competitor #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCompetitor(index)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Remove Competitor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Competitor Name"
                        value={comp.name}
                        onChange={(e) =>
                          updateCompetitor(index, "name", e.target.value)
                        }
                        required
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Market Share"
                        value={comp.marketShare || ""}
                        onChange={(e) =>
                          updateCompetitor(index, "marketShare", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <textarea
                        rows={2}
                        placeholder="Strengths"
                        value={comp.strengths || ""}
                        onChange={(e) =>
                          updateCompetitor(index, "strengths", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Weaknesses"
                        value={comp.weaknesses || ""}
                        onChange={(e) =>
                          updateCompetitor(index, "weaknesses", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repeatable Products Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                5. Products / Offerings ({formData.products.length})
              </h2>
              <button
                type="button"
                onClick={addProduct}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            {formData.products.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">
                No product items added yet. Click &quot;Add Product&quot; to
                log specific offerings.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.products.map((prod, index) => (
                  <div
                    key={index}
                    className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3 relative group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-semibold text-amber-400">
                        Product #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Remove Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={prod.name}
                        onChange={(e) =>
                          updateProduct(index, "name", e.target.value)
                        }
                        required
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="SKU"
                        value={prod.sku || ""}
                        onChange={(e) =>
                          updateProduct(index, "sku", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Price"
                        value={prod.price !== undefined ? prod.price : ""}
                        onChange={(e) =>
                          updateProduct(index, "price", e.target.value)
                        }
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <textarea
                        rows={2}
                        placeholder="Unique Selling Proposition (USP)"
                        value={prod.usp || ""}
                        onChange={(e) =>
                          updateProduct(index, "usp", e.target.value)
                        }
                        className="sm:col-span-3 w-full rounded-lg bg-zinc-900 border border-zinc-700/80 p-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Controls */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Link
              href="/dashboard/opportunities"
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-950/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Opportunity Discovery"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}