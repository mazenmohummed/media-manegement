"use client";

import { useState } from "react";
import Link from "next/link";
import { ModeToggle } from "../ModeToggle";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Temporary state for demo

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Clients", href: "/clients" },
    { name: "Projects", href: "/projects" },
    { name: "Employees", href: "/employees" },
    { name: "Finance", href: "/finance" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-blue-600 shrink-0">
              MEDIA SaaS
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} className="text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side: Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">

            <ModeToggle />

            {!isLoggedIn ? (
              <>
                <Link href="/login" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                  Login
                </Link>
                <Link href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
                  Get Started
                </Link>
              </>
            ) : (
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="text-red-500 hover:text-red-700 font-medium text-sm"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Button omitted for brevity but remains same as yours */}
        </div>
      </div>
    </nav>
  );
}