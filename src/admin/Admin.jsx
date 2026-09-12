import React from "react";

export default function Admin() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          FreeBookStore Admin
        </h1>

        <p className="text-gray-400 mb-8">
          Manage your books and website content.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">📚 Books</h2>
            <p className="text-gray-400">
              Manage books on FreeBookStore.
            </p>
          </div>

          <div className="border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">➕ Add Book</h2>
            <p className="text-gray-400">
              Add a new book to your library.
            </p>
          </div>

          <div className="border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">📊 Dashboard</h2>
            <p className="text-gray-400">
              View your library statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
