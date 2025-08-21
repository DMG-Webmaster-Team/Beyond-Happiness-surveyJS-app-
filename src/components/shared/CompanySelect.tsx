"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Company {
  id: string;
  name: string;
  description?: string;
}

interface CompanySelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  allowNone?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CompanySelect({
  value,
  onChange,
  allowNone = false,
  placeholder = "Select a company",
  className = "",
  disabled = false,
}: CompanySelectProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/companies", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch companies");
        }

        const data = await response.json();
        setCompanies(data.items || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch companies"
        );
        console.error("Error fetching companies:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue === "" ? null : selectedValue);
  };

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Error loading companies: {error}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ""}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {allowNone && <option value="">{placeholder}</option>}
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>

      {isLoading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
        </div>
      )}

      {!isLoading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}
