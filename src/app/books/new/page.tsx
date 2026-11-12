"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";
import { BookDetailsForm } from "@/components/BookDetailsForm";
import { useToast } from "@/components/Toast";

function NewBook() {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="mx-auto max-w-[1000px] px-4 pt-12 sm:px-6 md:pt-16">
      <p className="eyebrow">New book · Step 1 of 2</p>
      <h1 className="headline-lg mt-2">Start with the details.</h1>
      <p className="mt-3 max-w-xl text-on-surface-muted">
        Title, author and price are all you need. Next, you&apos;ll write the pages in the builder or import a PDF.
      </p>
      <div className="card mt-10 p-6 sm:p-10">
        <BookDetailsForm
          submitLabel="Create book & open builder"
          busyLabel="Creating…"
          onSubmit={async (input) => {
            const book = await api.createBook(input);
            toast.success("Book created", `“${book.title}” is on the shelf. Now for the pages.`);
            router.push(`/books/${book.id}/build`);
          }}
        />
      </div>
    </div>
  );
}

export default function NewBookPage() {
  return <RequireAuth><NewBook /></RequireAuth>;
}
