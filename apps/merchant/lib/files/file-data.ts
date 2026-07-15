export type UploadedFile = {
  bucket?: string;
  contentType: string;
  key: string;
  originalName: string;
  provider: string;
  size: number;
  url: string;
};

export async function uploadMerchantFile(
  file: File,
  options: { purpose?: string; visibility?: "private" | "public" } = {},
) {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", options.purpose ?? "media");
  form.set("visibility", options.visibility ?? "public");

  const response = await fetch("/merchant/api/files/upload", {
    body: form,
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Unable to upload file";

    throw new Error(message);
  }

  return (payload as { data: UploadedFile }).data;
}
