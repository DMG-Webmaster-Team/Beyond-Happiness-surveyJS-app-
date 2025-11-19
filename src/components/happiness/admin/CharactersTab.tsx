"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessCharacter {
  id: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  detailedDescriptionEnHtml?: string | null;
  detailedDescriptionArHtml?: string | null;
  match: string;
  avatarUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function CharactersTab() {
  const [editingCharacter, setEditingCharacter] =
    useState<HappinessCharacter | null>(null);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    "/api/happiness/characters",
    fetcher
  );

  const handleSaveCharacter = async (characterData: any) => {
    try {
      const response = await fetch(
        `/api/happiness/characters/${editingCharacter!.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(characterData),
        }
      );

      if (response.ok) {
        mutate();
        setEditingCharacter(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to save character");
    }
  };

  const handleSyncFromJSON = async () => {
    if (
      !confirm(
        "This will update all characters from the JSON file (data/happiness-characters-multilingual.json). This will update names, descriptions, and avatar URLs. Continue?"
      )
    ) {
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/happiness/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-from-json" }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Successfully synced ${result.updatedCount} characters from JSON${
            result.notFoundCount > 0
              ? `\n${result.notFoundCount} characters not found in database`
              : ""
          }`
        );
        mutate(); // Refresh the data
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to sync from JSON");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAvatars = async () => {
    if (
      !confirm(
        "This will sync all avatar URLs based on their match codes. Continue?"
      )
    ) {
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/happiness/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-avatars" }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully synced ${result.updatedCount} avatar URLs`);
        mutate(); // Refresh the data
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to sync avatars");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-red-600">
          Failed to load characters. Please try again.
        </div>
      </div>
    );
  }

  const characters = (data?.characters || []).sort(
    (a: HappinessCharacter, b: HappinessCharacter) => a.id - b.id
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Happiness Characters ({characters.length})
        </h2>
        <p className="text-sm text-gray-600">
          Characters are automatically mapped by their 5-bit codes and ordered
          by ID. You can only edit descriptions and avatar URLs.
        </p>
      </div>

      {/* Characters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((character: HappinessCharacter) => (
          <div
            key={character.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {language === "en" ? character.nameEn : character.nameAr}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {character.match}
                  </span>
                  <span className="text-xs text-gray-500">
                    ID: {character.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingCharacter(character)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>

            <div className="mb-3">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-1 shadow">
                <img
                  src={
                    character.avatarUrl || `/characters/${character.match}.png`
                  }
                  alt={language === "en" ? character.nameEn : character.nameAr}
                  className="w-full h-full rounded-full object-cover bg-white"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = "/characters/00000.png";
                  }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-600 line-clamp-3">
              {language === "en"
                ? character.descriptionEn
                : character.descriptionAr}
            </p>

            {character.avatarUrl && (
              <div className="mt-2 text-xs text-gray-500">
                Avatar: {character.avatarUrl}
              </div>
            )}
          </div>
        ))}
      </div>

      {characters.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No characters found.
        </div>
      )}

      {/* Edit Modal */}
      {editingCharacter && (
        <CharacterModal
          character={editingCharacter}
          onSave={handleSaveCharacter}
          onCancel={() => setEditingCharacter(null)}
          language={language}
        />
      )}
    </div>
  );
}

interface CharacterModalProps {
  character: HappinessCharacter;
  onSave: (data: any) => void;
  onCancel: () => void;
  language: "en" | "ar";
}

function CharacterModal({
  character,
  onSave,
  onCancel,
  language: initialLanguage,
}: CharacterModalProps) {
  const [language, setLanguage] = useState<"en" | "ar">(initialLanguage);
  const [formData, setFormData] = useState({
    descriptionEn: character.descriptionEn,
    descriptionAr: character.descriptionAr,
    avatarUrl: character.avatarUrl || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.descriptionEn.trim() || !formData.descriptionAr.trim()) {
      alert("Both English and Arabic descriptions are required");
      return;
    }

    onSave({
      descriptionEn: formData.descriptionEn.trim(),
      descriptionAr: formData.descriptionAr.trim(),
      avatarUrl: formData.avatarUrl.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b bg-blue-400 text-white sticky top-0 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-black">
                Edit Character:{" "}
                {language === "en" ? character.nameEn : character.nameAr}
              </h3>
              <p className="text-sm text-black opacity-90">
                Match Code: {character.match} | ID: {character.id}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  language === "en"
                    ? "bg-white text-blue-600"
                    : "bg-blue-300 text-blue-900 hover:bg-blue-200"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ar")}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  language === "ar"
                    ? "bg-white text-blue-600"
                    : "bg-blue-300 text-blue-900 hover:bg-blue-200"
                }`}
              >
                AR
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You can only edit the descriptions and
              avatar URL. The character name and match code are fixed to
              maintain scoring consistency.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (English) *
            </label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) =>
                setFormData({ ...formData, descriptionEn: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={4}
              required
              placeholder="Describe this character type in English..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Arabic) *
            </label>
            <textarea
              value={formData.descriptionAr}
              onChange={(e) =>
                setFormData({ ...formData, descriptionAr: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
              rows={4}
              required
              placeholder="وصف هذا النوع من الشخصيات بالعربية..."
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar URL (optional)
            </label>
            <input
              type="text"
              value={formData.avatarUrl}
              onChange={(e) =>
                setFormData({ ...formData, avatarUrl: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="/characters/00000.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide a path to the character&apos;s avatar image (e.g.,
              /characters/00000.png)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Avatar Preview
            </label>
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-1 shadow">
              <img
                src={formData.avatarUrl || `/characters/${character.match}.png`}
                alt={language === "en" ? character.nameEn : character.nameAr}
                className="w-full h-full rounded-full object-cover bg-white"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = `/characters/${character.match}.png`;
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-400 hover:bg-blue-600 text-white rounded-md"
            >
              Update Character
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
