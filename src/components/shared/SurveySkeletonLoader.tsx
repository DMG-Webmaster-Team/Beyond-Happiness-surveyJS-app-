"use client";

export default function SurveySkeletonLoader() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Skeleton */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="px-4 py-6 sm:px-0">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Survey Content Skeleton */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            {/* Survey Title Skeleton */}
            <div className="mb-6">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            </div>

            {/* Question Skeletons */}
            <div className="space-y-6">
              {/* Question 1 */}
              <div className="border-b border-gray-200 pb-6">
                <div className="h-5 bg-gray-200 rounded w-4/5 mb-4 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/5 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                </div>
              </div>

              {/* Question 2 */}
              <div className="border-b border-gray-200 pb-6">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/5 animate-pulse"></div>
                </div>
              </div>

              {/* Question 3 */}
              <div className="pb-6">
                <div className="h-5 bg-gray-200 rounded w-5/6 mb-4 animate-pulse"></div>
                <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex justify-between mt-8">
              <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Text */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-white shadow-lg rounded-lg px-4 py-2 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading survey...</span>
        </div>
      </div>
    </div>
  );
}
