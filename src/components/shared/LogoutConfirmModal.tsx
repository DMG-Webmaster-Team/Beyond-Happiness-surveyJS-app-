"use client";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b bg-brand-primary text-white">
          <h2 className="text-xl font-semibold">Confirm Logout</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-700">Are you sure you want to log out?</p>

          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
