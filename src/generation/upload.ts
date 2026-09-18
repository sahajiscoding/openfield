export async function uploadMedia(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(typeof error === "string" && error ? error : "Upload failed — try again.");
  }
  const { url } = (await res.json()) as { url?: unknown };
  if (typeof url !== "string" || !url) throw new Error("Upload failed — try again.");
  return { url };
}
