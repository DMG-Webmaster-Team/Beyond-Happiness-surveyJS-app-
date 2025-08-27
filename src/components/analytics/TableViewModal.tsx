"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import TableView from "./TableView";

interface TableViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  surveyTitle?: string;
}

export default function TableViewModal({
  isOpen,
  onClose,
  surveyId,
  surveyTitle,
}: TableViewModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center text-white justify-between p-6 border-b bg-blue-400 border-gray-200">
                  <div>
                    <h2 className="text-xl font-semibold ">
                      Survey Data Table
                    </h2>
                    {surveyTitle && (
                      <p className="text-sm   mt-1">{surveyTitle}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-black hover:text-gray-700 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-auto max-h-[calc(100vh-200px)]">
                  <TableView surveyId={surveyId} surveyTitle={surveyTitle} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
