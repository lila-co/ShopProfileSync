
import React from 'react';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-xl text-gray-600 mb-4">Page Not Found</h2>
      <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
      <a 
        href="/" 
        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        Go Home
      </a>
    </div>
  );
};

export default NotFound;
