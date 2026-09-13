import React, { useEffect, useMemo, useState } from "react";
import { books as initialBooks } from "../data/books";

const emptyBook = {
  id: "",
  title: "",
  author: "",
  category: "fiction",
  rating: 4.5,
  ratingCount: 0,
  pages: 100,
  year: new Date().getFullYear(),
  language: "English",
  isFree: true,
  description: "",
  published: true,
  pdfUrl: "",
};

export default function Admin() {
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem("freebookstore_books");
      return saved ? JSON.parse(saved) : initialBooks.map((b) => ({
        ...b,
        published: b.published !== false,
      }));
    } catch {
      return initialBooks;
    }
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyBook);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    localStorage.setItem("freebookstore_books", JSON.stringify(books));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return books;

    return books.filter(
      (book) =>
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q) ||
        book.category?.toLowerCase().includes(q)
    );
  }, [books, search]);

  const categories = new Set(books.map((book) => book.category)).size;
  const published = books.filter((book) => book.published !== false).length;

  function openAdd() {
    const nextId = String(
      Math.max(0, ...books.map((b) => Number(b.id) || 0)) + 1
    );

    setEditingId(null);
    setForm({
      ...emptyBook,
      id: nextId,
    });
    setShowForm(true);
  }

  function openEdit(book) {
    setEditingId(book.id);
    setForm({
      ...emptyBook,
      ...book,
    });
    setShowForm(true);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : ["rating", "ratingCount", "pages", "year"].includes(name)
          ? Number(value)
          : value,
    }));
  }

  async function uploadPdf(file) {
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("PDF must be 10 MB or smaller on the current Cloudinary plan.");
      return;
    }

    setUploadingPdf(true);

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "freebookstore_pdfs");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/xy6is0nn/auto/upload",
        {
          method: "POST",
          body: data,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Cloudinary upload failed."
        );
      }

      setForm((current) => ({
        ...current,
        pdfUrl: result.secure_url,
      }));

      alert("PDF uploaded successfully.");
    } catch (error) {
      console.error(error);
      alert(error.message || "PDF upload failed.");
    } finally {
      setUploadingPdf(false);
    }
  }

  async function saveBook(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.author.trim()) {
      alert("Please enter the book title and author.");
      return;
    }

    let adminSecret = sessionStorage.getItem("freebookstore_admin_secret");

    if (!adminSecret) {
      adminSecret = window.prompt("Enter your Admin Secret:");

      if (!adminSecret) {
        return;
      }

      sessionStorage.setItem(
        "freebookstore_admin_secret",
        adminSecret
      );
    }

    const updatedBooks = editingId
      ? books.map((book) =>
          book.id === editingId ? { ...form } : book
        )
      : [...books, { ...form }];

    try {
      const response = await fetch("/api/books", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          books: updatedBooks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem(
            "freebookstore_admin_secret"
          );
        }

        throw new Error(
        data.details
          ? `${data.error || "Could not save books."} — ${typeof data.details === "string" ? data.details : JSON.stringify(data.details)}`
          : data.error || "Could not save books."
      );
      }

      setBooks(updatedBooks);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyBook);

      alert("Book saved successfully. The website will update after deployment.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to save book.");
    }
  }

  async function updateBooksOnServer(updatedBooks) {
    let adminSecret = sessionStorage.getItem("freebookstore_admin_secret");

    if (!adminSecret) {
      adminSecret = window.prompt("Enter your Admin Secret:");

      if (!adminSecret) {
        return false;
      }

      sessionStorage.setItem(
        "freebookstore_admin_secret",
        adminSecret
      );
    }

    try {
      const response = await fetch("/api/books", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          books: updatedBooks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem(
            "freebookstore_admin_secret"
          );
        }

        throw new Error(
        data.details
          ? `${data.error || "Could not save books."} — ${typeof data.details === "string" ? data.details : JSON.stringify(data.details)}`
          : data.error || "Could not save books."
      );
      }

      setBooks(updatedBooks);
      return true;
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to save books.");
      return false;
    }
  }

  async function deleteBook(id) {
    const book = books.find((b) => b.id === id);

    if (!book) return;

    const confirmed = window.confirm(
      `Delete "${book.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const updatedBooks = books.filter((b) => b.id !== id);

    const success = await updateBooksOnServer(updatedBooks);

    if (success) {
      alert("Book deleted successfully.");
    }
  }

  async function togglePublished(id) {
    const updatedBooks = books.map((book) =>
      book.id === id
        ? { ...book, published: book.published === false }
        : book
    );

    const success = await updateBooksOnServer(updatedBooks);

    if (success) {
      const changedBook = updatedBooks.find((b) => b.id === id);
      alert(
        changedBook?.published
          ? "Book published successfully."
          : "Book hidden successfully."
      );
    }
  }

  async function resetLocalData() {
    const confirmed = window.confirm(
      "Reset the Admin Panel to the original 12 books?"
    );

    if (!confirmed) return;

    const resetBooks = initialBooks.map((b) => ({
      ...b,
      published: true,
    }));

    const success = await updateBooksOnServer(resetBooks);

    if (success) {
      alert("Books reset successfully.");
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              FreeBook<span className="text-[#00E676]">Store</span> Admin
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage your library
            </p>
          </div>

          <button
            onClick={openAdd}
            className="bg-[#00E676] text-black font-bold px-4 py-2 rounded-xl hover:bg-[#00d96d] transition"
          >
            + Add Book
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard title="Total Books" value={books.length} />
          <StatCard title="Published" value={published} />
          <StatCard title="Hidden" value={books.length - published} />
          <StatCard title="Categories" value={categories} />
        </div>

        {/* Book manager */}
        <section className="border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/10">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Books</h2>
                <p className="text-sm text-gray-500">
                  {filteredBooks.length} book
                  {filteredBooks.length !== 1 ? "s" : ""}
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books..."
                className="w-full sm:w-72 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#00E676]"
              />
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No books found.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">
                        {book.title}
                      </h3>

                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          book.published === false
                            ? "bg-red-500/10 text-red-400"
                            : "bg-[#00E676]/10 text-[#00E676]"
                        }`}
                      >
                        {book.published === false ? "Hidden" : "Published"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 mt-1">
                      {book.author} · {book.category} · {book.year}
                    </p>

                    <p className="text-xs text-gray-600 mt-1">
                      ID: {book.id} · {book.pages} pages
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => togglePublished(book.id)}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                    >
                      {book.published === false ? "Publish" : "Hide"}
                    </button>

                    <button
                      onClick={() => openEdit(book)}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteBook(book.id)}
                      className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-4 flex justify-end">
          <button
            onClick={resetLocalData}
            className="text-xs text-gray-500 hover:text-white"
          >
            Reset to original books
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-6 text-center">
          Admin changes are currently saved in this browser only.
        </p>
      </main>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1110] border border-white/10 rounded-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Book" : "Add Book"}
                </h2>
                <p className="text-sm text-gray-500">
                  Enter the book information below.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveBook} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                />

                <Field
                  label="Author"
                  name="author"
                  value={form.author}
                  onChange={handleChange}
                  required
                />

                <Field
                  label="Category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                />

                <Field
                  label="Language"
                  name="language"
                  value={form.language}
                  onChange={handleChange}
                />

                <Field
                  label="Year"
                  name="year"
                  type="number"
                  value={form.year}
                  onChange={handleChange}
                />

                <Field
                  label="Pages"
                  name="pages"
                  type="number"
                  value={form.pages}
                  onChange={handleChange}
                />

                <Field
                  label="Rating"
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={handleChange}
                />

                <Field
                  label="Rating Count"
                  name="ratingCount"
                  type="number"
                  value={form.ratingCount}
                  onChange={handleChange}
                />
              </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-400 mb-2">
              PDF Book
            </label>

            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={uploadingPdf}
              onChange={(e) => uploadPdf(e.target.files?.[0])}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            />

            {uploadingPdf && (
              <p className="text-sm text-yellow-400">
                Uploading PDF to Cloudinary...
              </p>
            )}

            {form.pdfUrl && !uploadingPdf && (
              <p className="text-sm text-green-400">
                ✓ PDF uploaded successfully
              </p>
            )}
          </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#00E676]"
                  placeholder="Book description..."
                />
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="isFree"
                  checked={form.isFree}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                Free book
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="published"
                  checked={form.published !== false}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                Published
              </label>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 rounded-xl border border-white/10"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-[#00E676] text-black font-bold"
                >
                  {editingId ? "Save Changes" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="border border-white/10 rounded-2xl p-4 sm:p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
  min,
  max,
  required,
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">
        {label}
      </label>

      <input
        name={name}
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#00E676]"
      />
    </div>
  );
}
