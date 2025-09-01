"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessCharacter {
  id: number;
  name: string;
  description: string;
  match: string;
  avatarUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function CharactersTab() {
  const [editingCharacter, setEditingCharacter] =
    useState<HappinessCharacter | null>(null);

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

  const characters = data?.characters || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Happiness Characters ({characters.length})
        </h2>
        <p className="text-sm text-gray-600">
          Characters are automatically mapped by their 5-bit codes. You can only
          edit descriptions and avatar URLs.
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
                  {character.name}
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
                  alt={character.name}
                  className="w-full h-full rounded-full object-cover bg-white"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = "/characters/00000.png";
                  }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-600 line-clamp-3">
              {character.description}
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
        />
      )}
    </div>
  );
}

interface CharacterModalProps {
  character: HappinessCharacter;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function CharacterModal({ character, onSave, onCancel }: CharacterModalProps) {
  const [formData, setFormData] = useState({
    description: character.description,
    avatarUrl: character.avatarUrl || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.description.trim()) {
      alert("Description is required");
      return;
    }

    onSave({
      description: formData.description.trim(),
      avatarUrl: formData.avatarUrl.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b bg-blue-400 text-white">
          <h3 className="text-lg font-semibold text-black">
            Edit Character: {character.name}
          </h3>
          <p className="text-sm text-black opacity-90">
            Match Code: {character.match} | ID: {character.id}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You can only edit the description and
              avatar URL. The character name and match code are fixed to
              maintain scoring consistency.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={4}
              required
              placeholder="Describe this character type and what it represents..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar URL (optional)
            </label>
            <input
              type="url"
              value={formData.avatarUrl}
              onChange={(e) =>
                setFormData({ ...formData, avatarUrl: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="/avatars/character-name.svg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide a path to the character&apos;s avatar image (e.g.,
              /avatars/curious-nomad.svg)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Avatar Preview
            </label>
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-1 shadow">
              <img
                src={formData.avatarUrl || `/characters/${character.match}.png`}
                alt={character.name}
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
