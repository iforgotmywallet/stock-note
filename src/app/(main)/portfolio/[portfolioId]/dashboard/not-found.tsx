import Link from "next/link";
import { BackButton } from "~/components/back-button";

export default function PortfolioDashboardNotFound() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfolio Not Found</h1>
        <p className="text-gray-600 mb-6">
          The portfolio you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="space-x-4">
          <Link
            href="/portfolio"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View All Portfolios
          </Link>
          <BackButton 
            href="/portfolio" 
            label="Go Back"
            useBrowserHistory={true}
          />
        </div>
      </div>
    </div>
  );
}