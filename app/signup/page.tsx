"use client";

export default function SignupPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Start Your Agency Space</h2>
        <p className="text-gray-500 mb-8 text-sm">The all-in-one system for media project management.</p>
        
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name</label>
            <input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-500" placeholder="e.g. Creative Flow Media" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
            <input type="email" className="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
            <input type="password" className="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-500" />
          </div>
          <button className="col-span-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg mt-2">
            Create My Agency Account
          </button>
        </form>
      </div>
    </div>
  );
}