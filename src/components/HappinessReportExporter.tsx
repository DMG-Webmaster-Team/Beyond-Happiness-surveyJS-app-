"use client";

import { useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { toSvg } from "html-to-image";
import download from "downloadjs";
import { getTruthIcon, getEssentialsIcon } from "@/lib/truth-icons";
import { getEssentialName } from "@/lib/essential-mappings";

type HappinessReportExporterProps = {
  result: any;
  unified: any;
  surveyTitle?: string;
};

export type HappinessReportExporterHandle = {
  exportHappinessChartsAsSVG: (filename?: string) => Promise<void>;
};

function CircularProgress({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth="10" fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3B82F6"
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
      </div>
    </div>
  );
}

const renderPercentageLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (x == null || y == null || width == null || value == null) return null;
  const cx = Number(x) + Number(width) / 2;
  return (
    <text
      x={cx}
      y={Number(y) - 8}
      textAnchor="middle"
      dominantBaseline="alphabetic"
      style={{ fontWeight: 800, fill: "#111827" }}
    >
      {`${value}%`}
    </text>
  );
};

const HappinessReportExporter = forwardRef<HappinessReportExporterHandle, HappinessReportExporterProps>(
  ({ result, unified, surveyTitle }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [capturing, setCapturing] = useState(false);
    const categoryPercentages = unified?.categoryPercentages || [];

    const exportHappinessChartsAsSVG = async (filename = "happiness-result.svg") => {
      if (!containerRef.current) return;
      try {
        setCapturing(true);
        // Ensure visible for capture but not obstructing UI
        containerRef.current.style.opacity = "1";
        containerRef.current.style.visibility = "visible";
        const svg = await toSvg(containerRef.current, {
          cacheBust: true,
          style: {
            direction: "ltr",
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI"',
            background: "#ffffff",
          },
          includeQueryParams: true,
        });
        download(svg, filename, "image/svg+xml");
      } finally {
        if (containerRef.current) {
          containerRef.current.style.opacity = "0";
          containerRef.current.style.visibility = "hidden";
        }
        setCapturing(false);
      }
    };

    useImperativeHandle(ref, () => ({ exportHappinessChartsAsSVG }));

    return (
      <div
        ref={containerRef}
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 1200,
          padding: 24,
          background: "#ffffff",
          zIndex: -1,
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <div className="max-w-3xl mx-auto" dir="ltr">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600">{surveyTitle || "Happiness Survey"}</h1>
          </div>

          {/* Character */}
          <div className="text-center mb-6">
            <img
              src={result?.character?.avatarUrl || `/characters/${result?.code}.png`}
              alt={result?.character?.nameEn || "Character"}
              className="w-56 h-56 mx-auto object-contain"
              crossOrigin="anonymous"
            />
            <h2 className="text-xl font-bold mt-4 text-gray-900">
              {result?.character?.nameEn || result?.character?.name || "Your Character"}
            </h2>
            <p className="text-gray-700 mt-2">{result?.character?.description}</p>
          </div>

          {/* Overall Score */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Overall Happiness Score</h3>
            <CircularProgress percentage={unified?.overallPercentage || 0} size={150} />
          </div>

          {/* Category Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Happiness Dimensions Overview</h3>
            <div className="bg-gray-50 p-6 rounded-lg h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPercentages} margin={{ top: 80, right: 60, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(v: any) => [`${v}%`, "Percentage"]}
                    labelFormatter={(label: any) => `${label} Dimension`}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                    {categoryPercentages.map((entry: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                    <LabelList dataKey="value" content={renderPercentageLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Truth icons and names */}
            <div className="flex justify-between items-start px-4 mt-2">
              {categoryPercentages.map((entry: any) => (
                <div key={entry.name} className="flex flex-col items-center flex-1">
                  <img
                    src={getTruthIcon(entry.name)}
                    alt={entry.name}
                    className="w-10 h-10 object-contain"
                    crossOrigin="anonymous"
                  />
                  <div className="text-sm font-medium text-gray-700 text-center mt-1">{entry.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Dimensions */}
          <div className="space-y-6">
            {categoryPercentages.map((category: any) => {
              const percentage = category.value || 0;
              const color = category.color || "#6B7280";
              return (
                <div key={category.name} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img
                        src={getTruthIcon(category.name)}
                        alt={category.name}
                        className="w-8 h-8 object-contain"
                        crossOrigin="anonymous"
                      />
                      <span className="font-bold text-lg" style={{ color }}>
                        {category.name}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="h-4 rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="ml-6 space-y-3 bg-gray-50 p-4 rounded-lg">
                    {(["A", "B", "C", "D"] as const).map((subtype) => {
                      const subtypePercentage = unified?.subtypePercentages?.[category.name]?.[subtype] || 0;
                      const label = getEssentialName(category.name, subtype, "en");
                      return (
                        <div key={subtype} className="flex items-center gap-3">
                          <img
                            src={getEssentialsIcon(category.name)}
                            alt={`${category.name} essentials`}
                            className="w-6 h-6 object-contain flex-shrink-0"
                            crossOrigin="anonymous"
                          />
                          <div className="w-40 text-sm font-medium text-gray-600 text-left">{label}:</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${subtypePercentage}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="min-w-12 text-xs font-semibold text-gray-700">{subtypePercentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

HappinessReportExporter.displayName = "HappinessReportExporter";

export default HappinessReportExporter;



